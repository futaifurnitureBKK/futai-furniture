"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Pencil, Download, Upload, Camera, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
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
import type { Lead, LeadChannel, LeadContactMethod, LeadSegment, LeadStatus, YesNoUnknown } from "@/types";
import { CHANNELS, STATUSES, CONTACT_METHODS, SEGMENTS, LOST_REASONS, YES_NO_UNKNOWN, statusMeta } from "@/lib/lead-options";
import { SALESPEOPLE } from "@/lib/saved-quote-options";
import { ImportLeadsDialog } from "@/components/admin/import-leads-dialog";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
  { key: "A", th: "คอนเฟิร์ม / จ่ายเงินแล้ว", en: "Confirmed / Paid", zh: "已确认/已付款", statuses: ["converted"], header: "bg-emerald-600", body: "bg-emerald-50/60 border-emerald-200" },
  { key: "B", th: "รออนุมัติ (ส่งใบเสนอราคาแล้ว)", en: "Pending Approval (Quote Sent)", zh: "待批准（已发报价单）", statuses: ["quoted"], header: "bg-amber-500", body: "bg-amber-50/60 border-amber-200" },
  { key: "C", th: "ยังไม่ได้ตอบกลับ", en: "No Response Yet", zh: "尚未回复", statuses: ["new", "followed_1", "followed_2plus", "engaged"], header: "bg-orange-500", body: "bg-orange-50/60 border-orange-200" },
  { key: "D", th: "ปฏิเสธ", en: "Rejected", zh: "已拒绝", statuses: ["lost"], header: "bg-red-600", body: "bg-red-50/60 border-red-200" },
];

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
  lost_reason: "",
  owner: "",
};

export default function KpiPage() {
  const { t } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
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
      lost_reason: lead.lost_reason || "",
      owner: lead.owner || "",
    });
    setLastSavedAt(null);
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
  const kpi = useMemo(() => {
    const total = leads.length;
    const followed = leads.filter((l) => l.status !== "new").length;
    const responded = leads.filter((l) => ["engaged", "quoted", "converted"].includes(l.status)).length;
    const converted = leads.filter((l) => l.status === "converted");
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
  }, [leads]);

  const boardGroups = useMemo(
    () =>
      BOARD_COLUMNS.map((col) => ({
        ...col,
        leads: leads.filter((l) => col.statuses.includes(l.status)),
      })),
    [leads]
  );

  // Last 30 calendar days, one bar per day — click a bar (or pick a date)
  // to see exactly which leads came in that day.
  const dateData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ date: dateStr, count: leads.filter((l) => l.lead_date === dateStr).length });
    }
    return days;
  }, [leads]);

  const leadsOnSelectedDate = useMemo(
    () => leads.filter((l) => l.lead_date === selectedDate),
    [leads, selectedDate]
  );

  const channelOnSelectedDate = useMemo(
    () =>
      CHANNELS.map((c) => ({
        value: c.value,
        label: t(c.th, c.en, c.zh),
        color: c.color,
        count: leadsOnSelectedDate.filter((l) => l.channel === c.value).length,
      })).filter((c) => c.count > 0),
    [leadsOnSelectedDate, t]
  );

  const channelData = useMemo(
    () =>
      CHANNELS.map((c) => ({
        channel: t(c.th, c.en, c.zh),
        count: leads.filter((l) => l.channel === c.value && l.lead_date === selectedDate).length,
        converted: leads.filter((l) => l.channel === c.value && l.lead_date === selectedDate && l.status === "converted").length,
        color: c.color,
      })),
    [leads, t, selectedDate]
  );

  const topSkus = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach((l) => {
      if (l.sku && l.status === "converted") counts.set(l.sku, (counts.get(l.sku) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [leads]);

  const lostReasons = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach((l) => {
      if (l.status === "lost" && l.lost_reason) counts.set(l.lost_reason, (counts.get(l.lost_reason) || 0) + 1);
    });
    return [...counts.entries()];
  }, [leads]);

  const segmentBreakdown = useMemo(
    () =>
      SEGMENTS.map((s) => {
        const rows = leads.filter((l) => l.segment === s.value);
        const converted = rows.filter((l) => l.status === "converted");
        const deals = converted.filter((l) => l.deal_value != null).map((l) => l.deal_value as number);
        return {
          key: s.value,
          label: t(s.th, s.en, s.zh),
          count: rows.length,
          convertedCount: converted.length,
          aov: deals.length ? deals.reduce((a, b) => a + b, 0) / deals.length : null,
        };
      }),
    [leads, t]
  );

  function exportExcel() {
    // dynamic import keeps the xlsx bundle out of the initial page load
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();

      const logSheet = XLSX.utils.json_to_sheet(
        leads.map((l) => ({
          วันที่: l.lead_date,
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
          ติดตามครั้งถัดไป: l.next_followup_date || "",
          มูลค่าดีล: l.deal_value ?? "",
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

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Leads",     value: kpi.total,                                              sub: t("▲ 20%/เดือน เป้าหมาย", "▲ 20%/mo target", "▲ 20%/月 目标") },
          { label: t("อัตราติดตาม", "Follow-up Rate", "跟进率"),  value: `${kpi.followUpRate.toFixed(0)}%`,                       sub: t("เป้า ≥ 80%", "Target ≥ 80%", "目标 ≥ 80%") },
          { label: t("อัตราตอบรับ", "Response Rate", "回复率"),   value: `${kpi.responseRate.toFixed(0)}%`,                       sub: t("เป้า ≥ 30%", "Target ≥ 30%", "目标 ≥ 30%") },
          { label: t("อัตราปิดการขาย", "Conversion Rate", "转化率"), value: `${kpi.conversionRate.toFixed(0)}%`,                     sub: t("เป้า 10–15%", "Target 10–15%", "目标 10–15%") },
          { label: t("ระยะเวลาปิดดีล", "Cycle Time", "成交周期"),      value: kpi.avgCycleDays != null ? `${kpi.avgCycleDays.toFixed(0)} ${t("วัน", "days", "天")}` : "-", sub: t("เป้า ≤ 14 วัน", "Target ≤ 14 days", "目标 ≤ 14天") },
          { label: "AOV",             value: kpi.aov != null ? kpi.aov.toLocaleString("th-TH", { maximumFractionDigits: 0 }) : "-", sub: t("บาท/ออเดอร์", "THB/order", "泰铢/订单") },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-[#6B6B6B]">{c.label}</p>
            <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{c.value}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Leads by date ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {t("ลีดรายวัน (30 วันล่าสุด)", "Leads by Date (Last 30 Days)", "每日线索（近30天）")}
          </p>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-[#6B6B6B] whitespace-nowrap">{t("เลือกวันที่", "Select date", "选择日期")}</Label>
            <Input
              type="date"
              className="h-8 w-auto text-xs"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {leads.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-16">{t("ยังไม่มีข้อมูล", "No data yet", "暂无数据")}</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={dateData}
                  margin={{ top: 20, right: 8, left: -20, bottom: 0 }}
                  onClick={(state) => {
                    const label = state?.activeLabel;
                    if (typeof label === "string") setSelectedDate(label);
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
                    interval={3}
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
                      <Cell key={d.date} fill={d.date === selectedDate ? "#C8102E" : "#D9D4CA"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t xl:border-t-0 xl:border-l border-[#E8E5E0] pt-4 xl:pt-0 xl:pl-4">
              <p className="text-xs font-semibold text-[#1A1A1A] mb-2">
                {t("ลีดวันที่", "Leads on", "线索日期")} {selectedDate} ({leadsOnSelectedDate.length})
              </p>
              {leadsOnSelectedDate.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] text-center py-6">{t("ไม่มีลีดในวันนี้", "No leads on this date", "该日期无线索")}</p>
              ) : (
                <>
                <div className="mb-2.5">
                  <p className="text-[10px] font-semibold text-[#6B6B6B] mb-1">
                    {t("Leads ต่อ Channel (มาจาก platform ไหน)", "Leads by Channel (which platform)", "各渠道线索数（来自哪个平台）")}
                  </p>
                  <div className="space-y-1">
                    {channelOnSelectedDate.map((c) => (
                      <div key={c.value} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="w-16 shrink-0 text-[#1A1A1A]">{c.label}</span>
                        <div className="flex-1 h-2 bg-[#F0EDE6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(c.count / leadsOnSelectedDate.length) * 100}%`, backgroundColor: c.color }}
                          />
                        </div>
                        <span className="font-semibold text-[#1A1A1A] w-5 text-right">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                  {leadsOnSelectedDate.map((lead) => {
                    const c = CHANNELS.find((c) => c.value === lead.channel);
                    const m = statusMeta(lead.status);
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => openEdit(lead)}
                        className="w-full text-left flex items-center justify-between gap-2 bg-[#FAF7F2] hover:bg-[#F0EDE6] rounded-lg px-2.5 py-1.5 text-xs transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-[#1A1A1A] truncate">{lead.customer_name}</p>
                          <p className="text-[10px] text-[#9CA3AF]">
                            {c ? t(c.th, c.en, c.zh) : lead.channel}
                            {lead.sku ? ` · ${lead.sku}` : ""}
                          </p>
                        </div>
                        {lead.owner && (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                            {lead.owner}
                          </span>
                        )}
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${m.color}`}>
                          {t(m.th, m.en, m.zh)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Channel chart + side panels ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-4">
            {t("Leads ต่อ Channel", "Leads by Channel", "各渠道线索数")} · {t("วันที่", "on", "日期")} {selectedDate}
          </p>
          {leads.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-16">{t("ยังไม่มีข้อมูล", "No data yet", "暂无数据")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
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
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {channelData.map((d) => (
                    <Cell key={d.channel} fill={d.color} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: "#1A1A1A", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-4">
          {/* Segment breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">B2B vs B2C</p>
            <div className="space-y-2">
              {segmentBreakdown.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-xs">
                  <span className="text-[#6B6B6B]">{s.label}</span>
                  <span className="text-[#1A1A1A] font-medium">
                    {s.count} {t("ลีด", "leads", "条线索")} · {t("ปิด", "closed", "成交")} {s.convertedCount} · AOV {s.aov != null ? s.aov.toLocaleString("th-TH", { maximumFractionDigits: 0 }) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top SKUs */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">{t("SKU ขายดี (ปิดการขาย)", "Top SKUs (Converted)", "热销SKU（已成交）")}</p>
            {topSkus.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">{t("ยังไม่มีดีลที่ปิด", "No closed deals yet", "暂无已成交订单")}</p>
            ) : (
              <div className="space-y-1.5">
                {topSkus.map(([sku, count]) => (
                  <div key={sku} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#1A1A1A]">{sku}</span>
                    <span className="text-[#6B6B6B]">{count} {t("ดีล", "deals", "单")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lost reasons */}
          {lostReasons.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-3">{t("เหตุผลที่เสียดีล", "Lost Deal Reasons", "流失原因")}</p>
              <div className="space-y-1.5">
                {lostReasons.map(([reason, count]) => {
                  const r = LOST_REASONS.find((r) => r.value === reason);
                  return (
                    <div key={reason} className="flex items-center justify-between text-xs">
                      <span className="text-[#6B6B6B]">{r ? t(r.th, r.en, r.zh) : reason}</span>
                      <span className="text-[#1A1A1A] font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

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
                        </div>

                        {lead.notes && <p className="text-xs text-[#6B6B6B] line-clamp-2">{lead.notes}</p>}

                        <div className={`text-[10px] ${overdue ? "text-red-600 font-semibold" : "text-[#9CA3AF]"}`}>
                          {t("ติดตามถัดไป", "Next follow-up", "下次跟进")}: {lead.next_followup_date || "-"}
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

            <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("วันที่ติดตาม", "Lead Date", "跟进日期")}</Label>
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

            <div className="col-span-2">
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

            <div className="col-span-2">
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

            <div className="col-span-2">
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
              <div className="col-span-2">
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
              <Label>{t("วันติดตามครั้งถัดไป", "Next Follow-up Date", "下次跟进日期")}</Label>
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

            <div className="col-span-2">
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
