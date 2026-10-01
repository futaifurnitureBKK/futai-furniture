"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, Download, Upload, Camera, Loader2, FolderOpen, Search, X, Eye } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer,
} from "recharts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/store/language";
import type {
  AdSpend, Lead, LeadChannel, LeadContactMethod, LeadSegment, LeadStatus, YesNoUnknown,
  SavedQuoteChannel, SavedQuoteItem, SavedQuoteStatus,
} from "@/types";
import { CHANNELS, STATUSES, CONTACT_METHODS, SEGMENTS, LOST_REASONS, YES_NO_UNKNOWN, statusMeta } from "@/lib/lead-options";
import { SALESPEOPLE, STATUS_META, STATUS_ORDER, DOC_LABELS, computeGrandTotal } from "@/lib/saved-quote-options";
import { ImportLeadsDialog } from "@/components/admin/import-leads-dialog";
import { DateRangePicker } from "@/components/admin/date-range-picker";

interface SavedQuoteListItem {
  id: number;
  doc_type: keyof typeof DOC_LABELS;
  doc_no: string;
  customer_name: string;
  doc_date: string;
  status: SavedQuoteStatus;
  channel: SavedQuoteChannel;
  shipping_date: string | null;
  shipping_address: string;
  contact_person: string;
  contact_phone: string;
  salesperson: string | null;
  notes: string;
  items: SavedQuoteItem[];
  discount_pct: number;
  vat_pct: number;
}

// Local calendar-day string (not UTC) — using toISOString() here shifts the
// date back by one during 00:00–06:59 Thailand time, since that's still the
// previous day in UTC. That bug made "today"'s Ad Spend box (and the chart's
// last bar) silently write to/read from the wrong date for part of the day.
function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return toLocalDateStr(new Date());
}

type RangeKey = "1D" | "5D" | "1M" | "5M" | "ALL";
const RANGES: { key: RangeKey; days: number | null }[] = [
  { key: "1D", days: 1 },
  { key: "5D", days: 5 },
  { key: "1M", days: 30 },
  { key: "5M", days: 150 },
  { key: "ALL", days: null },
];

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

function computeKpiStats(rows: Lead[]) {
  const total = rows.length;
  const followed = rows.filter((l) => l.status !== "new").length;
  const responded = rows.filter((l) => ["engaged", "quoted", "converted"].includes(l.status)).length;
  const converted = rows.filter((l) => l.status === "converted");
  const followUpRate = total ? (followed / total) * 100 : 0;
  const responseRate = followed ? (responded / followed) * 100 : 0;
  const conversionRate = total ? (converted.length / total) * 100 : 0;

  const cycleTimes = converted
    .filter((l) => l.converted_at)
    .map((l) => (new Date(l.converted_at as string).getTime() - new Date(l.lead_date).getTime()) / 86400000);
  const avgCycleDays = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : null;

  const deals = converted.filter((l) => l.deal_value != null).map((l) => l.deal_value as number);
  const aov = deals.length ? deals.reduce((a, b) => a + b, 0) / deals.length : null;
  const revenue = deals.reduce((a, b) => a + b, 0);

  return { total, followed, followUpRate, responseRate, conversionRate, avgCycleDays, aov, revenue };
}

const BOARD_COLUMNS: {
  key: string;
  th: string;
  en: string;
  zh: string;
  statuses: LeadStatus[];
  header: string;
  body: string;
}[] = [
  { key: "A", th: "คอนเฟิร์ม / จ่ายเงินแล้ว", en: "Confirmed / Paid", zh: "已成交", statuses: ["converted"], header: "bg-emerald-600", body: "bg-emerald-50/60 border-emerald-200" },
  { key: "B", th: "รออนุมัติ (ส่งใบเสนอราคาแล้ว)", en: "Pending Approval (Quote Sent)", zh: "有意向/已发报价表", statuses: ["quoted"], header: "bg-amber-500", body: "bg-amber-50/60 border-amber-200" },
  { key: "C", th: "ยังไม่ได้ตอบกลับ", en: "No Response Yet", zh: "刚进线客户", statuses: ["new", "followed_1", "followed_2plus", "engaged"], header: "bg-orange-500", body: "bg-orange-50/60 border-orange-200" },
  { key: "D", th: "ปฏิเสธ", en: "Rejected", zh: "没意向", statuses: ["lost"], header: "bg-red-600", body: "bg-red-50/60 border-red-200" },
];

const NO_OWNER = "__none";

// Keyed by `date` from the parent (key={date}) so switching the day being
// edited remounts this with a fresh local value instead of needing an effect
// to resync it — the usual React way to reset state when a prop changes.
function AdSpendInput({
  date, owner, initialAmount, onSave,
}: {
  date: string;
  owner: string;
  initialAmount: number;
  onSave: (date: string, owner: string, amount: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(initialAmount));
  const [saving, setSaving] = useState(false);
  return (
    <div className="flex justify-end">
      <Input
        type="number"
        className="h-6 w-14 min-w-0 rounded-md text-[10px] px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={async () => {
          setSaving(true);
          await onSave(date, owner, Number(value) || 0);
          setSaving(false);
        }}
        disabled={saving}
      />
    </div>
  );
}

const emptyForm = {
  lead_date: todayStr(),
  customer_id: "",
  customer_name: "",
  profile_image_url: "",
  address: "",
  channel: "facebook" as LeadChannel,
  segment: "b2c" as LeadSegment,
  sku: "",
  status: "new" as LeadStatus,
  contact_method: "line" as LeadContactMethod,
  contact_id: "",
  customer_details: "",
  notes: "",
  phone_contacted: "unknown" as YesNoUnknown,
  has_office_plan: "unknown" as YesNoUnknown,
  will_visit_showroom: "unknown" as YesNoUnknown,
  needed_by_date: "",
  next_followup_date: "",
  deal_value: "",
  paid_pct: "",
  lost_reason: "",
  owner: "",
  source_quote_id: null as number | null,
};

export default function KpiPage() {
  const { t } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [quotePickerOpen, setQuotePickerOpen] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuoteListItem[]>([]);
  const [loadingSavedQuotes, setLoadingSavedQuotes] = useState(false);
  const [quotePickerQuery, setQuotePickerQuery] = useState("");
  const [quotePickerStatus, setQuotePickerStatus] = useState<SavedQuoteStatus | "all">("all");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("1D");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [adSpendRows, setAdSpendRows] = useState<AdSpend[]>([]);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingRef = useRef<Lead | null>(null);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/leads");
      const data = await res.json();
      if (!cancelled) {
        setLeads(res.ok ? data.leads : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetched once — the table is small (one row per day per owner), so it's
  // simpler to just pull it all and look up per owner client-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/ad-spend");
      const data = await res.json();
      if (!cancelled && res.ok) setAdSpendRows(data.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setLastSavedAt(null);
    setDialogOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      lead_date: lead.lead_date,
      customer_id: lead.customer_id || "",
      customer_name: lead.customer_name,
      profile_image_url: lead.profile_image_url || "",
      address: lead.address || "",
      channel: lead.channel,
      segment: lead.segment,
      sku: lead.sku || "",
      status: lead.status,
      contact_method: lead.contact_method || "line",
      contact_id: lead.contact_id || "",
      customer_details: lead.customer_details || "",
      notes: lead.notes,
      phone_contacted: lead.phone_contacted || "unknown",
      has_office_plan: lead.has_office_plan || "unknown",
      will_visit_showroom: lead.will_visit_showroom || "unknown",
      needed_by_date: lead.needed_by_date || "",
      next_followup_date: lead.next_followup_date || "",
      deal_value: lead.deal_value != null ? String(lead.deal_value) : "",
      paid_pct: lead.paid_pct != null ? String(lead.paid_pct) : "",
      lost_reason: lead.lost_reason || "",
      owner: lead.owner || "",
      source_quote_id: lead.source_quote_id,
    });
    setLastSavedAt(null);
    setDialogOpen(true);
  }

  useEffect(() => {
    if (!quotePickerOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingSavedQuotes(true);
      const res = await fetch("/api/admin/saved-quotes?archived=false");
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setSavedQuotes(data.quotes);
        setLoadingSavedQuotes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quotePickerOpen]);

  // Pulls a saved quotation's details into the "Add Lead" form so nobody has
  // to retype what's already in the quote — the form still opens for review
  // before saving, since several lead-only fields (follow-up status, whether
  // the phone's been reached, etc.) have no quote equivalent to pull from.
  function importFromQuote(quote: SavedQuoteListItem) {
    setEditing(null);
    setForm({
      ...emptyForm,
      customer_name: quote.customer_name,
      address: quote.shipping_address || "",
      channel: (quote.channel as LeadChannel) || "facebook",
      sku: quote.items.map((it) => it.sku).filter(Boolean).join(", "),
      status: "quoted",
      contact_method: quote.contact_phone ? "phone" : "line",
      contact_id: quote.contact_phone || "",
      customer_details: quote.contact_person ? `ผู้ติดต่อ: ${quote.contact_person}` : "",
      notes: quote.notes || "",
      needed_by_date: quote.shipping_date || "",
      deal_value: quote.items.length ? String(Math.round(computeGrandTotal(quote.items, quote.discount_pct, quote.vat_pct))) : "",
      owner: quote.salesperson || "",
      source_quote_id: quote.id,
    });
    setLastSavedAt(null);
    setQuotePickerOpen(false);
    setDialogOpen(true);
  }

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/leads/upload-photo", { method: "POST", body });
      const data = await res.json();
      if (res.ok) {
        setForm((f) => ({ ...f, profile_image_url: data.url }));
      } else {
        alert(data.error || t("อัปโหลดรูปไม่สำเร็จ", "Upload failed", "上传失败"));
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  function buildPayload(f: typeof emptyForm) {
    return {
      ...f,
      customer_id: f.customer_id || null,
      profile_image_url: f.profile_image_url || null,
      address: f.address || null,
      sku: f.sku || null,
      contact_id: f.contact_id || null,
      customer_details: f.customer_details || null,
      needed_by_date: f.needed_by_date || null,
      next_followup_date: f.next_followup_date || null,
      deal_value: f.deal_value ? Number(f.deal_value) : null,
      paid_pct: f.paid_pct ? Number(f.paid_pct) : null,
      lost_reason: f.status === "lost" ? f.lost_reason || null : null,
      owner: f.owner || null,
    };
  }

  async function saveLead() {
    if (!form.customer_name.trim()) return;
    setSaving(true);
    const currentId = editingRef.current?.id;
    const res = await fetch(currentId ? `/api/admin/leads/${currentId}` : "/api/admin/leads", {
      method: currentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(form)),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      if (currentId) {
        setLeads((prev) => prev.map((l) => (l.id === currentId ? data.lead : l)));
      } else {
        setLeads((prev) => [data.lead, ...prev]);
      }
      setDialogOpen(false);
    } else {
      alert(data.error || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
    }
  }

  // Debounced auto-save: keeps the open dialog's edits from being lost if
  // the user navigates away instead of clicking Save. The first auto-save
  // for a brand-new lead creates it (POST) and flips into edit mode so
  // every subsequent change just PATCHes the same record.
  const autoSaving = useRef(false);
  async function autoSaveLead() {
    if (!form.customer_name.trim() || autoSaving.current) return;
    autoSaving.current = true;
    try {
      const currentId = editingRef.current?.id;
      const res = await fetch(currentId ? `/api/admin/leads/${currentId}` : "/api/admin/leads", {
        method: currentId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (res.ok) {
        const data = await res.json();
        editingRef.current = data.lead;
        setEditing(data.lead);
        if (currentId) {
          setLeads((prev) => prev.map((l) => (l.id === currentId ? data.lead : l)));
        } else {
          setLeads((prev) => [data.lead, ...prev]);
        }
        setLastSavedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
      }
    } finally {
      autoSaving.current = false;
    }
  }

  useEffect(() => {
    if (!dialogOpen) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSaveLead();
    }, 1200);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dialogOpen]);

  async function quickSetStatus(lead: Lead, status: LeadStatus) {
    const prevLeads = leads;
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? data.lead : l)));
    } else {
      setLeads(prevLeads);
      alert(t("อัปเดตสถานะไม่สำเร็จ", "Status update failed", "状态更新失败"));
    }
  }

  async function deleteLead(id: number) {
    if (!confirm(t("ลบรายการติดตามนี้ใช่หรือไม่?", "Delete this tracked lead?", "确定要删除此跟进记录吗？"))) return;
    const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
    if (res.ok) setLeads((ls) => ls.filter((l) => l.id !== id));
    else alert(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
  }

  // ── KPIs ──────────────────────────────────────────────────────────
  // `kpi` (from ALL leads, every date) backs the Excel export's "KPI
  // Dashboard" sheet, which is meant to be a full historical dump regardless
  // of whatever date range happens to be on screen. `scopedKpi` (below, once
  // leadsInScope exists) backs the 6 cards shown on screen, so they agree
  // with the date-range-filtered charts/table/board underneath instead of
  // always showing an all-time number next to a filtered one.
  const kpi = useMemo(() => computeKpiStats(leads), [leads]);

  // One bar per day over the chosen range. Clicking a bar (or picking a date)
  // narrows the platform chart + lead list to that day; changing the range
  // clears it so they cover the whole range again.
  const rangeStart = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days;
    if (days != null) return daysAgoStr(days - 1);
    const earliest = leads.reduce((min, l) => (l.lead_date < min ? l.lead_date : min), todayStr());
    return earliest;
  }, [range, leads]);

  // "ALL" is meant to mean every lead, so its upper bound has to follow the
  // latest lead_date (which can be after today, e.g. a mis-typed date) —
  // every other preset stays capped at today. Without this, a future-dated
  // lead would count in the all-time "ลีดทั้งหมด" total but never appear in
  // any date-scoped view, even "ALL", and the two numbers would never agree.
  const rangeEnd = useMemo(() => {
    if (range !== "ALL") return todayStr();
    return leads.reduce((max, l) => (l.lead_date > max ? l.lead_date : max), todayStr());
  }, [range, leads]);

  const matchesOwner = (l: Lead) =>
    ownerFilter === "all" ? true : ownerFilter === NO_OWNER ? !l.owner : l.owner === ownerFilter;

  const searchQuery = customerSearch.trim().toLowerCase();
  const matchesSearch = (l: Lead) => !searchQuery || l.customer_name.toLowerCase().includes(searchQuery);

  // A custom "จาก–ถึง" range (if both ends are picked) takes priority over a
  // single picked date, which in turn takes priority over the 1D/5D/1M/5M/ALL
  // preset buttons — same idea, just three ways to land on a date scope.
  const hasCustomRange = !!(customFrom && customTo);

  // The window of bars the "ลีดรายวัน" chart draws — the full custom range,
  // or the full preset range, but NEVER narrowed down to a single day just
  // because a bar was clicked (selectedDate), so the chart still shows the
  // surrounding days with that one bar picked out in red.
  const windowFrom = hasCustomRange ? (customFrom as string) : rangeStart;
  const windowTo = hasCustomRange ? (customTo as string) : rangeEnd;

  const dateData = useMemo(() => {
    const counts = new Map<string, number>();
    leads.filter((l) => matchesOwner(l) && matchesSearch(l)).forEach((l) => counts.set(l.lead_date, (counts.get(l.lead_date) || 0) + 1));
    const days: { date: string; count: number }[] = [];
    const end = new Date(windowTo);
    for (let d = new Date(windowFrom); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateStr(d);
      days.push({ date: dateStr, count: counts.get(dateStr) || 0 });
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, windowFrom, windowTo, ownerFilter, searchQuery]);

  // Leads inside the chosen date scope, before the owner filter is applied —
  // the per-owner summary is computed from these.
  const scopeFrom = hasCustomRange ? (customFrom as string) : selectedDate ?? rangeStart;
  const scopeTo = hasCustomRange ? (customTo as string) : selectedDate ?? rangeEnd;

  const rangeLeads = useMemo(
    () => leads.filter((l) => l.lead_date >= scopeFrom && l.lead_date <= scopeTo),
    [leads, scopeFrom, scopeTo]
  );

  const leadsInScope = useMemo(
    () => rangeLeads.filter((l) => matchesOwner(l) && matchesSearch(l)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeLeads, ownerFilter, searchQuery]
  );

  // Backs the 6 KPI cards on screen — scoped the same way as everything else
  // on the page (date range, owner filter, search), so "ลีดทั้งหมด" here
  // agrees with the "ทั้งหมด" row in the owner-summary table underneath.
  const scopedKpi = useMemo(() => computeKpiStats(leadsInScope), [leadsInScope]);

  // Ad spend is logged per single day, so the "ค่ายิง Ads" cell is only
  // directly editable when the current scope IS one day: a single bar
  // clicked on the chart, or a single day picked in the calendar (from ===
  // to). Otherwise (a real multi-day range) it shows the sum across that
  // range instead, read-only.
  const isSingleDay = scopeFrom === scopeTo;
  const adSpendEditDate = isSingleDay ? scopeFrom : todayStr();

  const ownerSummary = useMemo(() => {
    // owners that were removed from the roster (or renamed) but still sit on old leads keep their own row
    const legacy = [...new Set(leads.map((l) => l.owner).filter((o): o is string => !!o && !SALESPEOPLE.includes(o)))];
    const names = [...SALESPEOPLE, ...legacy, NO_OWNER];
    return names.map((name) => {
      const rows = rangeLeads.filter((l) => (name === NO_OWNER ? !l.owner : l.owner === name));
      const converted = rows.filter((l) => l.status === "converted");
      const editDayAmount = adSpendRows.find((r) => r.owner === name && r.date === adSpendEditDate)?.amount ?? 0;
      const rangeAdAmount = adSpendRows
        .filter((r) => r.owner === name && r.date >= scopeFrom && r.date <= scopeTo)
        .reduce((sum, r) => sum + r.amount, 0);
      return {
        name,
        count: rows.length,
        converted: converted.length,
        rate: rows.length ? (converted.length / rows.length) * 100 : 0,
        editDayAmount,
        rangeAdAmount,
      };
    });
  }, [rangeLeads, leads, adSpendRows, adSpendEditDate, scopeFrom, scopeTo]);

  const adSpendScopeTotal = useMemo(
    () => ownerSummary.reduce((sum, o) => sum + (isSingleDay ? o.editDayAmount : o.rangeAdAmount), 0),
    [ownerSummary, isSingleDay]
  );

  async function saveAdSpend(date: string, owner: string, amount: number) {
    const res = await fetch("/api/admin/ad-spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, owner, amount }),
    });
    const data = await res.json();
    if (res.ok) {
      setAdSpendRows((prev) => [...prev.filter((r) => !(r.date === date && r.owner === owner)), data.row]);
    }
  }

  const scopeLabel = scopeFrom === scopeTo ? scopeFrom : `${scopeFrom} → ${scopeTo}`;

  const filteredSavedQuotes = useMemo(() => {
    const q = quotePickerQuery.trim().toLowerCase();
    return savedQuotes.filter((s) => {
      if (quotePickerStatus !== "all" && s.status !== quotePickerStatus) return false;
      if (!q) return true;
      return s.customer_name.toLowerCase().includes(q) || s.doc_no.toLowerCase().includes(q);
    });
  }, [savedQuotes, quotePickerQuery, quotePickerStatus]);

  // Which quotes already have a lead pulled from them, so the picker can
  // flag them instead of letting someone import the same quote twice by accident.
  const importedQuoteIds = useMemo(
    () => new Set(leads.map((l) => l.source_quote_id).filter((id): id is number => id != null)),
    [leads]
  );

  // The status board follows the chosen range / selected date too.
  const boardGroups = useMemo(
    () =>
      BOARD_COLUMNS.map((col) => ({
        ...col,
        leads: leadsInScope.filter((l) => col.statuses.includes(l.status)),
      })),
    [leadsInScope]
  );

  const channelData = useMemo(
    () =>
      CHANNELS.map((c) => ({
        channel: t(c.th, c.en, c.zh),
        count: leadsInScope.filter((l) => l.channel === c.value).length,
        converted: leadsInScope.filter((l) => l.channel === c.value && l.status === "converted").length,
        color: c.color,
      })),
    [leadsInScope, t]
  );

  const topSkus = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach((l) => {
      if (l.sku && l.status === "converted") counts.set(l.sku, (counts.get(l.sku) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [leads]);

  function exportExcel() {
    // dynamic import keeps the xlsx bundle out of the initial page load
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();

      const logSheet = XLSX.utils.json_to_sheet(
        leads.map((l) => ({
          วันแรกที่ลูกค้าทักเข้ามา: l.lead_date,
          "หมายเลขลูกค้า": l.customer_id || "",
          ลูกค้า: l.customer_name,
          ที่อยู่: l.address || "",
          Channel: l.channel,
          Segment: l.segment,
          SKU: l.sku || "",
          สถานะ: statusMeta(l.status).th,
          ช่องทางติดต่อ: l.contact_method || "",
          "ไอดี/เบอร์ติดต่อ": l.contact_id || "",
          "รายละเอียดลูกค้า": l.customer_details || "",
          "ติดต่อทางโทรศัพท์แล้ว": YES_NO_UNKNOWN.find((o) => o.value === l.phone_contacted)?.th || "",
          "มีแปลนออฟฟิศ": YES_NO_UNKNOWN.find((o) => o.value === l.has_office_plan)?.th || "",
          "จะมาโชว์รูม": YES_NO_UNKNOWN.find((o) => o.value === l.will_visit_showroom)?.th || "",
          "ต้องการใช้ภายในวันที่": l.needed_by_date || "",
          หมายเหตุ: l.notes,
          วันที่ลูกค้ายืนยันจ่ายเงิน: l.next_followup_date || "",
          มูลค่าดีล: l.deal_value ?? "",
          "จ่ายเงินแล้ว (%)": l.paid_pct ?? "",
          เหตุผลที่เสีย: l.lost_reason || "",
        }))
      );
      XLSX.utils.book_append_sheet(wb, logSheet, "Daily Log");

      const dashSheet = XLSX.utils.aoa_to_sheet([
        ["KPI", "Value"],
        ["Total Leads", kpi.total],
        ["Follow-up Rate (%)", kpi.followUpRate.toFixed(1)],
        ["Response Rate (%)", kpi.responseRate.toFixed(1)],
        ["Conversion Rate (%)", kpi.conversionRate.toFixed(1)],
        ["Avg Cycle Time (days)", kpi.avgCycleDays != null ? kpi.avgCycleDays.toFixed(1) : ""],
        ["AOV (Avg Order Value)", kpi.aov != null ? kpi.aov.toFixed(0) : ""],
        ["Total Revenue (converted)", kpi.revenue],
      ]);
      XLSX.utils.book_append_sheet(wb, dashSheet, "KPI Dashboard");

      const channelSheet = XLSX.utils.json_to_sheet(
        CHANNELS.map((c) => ({
          Channel: t(c.th, c.en, c.zh),
          Leads: leads.filter((l) => l.channel === c.value).length,
          Converted: leads.filter((l) => l.channel === c.value && l.status === "converted").length,
        }))
      );
      XLSX.utils.book_append_sheet(wb, channelSheet, "Channel Breakdown");

      const skuSheet = XLSX.utils.json_to_sheet(topSkus.map(([sku, count]) => ({ SKU: sku, ปิดการขาย: count })));
      XLSX.utils.book_append_sheet(wb, skuSheet, "Products by Sales");

      XLSX.writeFile(wb, `futai-leads-${todayStr()}.xlsx`);
    });
  }

  const today = todayStr();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("KPI ติดตามลูกค้า", "Lead Tracker KPI", "客户跟进KPI")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t("ติดตามลีดรายวัน แปลงเป็นออเดอร์ วัดผลแต่ละ channel", "Track daily leads, convert to orders, measure each channel", "每日跟踪线索，转化为订单，衡量各渠道表现")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-1.5" /> {t("นำเข้าจาก Excel", "Import from Excel", "从Excel导入")}
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={leads.length === 0}>
            <Download size={14} className="mr-1.5" /> {t("Export Excel", "Export Excel", "导出Excel")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setQuotePickerOpen(true)}>
            <FolderOpen size={14} className="mr-1.5" /> {t("ดึงจากใบเสนอราคา", "Import from quotation", "从报价单导入")}
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} className="mr-1.5" /> {t("เพิ่มลีด", "Add Lead", "添加线索")}
          </Button>
        </div>
      </div>

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(newLeads) => setLeads((prev) => [...newLeads, ...prev])}
      />

      <Dialog open={quotePickerOpen} onOpenChange={setQuotePickerOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("ดึงลีดจากใบเสนอราคา", "Add a lead from a saved quotation", "从报价单添加线索")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                className="pl-8"
                placeholder={t("ค้นหาชื่อบริษัท หรือเลขที่เอกสาร...", "Search company or doc no...", "搜索公司名或单号...")}
                value={quotePickerQuery}
                onChange={(e) => setQuotePickerQuery(e.target.value)}
              />
            </div>
            <Select value={quotePickerStatus} onValueChange={(v) => setQuotePickerStatus((v ?? "all") as SavedQuoteStatus | "all")}>
              <SelectTrigger className="w-44">
                <SelectValue>
                  {(v: SavedQuoteStatus | "all") => (v === "all" ? t("ทุกสถานะ", "All statuses", "全部状态") : t(STATUS_META[v].th, STATUS_META[v].en, STATUS_META[v].zh))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ทุกสถานะ", "All statuses", "全部状态")}</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{t(STATUS_META[s].th, STATUS_META[s].en, STATUS_META[s].zh)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {loadingSavedQuotes ? (
              <p className="text-sm text-[#9CA3AF] text-center py-10">
                <Loader2 size={16} className="inline animate-spin mr-2" /> {t("กำลังโหลด...", "Loading...", "加载中...")}
              </p>
            ) : filteredSavedQuotes.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-10">{t("ไม่พบเอกสาร", "No documents found", "未找到文件")}</p>
            ) : (
              <div className="space-y-1.5">
                {filteredSavedQuotes.map((s) => {
                  const alreadyImported = importedQuoteIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${alreadyImported ? "border-emerald-200 bg-emerald-50/40" : "border-[#E8E5E0]"}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{s.customer_name || "-"}</p>
                        <p className="text-xs text-[#9CA3AF] font-mono">
                          {s.doc_no} · {t(DOC_LABELS[s.doc_type].th, DOC_LABELS[s.doc_type].en, DOC_LABELS[s.doc_type].zh)} · {s.doc_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                        {alreadyImported && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            {t("นำเข้าแล้ว", "Already imported", "已导入")}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${STATUS_META[s.status].color}`}>
                          {t(STATUS_META[s.status].th, STATUS_META[s.status].en, STATUS_META[s.status].zh)}
                        </span>
                        <Link
                          href={`/admin/quote-builder?open=${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                          title={t("ดูใบเสนอราคานี้", "View this quotation", "查看此报价单")}
                        >
                          <Eye size={13} className="mr-1" /> {t("ดู", "View", "查看")}
                        </Link>
                        <Button size="sm" variant={alreadyImported ? "outline" : "default"} onClick={() => importFromQuote(s)}>
                          {alreadyImported ? t("นำเข้าอีกครั้ง", "Import again", "再次导入") : t("นำเข้า", "Import", "导入")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setQuotePickerOpen(false)}>
              <X size={13} className="mr-1" /> {t("ปิด", "Close", "关闭")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t("ลีดทั้งหมด", "Total Leads", "线索数"), value: scopedKpi.total,                                              sub: t("▲ 20%/เดือน เป้าหมาย", "▲ 20%/mo target", "▲ 20%/月 目标") },
          { label: t("อัตราติดตาม", "Follow-up Rate", "跟进率"),  value: `${scopedKpi.followUpRate.toFixed(0)}%`,                       sub: t("เป้า ≥ 80%", "Target ≥ 80%", "目标 ≥ 80%") },
          { label: t("อัตราตอบรับ", "Response Rate", "回复率"),   value: `${scopedKpi.responseRate.toFixed(0)}%`,                       sub: t("เป้า ≥ 30%", "Target ≥ 30%", "目标 ≥ 30%") },
          { label: t("อัตราปิดการขาย", "Conversion Rate", "转化率"), value: `${scopedKpi.conversionRate.toFixed(0)}%`,                     sub: t("เป้า 10–15%", "Target 10–15%", "目标 10–15%") },
          { label: t("ระยะเวลาปิดดีล", "Cycle Time", "成交周期"),      value: scopedKpi.avgCycleDays != null ? `${scopedKpi.avgCycleDays.toFixed(0)} ${t("วัน", "days", "天")}` : "-", sub: t("เป้า ≤ 14 วัน", "Target ≤ 14 days", "目标 ≤ 14天") },
          { label: t("มูลค่าเฉลี่ยต่อออเดอร์", "AOV", "客单价"), value: scopedKpi.aov != null ? scopedKpi.aov.toLocaleString("th-TH", { maximumFractionDigits: 0 }) : "-", sub: t("บาท/ออเดอร์", "THB/order", "泰铢/订单") },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-[#6B6B6B]">{c.label}</p>
            <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{c.value}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts + owner summary (one row) ─────────────────────── */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-[#9CA3AF] text-center py-16">{t("ยังไม่มีข้อมูล", "No data yet", "暂无数据")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
          {/* Leads by date */}
          <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-4">{t("ลีดรายวัน", "Leads by Date", "每日线索")}</p>
            <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dateData}
                margin={{ top: 20, right: 8, left: -20, bottom: 0 }}
                onClick={(state) => {
                  const label = state?.activeLabel;
                  if (typeof label === "string") {
                    setSelectedDate(label);
                    setCustomFrom(null);
                    setCustomTo(null);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid vertical={false} stroke="#E8E5E0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5).split("-").reverse().join("/")}
                  tick={{ fontSize: 10, fill: "#6B6B6B" }}
                  axisLine={{ stroke: "#E8E5E0" }}
                  tickLine={false}
                  interval={Math.max(0, Math.ceil(dateData.length / 6) - 1)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#FAF7F2" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof dateData)[number];
                    return (
                      <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                        <p className="font-semibold text-[#1A1A1A]">{d.date}</p>
                        <p className="text-[#6B6B6B]">{t("ลีด", "Leads", "线索数")}: {d.count}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={20}>
                  {dateData.map((d) => (
                    <Cell key={d.date} fill={d.date >= scopeFrom && d.date <= scopeTo ? "#C8102E" : "#D9D4CA"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    setRange(r.key);
                    setSelectedDate(null);
                    setCustomFrom(null);
                    setCustomTo(null);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    !hasCustomRange && range === r.key ? "bg-[#1A1A1A] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"
                  }`}
                >
                  {r.key}
                </button>
              ))}
            </div>
          </div>

          {/* Leads by channel */}
          <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-4">
              {t("Leads ต่อ Channel", "Leads by Channel", "各渠道线索数")} · {scopeLabel}
            </p>
            <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E8E5E0" />
                <XAxis dataKey="channel" tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E8E5E0" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#FAF7F2" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof channelData)[number];
                    return (
                      <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                        <p className="font-semibold text-[#1A1A1A]">{d.channel}</p>
                        <p className="text-[#6B6B6B]">{t("ลีด", "Leads", "线索数")}: {d.count}</p>
                        <p className="text-[#6B6B6B]">{t("ปิดการขาย", "Converted", "成交")}: {d.converted}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {channelData.map((d) => (
                    <Cell key={d.channel} fill={d.color} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: "#1A1A1A", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Date picker + owner summary + platform split */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder={t("ค้นหาชื่อบริษัท/ลูกค้า", "Search company/customer", "搜索公司/客户名称")}
                  className="h-8 w-48 rounded-lg border border-[#E8E5E0] bg-white pl-7 pr-7 text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch("")}
                    aria-label={t("ล้าง", "Clear", "清除")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {ownerFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setOwnerFilter("all")}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 hover:bg-indigo-100"
                >
                  {t("ผู้ดูแล", "Owner", "负责人")}: {ownerFilter === NO_OWNER ? t("ยังไม่ระบุ", "Not set", "未设置") : ownerFilter} ✕
                </button>
              )}
              <DateRangePicker
                from={scopeFrom}
                to={scopeTo}
                onChange={(f, tt) => {
                  setSelectedDate(null);
                  setCustomFrom(f);
                  setCustomTo(tt);
                }}
                onClear={() => {
                  setSelectedDate(null);
                  setCustomFrom(null);
                  setCustomTo(null);
                }}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-[#1A1A1A] mb-1.5">{t("สรุปตามผู้ดูแล", "Summary by owner", "按负责人汇总")}</p>
              <table className="w-full text-[11px] table-fixed">
                <colgroup>
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                  <col className="w-1/5" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[#9CA3AF] border-b border-[#E8E5E0]">
                    <th className="py-1 font-medium">{t("ผู้ดูแล", "Owner", "负责人")}</th>
                    <th className="py-1 font-medium text-right">{t("ลีด", "Leads", "线索")}</th>
                    <th className="py-1 font-medium text-right">{t("ปิด", "Closed", "成交")}</th>
                    <th className="py-1 font-medium text-right">{t("อัตรา", "Rate", "成交率")}</th>
                    <th className="py-1 font-medium text-right">{t("ค่ายิง Ads ฿", "Ad spend ฿", "广告费 ฿")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    onClick={() => setOwnerFilter("all")}
                    className={`cursor-pointer border-b border-[#F0EDE6] hover:bg-[#FAF7F2] ${ownerFilter === "all" ? "bg-[#FAF7F2] font-semibold" : ""}`}
                  >
                    <td className="py-1">{t("ทุกคน", "Everyone", "全部")}</td>
                    <td className="py-1 text-right">{rangeLeads.length}</td>
                    <td className="py-1 text-right">{rangeLeads.filter((l) => l.status === "converted").length}</td>
                    <td className="py-1 text-right">
                      {rangeLeads.length ? ((rangeLeads.filter((l) => l.status === "converted").length / rangeLeads.length) * 100).toFixed(0) : 0}%
                    </td>
                    <td className="py-1 text-right">{adSpendScopeTotal ? adSpendScopeTotal.toLocaleString("th-TH") : "-"}</td>
                  </tr>
                  {ownerSummary.map((o) => (
                    <tr
                      key={o.name}
                      onClick={() => setOwnerFilter(ownerFilter === o.name ? "all" : o.name)}
                      className={`cursor-pointer border-b border-[#F0EDE6] hover:bg-[#FAF7F2] ${ownerFilter === o.name ? "bg-indigo-50 font-semibold" : ""}`}
                    >
                      <td className="py-1">{o.name === NO_OWNER ? t("ยังไม่ระบุ", "Not set", "未设置") : o.name}</td>
                      <td className="py-1 text-right">{o.count}</td>
                      <td className="py-1 text-right">{o.converted}</td>
                      <td className="py-1 text-right">{o.count ? `${o.rate.toFixed(0)}%` : "-"}</td>
                      <td className="py-1 text-right">
                        {isSingleDay ? (
                          <AdSpendInput key={`${adSpendEditDate}-${o.name}`} date={adSpendEditDate} owner={o.name} initialAmount={o.editDayAmount} onSave={saveAdSpend} />
                        ) : (
                          <span className="inline-block text-[11px] font-medium text-[#1A1A1A]">
                            {o.rangeAdAmount ? o.rangeAdAmount.toLocaleString("th-TH") : "-"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-[#9CA3AF] mt-1">
                {isSingleDay
                  ? t(
                      `กดชื่อเพื่อกรองกราฟและบอร์ดเฉพาะคนนั้น — ช่องค่ายิง Ads แก้ของวันที่ ${adSpendEditDate}`,
                      `Click a name to filter the charts and board — the Ad Spend box edits ${adSpendEditDate}`,
                      `点击姓名筛选图表和看板——广告费栏编辑 ${adSpendEditDate} 当天`
                    )
                  : t(
                      `กดชื่อเพื่อกรองกราฟและบอร์ดเฉพาะคนนั้น — ช่องค่ายิง Ads แสดงผลรวมของช่วง ${scopeFrom} → ${scopeTo} (เลือกวันเดียวเพื่อแก้ไข)`,
                      `Click a name to filter the charts and board — the Ad Spend column shows the total for ${scopeFrom} → ${scopeTo} (pick a single day to edit it)`,
                      `点击姓名筛选图表和看板——广告费栏显示 ${scopeFrom} → ${scopeTo} 期间的总额（选择单日可编辑）`
                    )}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── Status board ─────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">{t("กำลังโหลด...", "Loading...", "加载中...")}</div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">
          {t('ยังไม่มีลีด — กด "เพิ่มลีด" เพื่อเริ่มบันทึก', 'No leads yet — click "Add Lead" to start tracking', '暂无线索 — 点击"添加线索"开始记录')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {boardGroups.map((col) => (
            <div key={col.key} className={`rounded-xl border overflow-hidden ${col.body}`}>
              <div className={`${col.header} text-white px-4 py-2.5 flex items-center justify-between`}>
                <p className="text-sm font-semibold">{t(col.th, col.en, col.zh)}</p>
                <span className="text-xs font-bold bg-white/25 rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                  {col.leads.length}
                </span>
              </div>

              <div className="p-2.5 space-y-2.5 max-h-[70vh] overflow-y-auto">
                {col.leads.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] text-center py-6">{t("ไม่มีรายการ", "No items", "暂无")}</p>
                ) : (
                  col.leads.map((lead) => {
                    const overdue =
                      !!lead.next_followup_date &&
                      lead.next_followup_date < today &&
                      lead.status !== "converted" &&
                      lead.status !== "lost";
                    return (
                      <div key={lead.id} className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="size-9 shrink-0">
                              {lead.profile_image_url && <AvatarImage src={lead.profile_image_url} alt={lead.customer_name} />}
                              <AvatarFallback>{lead.customer_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight truncate">{lead.customer_name}</p>
                              {lead.customer_id && <p className="text-[10px] text-[#9CA3AF] leading-tight">{lead.customer_id}</p>}
                            </div>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button size="icon-sm" variant="ghost" onClick={() => openEdit(lead)} aria-label={t("แก้ไข", "Edit", "编辑")}>
                              <Pencil size={13} />
                            </Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => deleteLead(lead.id)} aria-label={t("ลบ", "Delete", "删除")}>
                              <Trash2 size={13} className="text-red-500" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#6B6B6B]">
                          <span className="bg-[#FAF7F2] rounded px-1.5 py-0.5">
                            {(() => {
                              const c = CHANNELS.find((c) => c.value === lead.channel);
                              return c ? t(c.th, c.en, c.zh) : lead.channel;
                            })()}
                          </span>
                          {lead.sku && <span className="font-mono bg-[#FAF7F2] rounded px-1.5 py-0.5">{lead.sku}</span>}
                          <span className="bg-[#FAF7F2] rounded px-1.5 py-0.5">{lead.lead_date}</span>
                          {lead.owner && (
                            <span className="bg-indigo-50 text-indigo-700 font-semibold rounded px-1.5 py-0.5">{lead.owner}</span>
                          )}
                          {lead.paid_pct != null && (
                            <span className="bg-emerald-50 text-emerald-700 font-semibold rounded px-1.5 py-0.5">
                              {t("จ่ายแล้ว", "Paid", "已付")} {lead.paid_pct}%
                            </span>
                          )}
                        </div>

                        {lead.notes && <p className="text-xs text-[#6B6B6B] line-clamp-2">{lead.notes}</p>}

                        <div className={`text-[10px] ${overdue ? "text-red-600 font-semibold" : "text-[#9CA3AF]"}`}>
                          {t("ยืนยันจ่ายเงิน", "Payment confirmed", "成交日期")}: {lead.next_followup_date || "-"}
                          {overdue && ` ⚠ ${t("เลยกำหนด", "Overdue", "已逾期")}`}
                        </div>

                        <Select value={lead.status} onValueChange={(v) => quickSetStatus(lead, v as LeadStatus)}>
                          <SelectTrigger
                            size="sm"
                            className={`w-full h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${statusMeta(lead.status).color}`}
                          >
                            <SelectValue>{(v: LeadStatus) => { const m = statusMeta(v); return t(m.th, m.en, m.zh); }}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {t(s.th, s.en, s.zh)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / edit dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? t("แก้ไขลีด", "Edit Lead", "编辑线索") : t("เพิ่มลีดใหม่", "Add New Lead", "添加新线索")}
              {lastSavedAt && (
                <span className="text-xs font-normal text-emerald-600">
                  {t("บันทึกอัตโนมัติแล้ว", "Auto-saved", "已自动保存")} {lastSavedAt}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
            {/* Customer profile card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-[#FAF7F2] rounded-xl p-5">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Avatar className="size-28 text-2xl">
                  {form.profile_image_url && <AvatarImage src={form.profile_image_url} alt="" />}
                  <AvatarFallback>{form.customer_name.slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <label>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-md px-3 py-1.5 cursor-pointer bg-white hover:bg-[#F0EDE6]">
                    {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                    {uploadingPhoto ? t("กำลังอัปโหลด...", "Uploading...", "上传中...") : t("อัปโหลดรูป", "Upload Photo", "上传照片")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPhoto(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-sm">{t("ชื่อลูกค้า", "Customer Name", "客户名称")}</Label>
                  <Input
                    className="mt-1 text-base h-11"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder={t("เช่น คุณสมชาย", "e.g. Somchai", "例如：陈先生")}
                  />
                </div>
                <div>
                  <Label className="text-sm">{t("หมายเลขลูกค้า (Customer ID)", "Customer ID", "客户编号")}</Label>
                  <Input
                    className="mt-1"
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    placeholder={t("เช่น C-0012", "e.g. C-0012", "例如：C-0012")}
                  />
                </div>
                <div>
                  <Label className="text-sm">{t("ที่อยู่", "Address", "地址")}</Label>
                  <Input
                    className="mt-1"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder={t("ที่อยู่ลูกค้า/บริษัท", "Customer/company address", "客户/公司地址")}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("วันแรกที่ลูกค้าทักเข้ามา", "First Contact Date", "客户咨询日期")}</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.lead_date}
                onChange={(e) => setForm({ ...form, lead_date: e.target.value })}
              />
            </div>

            <div>
              <Label>{t("Channel ต้นทาง", "Source Channel", "来源渠道")}</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as LeadChannel })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: LeadChannel) => { const c = CHANNELS.find((c) => c.value === v); return c && t(c.th, c.en, c.zh); }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{t(c.th, c.en, c.zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("กลุ่มลูกค้า (Segment)", "Segment", "客户类型")}</Label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as LeadSegment })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: LeadSegment) => { const s = SEGMENTS.find((s) => s.value === v); return s && t(s.th, s.en, s.zh); }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{t(s.th, s.en, s.zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("SKU สินค้าที่สนใจ", "Interested SKU", "感兴趣的SKU")}</Label>
              <Input
                className="mt-1 font-mono"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder={t("เช่น YN-01-4", "e.g. YN-01-4", "例如：YN-01-4")}
              />
            </div>
            <div>
              <Label>{t("ช่องทางติดต่อ", "Contact Method", "联系方式")}</Label>
              <Select value={form.contact_method} onValueChange={(v) => setForm({ ...form, contact_method: v as LeadContactMethod })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: LeadContactMethod) => { const m = CONTACT_METHODS.find((m) => m.value === v); return m && t(m.th, m.en, m.zh); }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{t(m.th, m.en, m.zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("ไอดี/เบอร์ติดต่อ", "Contact ID / Number", "联系ID/号码")}</Label>
              <Input
                className="mt-1"
                value={form.contact_id}
                onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                placeholder={t("LINE ID / WeChat ID / เบอร์โทร", "LINE ID / WeChat ID / phone", "LINE ID / 微信号 / 电话")}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>{t("รายละเอียดของลูกค้า", "Customer Details", "客户详情")}</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.customer_details}
                onChange={(e) => setForm({ ...form, customer_details: e.target.value })}
                placeholder={t("ธุรกิจ, ความต้องการเบื้องต้น, บริบทลูกค้า", "Business, initial needs, customer context", "业务、初步需求、客户背景")}
              />
            </div>

            <div>
              <Label>{t("มีการติดต่อทางโทรศัพท์หรือไม่?", "Contacted by phone?", "是否已电话联系？")}</Label>
              <Select value={form.phone_contacted} onValueChange={(v) => setForm({ ...form, phone_contacted: v as YesNoUnknown })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: YesNoUnknown) => { const o = YES_NO_UNKNOWN.find((o) => o.value === v); return o && t(o.th, o.en, o.zh); }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {YES_NO_UNKNOWN.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{t(o.th, o.en, o.zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("มีแปลนออฟฟิศไหม?", "Has office floor plan?", "是否有办公室平面图？")}</Label>
              <Select value={form.has_office_plan} onValueChange={(v) => setForm({ ...form, has_office_plan: v as YesNoUnknown })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: YesNoUnknown) => { const o = YES_NO_UNKNOWN.find((o) => o.value === v); return o && t(o.th, o.en, o.zh); }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {YES_NO_UNKNOWN.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{t(o.th, o.en, o.zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("ลูกค้าจะมาที่โชว์รูมไหม?", "Will visit showroom?", "客户会到展厅吗？")}</Label>
              <Select value={form.will_visit_showroom} onValueChange={(v) => setForm({ ...form, will_visit_showroom: v as YesNoUnknown })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: YesNoUnknown) => { const o = YES_NO_UNKNOWN.find((o) => o.value === v); return o && t(o.th, o.en, o.zh); }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {YES_NO_UNKNOWN.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{t(o.th, o.en, o.zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("ต้องการใช้เฟอร์นิเจอร์ภายในวันที่", "Furniture needed by", "所需家具截止日期")}</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.needed_by_date}
                onChange={(e) => setForm({ ...form, needed_by_date: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>{t("ผู้ดูแลลีด", "Lead Owner", "负责人")}</Label>
              <Select value={form.owner || "__none"} onValueChange={(v) => setForm({ ...form, owner: !v || v === "__none" ? "" : v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: string) => (v === "__none" ? t("ยังไม่ระบุ", "Not set", "未设置") : v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t("ยังไม่ระบุ", "Not set", "未设置")}</SelectItem>
                  {SALESPEOPLE.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>{t("สถานะติดตาม", "Follow-up Status", "跟进状态")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue>{(v: LeadStatus) => { const m = statusMeta(v); return t(m.th, m.en, m.zh); }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{t(s.th, s.en, s.zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.status === "lost" && (
              <div className="sm:col-span-2">
                <Label>{t("เหตุผลที่เสียลูกค้า", "Reason Lost", "流失原因")}</Label>
                <Select value={form.lost_reason} onValueChange={(v) => setForm({ ...form, lost_reason: v ?? "" })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue>
                      {(v: string) => {
                        const r = LOST_REASONS.find((r) => r.value === v);
                        return r ? t(r.th, r.en, r.zh) : t("เลือกเหตุผล", "Select a reason", "选择原因");
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LOST_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{t(r.th, r.en, r.zh)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>{t("วันที่ลูกค้ายืนยันจ่ายเงิน", "Payment Confirmed Date", "成交日期")}</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.next_followup_date}
                onChange={(e) => setForm({ ...form, next_followup_date: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("มูลค่าดีล (บาท) — ถ้าปิดการขายแล้ว", "Deal Value (THB) — if converted", "订单金额（泰铢）— 如已成交")}</Label>
              <Input
                type="number"
                className="mt-1"
                value={form.deal_value}
                onChange={(e) => setForm({ ...form, deal_value: e.target.value })}
                placeholder={t("เช่น 9900", "e.g. 9900", "例如：9900")}
              />
            </div>
            <div>
              <Label>{t("จ่ายเงินแล้วกี่เปอร์เซ็นต์", "Paid So Far (%)", "已付款百分比")}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                className="mt-1"
                value={form.paid_pct}
                onChange={(e) => setForm({ ...form, paid_pct: e.target.value })}
                placeholder={t("เช่น 50", "e.g. 50", "例如：50")}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>{t("ติดตามรายละเอียดเพิ่มเติม", "Additional Follow-up Notes", "更多跟进详情")}</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("บันทึกการสนทนา / ป้ายกำกับต่อไป", "Conversation notes / next steps", "对话记录/下一步安排")}
              />
            </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("ยกเลิก", "Cancel", "取消")}</Button>
            <Button onClick={saveLead} disabled={saving || !form.customer_name.trim()}>
              {saving
                ? t("กำลังบันทึก...", "Saving...", "保存中...")
                : editing
                  ? t("บันทึกการแก้ไข", "Save Changes", "保存修改")
                  : t("เพิ่มลีด", "Add Lead", "添加线索")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
