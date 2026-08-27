"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Lead, LeadChannel, LeadContactMethod, LeadSegment, LeadStatus } from "@/types";

const CHANNELS: { value: LeadChannel; label: string; color: string }[] = [
  { value: "facebook", label: "Facebook", color: "#1877F2" },
  { value: "shopee",   label: "Shopee",   color: "#EE4D2D" },
  { value: "tiktok",   label: "TikTok",   color: "#111111" },
  { value: "line",     label: "LINE",     color: "#06C755" },
  { value: "other",    label: "อื่นๆ",     color: "#9CA3AF" },
];

const STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new",            label: "⭕ ยังไม่เคยติดตาม",     color: "bg-[#E8E5E0] text-[#6B6B6B]" },
  { value: "followed_1",     label: "🟡 ติดตามแล้ว 1 ครั้ง",  color: "bg-yellow-100 text-yellow-700" },
  { value: "followed_2plus", label: "🟠 ติดตามแล้ว 2+ ครั้ง", color: "bg-orange-100 text-orange-700" },
  { value: "engaged",        label: "🟢 ตอบรับแล้ว",          color: "bg-green-100 text-green-700" },
  { value: "quoted",         label: "✅ ส่งใบเสนอราคาแล้ว",   color: "bg-blue-100 text-blue-700" },
  { value: "converted",      label: "🎯 ปิดการขาย",           color: "bg-emerald-600 text-white" },
  { value: "lost",           label: "❌ เสียลูกค้า",          color: "bg-red-100 text-red-700" },
];

const CONTACT_METHODS: { value: LeadContactMethod; label: string }[] = [
  { value: "line",      label: "LINE" },
  { value: "phone",     label: "โทรศัพท์" },
  { value: "email",     label: "อีเมล" },
  { value: "messenger", label: "Messenger" },
];

const SEGMENTS: { value: LeadSegment; label: string }[] = [
  { value: "b2b", label: "B2B (องค์กร/SME)" },
  { value: "b2c", label: "B2C (ผู้บริโภค)" },
];

const LOST_REASONS = [
  { value: "price",            label: "ราคา" },
  { value: "not_interested",   label: "ไม่สนใจแล้ว" },
  { value: "bought_elsewhere", label: "ซื้อที่อื่น" },
  { value: "other",            label: "อื่นๆ" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  lead_date: todayStr(),
  customer_name: "",
  channel: "facebook" as LeadChannel,
  segment: "b2c" as LeadSegment,
  sku: "",
  status: "new" as LeadStatus,
  contact_method: "line" as LeadContactMethod,
  notes: "",
  next_followup_date: "",
  deal_value: "",
  lost_reason: "",
};

function statusMeta(status: LeadStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

export default function KpiPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
      customer_name: lead.customer_name,
      channel: lead.channel,
      segment: lead.segment,
      sku: lead.sku || "",
      status: lead.status,
      contact_method: lead.contact_method || "line",
      notes: lead.notes,
      next_followup_date: lead.next_followup_date || "",
      deal_value: lead.deal_value != null ? String(lead.deal_value) : "",
      lost_reason: lead.lost_reason || "",
    });
    setDialogOpen(true);
  }

  async function saveLead() {
    if (!form.customer_name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      sku: form.sku || null,
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
          ลูกค้า: l.customer_name,
          Channel: l.channel,
          Segment: l.segment,
          SKU: l.sku || "",
          สถานะ: statusMeta(l.status).label,
          ช่องทางติดต่อ: l.contact_method || "",
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
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={leads.length === 0}>
            <Download size={14} className="mr-1.5" /> Export Excel
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} className="mr-1.5" /> เพิ่มลีด
          </Button>
        </div>
      </div>

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

      {/* ── Daily tracker table ──────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAF7F2]">
              <TableHead className="text-xs">วันที่</TableHead>
              <TableHead className="text-xs">ลูกค้า</TableHead>
              <TableHead className="text-xs">Channel</TableHead>
              <TableHead className="text-xs">SKU</TableHead>
              <TableHead className="text-xs">สถานะ</TableHead>
              <TableHead className="text-xs">ติดต่อทาง</TableHead>
              <TableHead className="text-xs">ติดตามครั้งถัดไป</TableHead>
              <TableHead className="text-xs">หมายเหตุ</TableHead>
              <TableHead className="text-xs" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-[#6B6B6B]">
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-[#6B6B6B]">
                  ยังไม่มีลีด — กด &quot;เพิ่มลีด&quot; เพื่อเริ่มบันทึก
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const overdue =
                  !!lead.next_followup_date &&
                  lead.next_followup_date < today &&
                  lead.status !== "converted" &&
                  lead.status !== "lost";
                return (
                  <TableRow key={lead.id} className="hover:bg-[#FAF7F2]/50">
                    <TableCell className="text-xs text-[#6B6B6B] whitespace-nowrap">{lead.lead_date}</TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">{lead.customer_name}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {CHANNELS.find((c) => c.value === lead.channel)?.label || lead.channel}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-[#6B6B6B] whitespace-nowrap">{lead.sku || "-"}</TableCell>
                    <TableCell>
                      <Select value={lead.status} onValueChange={(v) => quickSetStatus(lead, v as LeadStatus)}>
                        <SelectTrigger
                          size="sm"
                          className={`h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium whitespace-nowrap ${statusMeta(lead.status).color}`}
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
                    </TableCell>
                    <TableCell className="text-xs text-[#6B6B6B] whitespace-nowrap">
                      {CONTACT_METHODS.find((m) => m.value === lead.contact_method)?.label || "-"}
                    </TableCell>
                    <TableCell className={`text-xs whitespace-nowrap ${overdue ? "text-red-600 font-semibold" : "text-[#6B6B6B]"}`}>
                      {lead.next_followup_date || "-"}
                      {overdue && " ⚠"}
                    </TableCell>
                    <TableCell className="text-xs text-[#6B6B6B] max-w-[200px] truncate">{lead.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(lead)} aria-label="แก้ไข">
                          <Pencil size={13} />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => deleteLead(lead.id)} aria-label="ลบ">
                          <Trash2 size={13} className="text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add / edit dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขลีด" : "เพิ่มลีดใหม่"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
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
              <Label>ชื่อ/ID ลูกค้า</Label>
              <Input
                className="mt-1"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="เช่น คุณสมชาย"
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
              <Label>หมายเหตุ</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="บันทึกการสนทนา / ป้ายกำกับต่อไป"
              />
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
