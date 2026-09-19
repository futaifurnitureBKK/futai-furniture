"use client";
import { useEffect, useMemo, useState } from "react";
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
import type { Lead, LeadChannel, LeadContactMethod, LeadSegment, LeadStatus, YesNoUnknown } from "@/types";
import { CHANNELS, STATUSES, CONTACT_METHODS, SEGMENTS, LOST_REASONS, YES_NO_UNKNOWN, statusMeta } from "@/lib/lead-options";
import { ImportLeadsDialog } from "@/components/admin/import-leads-dialog";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const BOARD_COLUMNS: {
  key: string;
  label: string;
  statuses: LeadStatus[];
  header: string;
  body: string;
}[] = [
  { key: "A", label: "คอนเฟิร์ม / จ่ายเงินแล้ว", statuses: ["converted"], header: "bg-emerald-600", body: "bg-emerald-50/60 border-emerald-200" },
  { key: "B", label: "รออนุมัติ (ส่งใบเสนอราคาแล้ว)", statuses: ["quoted"], header: "bg-amber-500", body: "bg-amber-50/60 border-amber-200" },
  { key: "C", label: "ยังไม่ได้ตอบกลับ", statuses: ["new", "followed_1", "followed_2plus", "engaged"], header: "bg-orange-500", body: "bg-orange-50/60 border-orange-200" },
  { key: "D", label: "ปฏิเสธ", statuses: ["lost"], header: "bg-red-600", body: "bg-red-50/60 border-red-200" },
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
};

export default function KpiPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [openBoardKey, setOpenBoardKey] = useState<string | null>(null);

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
    });
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
        alert(data.error || "อัปโหลดรูปไม่สำเร็จ");
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveLead() {
    if (!form.customer_name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      customer_id: form.customer_id || null,
      profile_image_url: form.profile_image_url || null,
      address: form.address || null,
      sku: form.sku || null,
      contact_id: form.contact_id || null,
      customer_details: form.customer_details || null,
      needed_by_date: form.needed_by_date || null,
      next_followup_date: form.next_followup_date || null,
      deal_value: form.deal_value ? Number(form.deal_value) : null,
      lost_reason: form.status === "lost" ? form.lost_reason || null : null,
    };
    const res = await fetch(editing ? `/api/admin/leads/${editing.id}` : "/api/admin/leads", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      if (editing) {
        setLeads((prev) => prev.map((l) => (l.id === editing.id ? data.lead : l)));
      } else {
        setLeads((prev) => [data.lead, ...prev]);
      }
      setDialogOpen(false);
    } else {
      alert(data.error || "บันทึกไม่สำเร็จ");
    }
  }

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
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  }

  async function deleteLead(id: number) {
    if (!confirm("ลบรายการติดตามนี้ใช่หรือไม่?")) return;
    const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
    if (res.ok) setLeads((ls) => ls.filter((l) => l.id !== id));
    else alert("ลบไม่สำเร็จ");
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

  const activeBoard = boardGroups.find((c) => c.key === openBoardKey);

  const channelData = useMemo(
    () =>
      CHANNELS.map((c) => ({
        channel: c.label,
        count: leads.filter((l) => l.channel === c.value).length,
        converted: leads.filter((l) => l.channel === c.value && l.status === "converted").length,
        color: c.color,
      })),
    [leads]
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
          label: s.label,
          count: rows.length,
          convertedCount: converted.length,
          aov: deals.length ? deals.reduce((a, b) => a + b, 0) / deals.length : null,
        };
      }),
    [leads]
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
          สถานะ: statusMeta(l.status).label,
          ช่องทางติดต่อ: l.contact_method || "",
          "ไอดี/เบอร์ติดต่อ": l.contact_id || "",
          "รายละเอียดลูกค้า": l.customer_details || "",
          "ติดต่อทางโทรศัพท์แล้ว": YES_NO_UNKNOWN.find((o) => o.value === l.phone_contacted)?.label || "",
          "มีแปลนออฟฟิศ": YES_NO_UNKNOWN.find((o) => o.value === l.has_office_plan)?.label || "",
          "จะมาโชว์รูม": YES_NO_UNKNOWN.find((o) => o.value === l.will_visit_showroom)?.label || "",
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
        channelData.map((c) => ({ Channel: c.channel, Leads: c.count, Converted: c.converted }))
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
          <h1 className="text-2xl font-bold text-[#1A1A1A]">KPI ติดตามลูกค้า</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">ติดตามลีดรายวัน แปลงเป็นออเดอร์ วัดผลแต่ละ channel</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-1.5" /> นำเข้าจาก Excel
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={leads.length === 0}>
            <Download size={14} className="mr-1.5" /> Export Excel
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} className="mr-1.5" /> เพิ่มลีด
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
          { label: "Total Leads",     value: kpi.total,                                              sub: "▲ 20%/เดือน เป้าหมาย" },
          { label: "Follow-up Rate",  value: `${kpi.followUpRate.toFixed(0)}%`,                       sub: "เป้า ≥ 80%" },
          { label: "Response Rate",   value: `${kpi.responseRate.toFixed(0)}%`,                       sub: "เป้า ≥ 30%" },
          { label: "Conversion Rate", value: `${kpi.conversionRate.toFixed(0)}%`,                     sub: "เป้า 10–15%" },
          { label: "Cycle Time",      value: kpi.avgCycleDays != null ? `${kpi.avgCycleDays.toFixed(0)} วัน` : "-", sub: "เป้า ≤ 14 วัน" },
          { label: "AOV",             value: kpi.aov != null ? kpi.aov.toLocaleString("th-TH", { maximumFractionDigits: 0 }) : "-", sub: "บาท/ออเดอร์" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-[#6B6B6B]">{c.label}</p>
            <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{c.value}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Channel chart + side panels ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-4">Leads ต่อ Channel</p>
          {leads.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-16">ยังไม่มีข้อมูล</p>
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
                        <p className="text-[#6B6B6B]">Leads: {d.count}</p>
                        <p className="text-[#6B6B6B]">ปิดการขาย: {d.converted}</p>
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
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="text-[#6B6B6B]">{s.label}</span>
                  <span className="text-[#1A1A1A] font-medium">
                    {s.count} ลีด · ปิด {s.convertedCount} · AOV {s.aov != null ? s.aov.toLocaleString("th-TH", { maximumFractionDigits: 0 }) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top SKUs */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">SKU ขายดี (ปิดการขาย)</p>
            {topSkus.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">ยังไม่มีดีลที่ปิด</p>
            ) : (
              <div className="space-y-1.5">
                {topSkus.map(([sku, count]) => (
                  <div key={sku} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#1A1A1A]">{sku}</span>
                    <span className="text-[#6B6B6B]">{count} ดีล</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lost reasons */}
          {lostReasons.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-3">เหตุผลที่เสียดีล</p>
              <div className="space-y-1.5">
                {lostReasons.map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-xs">
                    <span className="text-[#6B6B6B]">{LOST_REASONS.find((r) => r.value === reason)?.label || reason}</span>
                    <span className="text-[#1A1A1A] font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Status board (summary tiles → click to drill in) ───────── */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">กำลังโหลด...</div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">
          ยังไม่มีลีด — กด &quot;เพิ่มลีด&quot; เพื่อเริ่มบันทึก
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {boardGroups.map((col) => {
            const pct = leads.length ? Math.round((col.leads.length / leads.length) * 100) : 0;
            return (
              <button
                key={col.key}
                onClick={() => setOpenBoardKey(col.key)}
                className="text-left bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={`${col.header} h-1.5`} />
                <div className="p-4">
                  <p className="text-xs text-[#6B6B6B]">{col.label}</p>
                  <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{col.leads.length}</p>
                  <div className="h-1.5 bg-[#F0EDE6] rounded-full mt-3 overflow-hidden">
                    <div className={`${col.header} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">{pct}% ของทั้งหมด</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Drill-in dialog for one status column ───────────────────── */}
      <Dialog open={!!openBoardKey} onOpenChange={(v) => !v && setOpenBoardKey(null)}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {activeBoard?.label} ({activeBoard?.leads.length ?? 0})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 py-2">
            {activeBoard?.leads.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-12">ไม่มีรายการ</p>
            ) : (
              activeBoard?.leads.map((lead) => {
                const overdue =
                  !!lead.next_followup_date &&
                  lead.next_followup_date < today &&
                  lead.status !== "converted" &&
                  lead.status !== "lost";
                return (
                  <div key={lead.id} className={`rounded-lg shadow-sm p-3 space-y-2 ${activeBoard?.body}`}>
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
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(lead)} aria-label="แก้ไข">
                          <Pencil size={13} />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => deleteLead(lead.id)} aria-label="ลบ">
                          <Trash2 size={13} className="text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#6B6B6B]">
                      <span className="bg-white rounded px-1.5 py-0.5">
                        {CHANNELS.find((c) => c.value === lead.channel)?.label || lead.channel}
                      </span>
                      {lead.sku && <span className="font-mono bg-white rounded px-1.5 py-0.5">{lead.sku}</span>}
                      <span className="bg-white rounded px-1.5 py-0.5">{lead.lead_date}</span>
                    </div>

                    {lead.notes && <p className="text-xs text-[#6B6B6B] line-clamp-2">{lead.notes}</p>}

                    <div className={`text-[10px] ${overdue ? "text-red-600 font-semibold" : "text-[#9CA3AF]"}`}>
                      ติดตามถัดไป: {lead.next_followup_date || "-"}
                      {overdue && " ⚠ เลยกำหนด"}
                    </div>

                    <Select value={lead.status} onValueChange={(v) => quickSetStatus(lead, v as LeadStatus)}>
                      <SelectTrigger
                        size="sm"
                        className={`w-full h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${statusMeta(lead.status).color}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add / edit dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขลีด" : "เพิ่มลีดใหม่"}</DialogTitle>
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
                    {uploadingPhoto ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
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
                  <Label className="text-sm">ชื่อลูกค้า</Label>
                  <Input
                    className="mt-1 text-base h-11"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="เช่น คุณสมชาย"
                  />
                </div>
                <div>
                  <Label className="text-sm">หมายเลขลูกค้า (Customer ID)</Label>
                  <Input
                    className="mt-1"
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    placeholder="เช่น C-0012"
                  />
                </div>
                <div>
                  <Label className="text-sm">ที่อยู่</Label>
                  <Input
                    className="mt-1"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="ที่อยู่ลูกค้า/บริษัท"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่ติดตาม</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.lead_date}
                onChange={(e) => setForm({ ...form, lead_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Channel ต้นทาง</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as LeadChannel })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segment</Label>
              <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as LeadSegment })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>SKU สินค้าที่สนใจ</Label>
              <Input
                className="mt-1 font-mono"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="เช่น YN-01-4"
              />
            </div>
            <div>
              <Label>ช่องทางติดต่อ</Label>
              <Select value={form.contact_method} onValueChange={(v) => setForm({ ...form, contact_method: v as LeadContactMethod })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ไอดี/เบอร์ติดต่อ</Label>
              <Input
                className="mt-1"
                value={form.contact_id}
                onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                placeholder="LINE ID / WeChat ID / เบอร์โทร"
              />
            </div>

            <div className="col-span-2">
              <Label>รายละเอียดของลูกค้า</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.customer_details}
                onChange={(e) => setForm({ ...form, customer_details: e.target.value })}
                placeholder="ธุรกิจ, ความต้องการเบื้องต้น, บริบทลูกค้า"
              />
            </div>

            <div>
              <Label>มีการติดต่อทางโทรศัพท์หรือไม่?</Label>
              <Select value={form.phone_contacted} onValueChange={(v) => setForm({ ...form, phone_contacted: v as YesNoUnknown })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YES_NO_UNKNOWN.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>มีแปลนออฟฟิศไหม?</Label>
              <Select value={form.has_office_plan} onValueChange={(v) => setForm({ ...form, has_office_plan: v as YesNoUnknown })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YES_NO_UNKNOWN.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ลูกค้าจะมาที่โชว์รูมไหม?</Label>
              <Select value={form.will_visit_showroom} onValueChange={(v) => setForm({ ...form, will_visit_showroom: v as YesNoUnknown })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YES_NO_UNKNOWN.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ต้องการใช้เฟอร์นิเจอร์ภายในวันที่</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.needed_by_date}
                onChange={(e) => setForm({ ...form, needed_by_date: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label>สถานะติดตาม</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.status === "lost" && (
              <div className="col-span-2">
                <Label>เหตุผลที่เสียลูกค้า</Label>
                <Select value={form.lost_reason} onValueChange={(v) => setForm({ ...form, lost_reason: v ?? "" })}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="เลือกเหตุผล" /></SelectTrigger>
                  <SelectContent>
                    {LOST_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>วันติดตามครั้งถัดไป</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.next_followup_date}
                onChange={(e) => setForm({ ...form, next_followup_date: e.target.value })}
              />
            </div>
            <div>
              <Label>มูลค่าดีล (บาท) — ถ้าปิดการขายแล้ว</Label>
              <Input
                type="number"
                className="mt-1"
                value={form.deal_value}
                onChange={(e) => setForm({ ...form, deal_value: e.target.value })}
                placeholder="เช่น 9900"
              />
            </div>

            <div className="col-span-2">
              <Label>ติดตามรายละเอียดเพิ่มเติม</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="บันทึกการสนทนา / ป้ายกำกับต่อไป"
              />
            </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={saveLead} disabled={saving || !form.customer_name.trim()}>
              {saving ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "เพิ่มลีด"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
