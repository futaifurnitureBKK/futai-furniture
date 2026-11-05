"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Printer, Plus, Trash2, ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/store/language";
import { fmtMoney } from "@/lib/saved-quote-options";
import { CHANNELS } from "@/lib/lead-options";
import { calcCommission, nextTier, type CommissionMode, type CommissionBase } from "@/lib/commission";
import { useQuoteBatchPdf, BATCH_PDF_CSS } from "@/hooks/useQuoteBatchPdf";
import { QuoteDocument } from "@/components/admin/QuoteDocument";

const NO_OWNER = "__none";

interface EligibleOrder {
  leadId: number;
  customerName: string;
  closedDate: string;
  channel: string;
  dealValue: number;
  baseAmount: number;
  baseIsEstimate: boolean;
  eligible: boolean;
  reason: string | null;
  sourceQuoteId: number | null;
}

interface QuoteSearchResult {
  quoteId: number;
  docNo: string;
  customerName: string;
  closedDate: string;
  channel: string;
  baseAmount: number;
  alreadyClaimed: boolean;
  reason: string | null;
}

// A row added by hand through the quotation search, not auto-detected from
// a converted lead — kept entirely separate from the EligibleOrder/selected/
// deductions/baseOverrides state (all keyed by leadId) so this never risks
// disturbing that already-working path; it carries its own editable fields
// inline instead.
interface ManualRow {
  quoteId: number;
  docNo: string;
  customerName: string;
  closedDate: string;
  channel: string;
  baseAmount: number;
  deduction: number;
  selected: boolean;
}

interface CommissionItem {
  id: number;
  lead_id: number | null;
  source_quote_id: number | null;
  customer_name: string;
  closed_date: string | null;
  base_amount: number;
  deduction: number;
  rate: number;
  commission: number;
  note: string;
  // Joined through lead_id by the batch detail route — a "belongs to one"
  // relation, but left typed loose since PostgREST's shape for it depends
  // on how it resolves the FK; getItemSourceQuoteId() below normalizes it.
  leads?: { source_quote_id: number | null } | { source_quote_id: number | null }[] | null;
}

function getItemSourceQuoteId(item: CommissionItem): number | null {
  if (item.source_quote_id != null) return item.source_quote_id;
  const l = Array.isArray(item.leads) ? item.leads[0] : item.leads;
  return l?.source_quote_id ?? null;
}

interface CommissionSplit {
  id?: number;
  person: string;
  percent: number;
}

interface CommissionBatch {
  id: number;
  owner: string;
  period_from: string;
  period_to: string;
  mode: CommissionMode;
  base: CommissionBase;
  status: "draft" | "approved" | "paid" | "cancelled";
  total_base: number;
  total_commission: number;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_at: string;
  commission_items: CommissionItem[];
  commission_splits: CommissionSplit[];
}

function channelLabel(channel: string, t: (th: string, en: string, zh: string) => string) {
  const meta = CHANNELS.find((c) => c.value === channel);
  return meta ? t(meta.th, meta.en, meta.zh) : channel;
}

const STATUS_META: Record<CommissionBatch["status"], { th: string; en: string; zh: string; className: string }> = {
  draft: { th: "ร่าง", en: "Draft", zh: "草稿", className: "bg-[#F0EDE6] text-[#6B6B6B]" },
  approved: { th: "อนุมัติแล้ว", en: "Approved", zh: "已批准", className: "bg-amber-100 text-amber-700" },
  paid: { th: "จ่ายแล้ว", en: "Paid", zh: "已发放", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { th: "ยกเลิก", en: "Cancelled", zh: "已取消", className: "bg-red-100 text-red-700" },
};

// Two mutually-exclusive print targets, same pattern as quote-builder's
// batch PDF export: #print-area (this page's own batch summary) and
// #batch-print-area (BATCH_PDF_CSS, for "download the underlying
// quotations" instead) — a body class picks which one shows.
const printCss = `
  @media print {
    @page { margin: 12mm; }
    body * { visibility: hidden; }
    body:not(.batch-print) #print-area, body:not(.batch-print) #print-area * { visibility: visible; }
    #print-area { position: absolute; top: 0; left: 0; width: 100%; margin: 0; }
    .no-print { display: none !important; }
    #print-area tr { break-inside: avoid; page-break-inside: avoid; }
  }
  ${BATCH_PDF_CSS}
`;

function CommissionInner() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const batchId = params.get("batch");
  const owner = params.get("owner") || "all";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  return (
    <>
      <style>{printCss}</style>
      {batchId ? <BatchViewer id={batchId} t={t} router={router} /> : <BatchBuilder owner={owner} from={from} to={to} t={t} router={router} />}
    </>
  );
}

function BatchBuilder({
  owner,
  from,
  to,
  t,
  router,
}: {
  owner: string;
  from: string;
  to: string;
  t: (th: string, en: string, zh: string) => string;
  router: ReturnType<typeof useRouter>;
}) {
  const [orders, setOrders] = useState<EligibleOrder[] | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [deductions, setDeductions] = useState<Record<number, number>>({});
  // Lets staff correct a row whose auto-detected base is wrong — e.g. a lead
  // linked to the wrong (or a stale) saved quotation — by typing the real
  // number directly, instead of only ever being able to subtract from it
  // via "deduction". Keyed by leadId; absent = use the auto-detected value.
  const [baseOverrides, setBaseOverrides] = useState<Record<number, number>>({});
  const [mode, setMode] = useState<CommissionMode>("cumulative");
  const [base, setBase] = useState<CommissionBase>("ex_vat");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<CommissionBatch[] | null>(null);
  const { batchQuotes, loading: pdfLoading, printQuoteIds } = useQuoteBatchPdf();

  // "Add manually" — pulls in a quotation that the auto-detected list above
  // (built only from converted leads) missed, or doesn't have one for.
  const [manualRows, setManualRows] = useState<ManualRow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<QuoteSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    // Below the 2-char threshold the dropdown is never shown (gated in the
    // JSX below), so there's nothing to reset here — leaving stale results
    // in state when hidden is harmless and avoids a setState call whose
    // only job would be to derive UI visibility, which belongs in render.
    // "searching" itself flips to true from the input's own onChange (a
    // real user event), not here, so this effect never sets state outside
    // the async callback that reacts to an external fetch finishing.
    if (!searchOpen || searchQuery.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/commission/quote-search?q=${encodeURIComponent(searchQuery.trim())}&base=${base}`);
      const data = await res.json();
      if (!cancelled) {
        setSearchResults(res.ok ? data.results : []);
        setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchOpen, searchQuery, base]);

  function addManualRow(r: QuoteSearchResult) {
    if (manualRows.some((m) => m.quoteId === r.quoteId)) return;
    setManualRows((rows) => [
      ...rows,
      { quoteId: r.quoteId, docNo: r.docNo, customerName: r.customerName, closedDate: r.closedDate, channel: r.channel, baseAmount: r.baseAmount, deduction: 0, selected: true },
    ]);
    setSearchQuery("");
    setSearchResults(null);
    setSearchOpen(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOrders(null);
      const res = await fetch(`/api/admin/commission/eligible?owner=${encodeURIComponent(owner)}&from=${from}&to=${to}&base=${base}`);
      const data = await res.json();
      if (cancelled || !res.ok) return;
      setOrders(data.orders);
      const nextSelected: Record<number, boolean> = {};
      for (const o of data.orders as EligibleOrder[]) nextSelected[o.leadId] = o.eligible;
      setSelected(nextSelected);
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, from, to, base]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (owner === "all") return;
      const res = await fetch(`/api/admin/commission/batches?owner=${encodeURIComponent(owner)}`);
      const data = await res.json();
      if (!cancelled && res.ok) setHistory(data.batches);
    })();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  const selectedOrders = useMemo(() => (orders || []).filter((o) => selected[o.leadId]), [orders, selected]);
  const selectedManualRows = useMemo(() => manualRows.filter((r) => r.selected), [manualRows]);
  const effectiveBase = (o: EligibleOrder) => baseOverrides[o.leadId] ?? o.baseAmount;
  // Manual rows share the same tier pool as lead-based ones (cumulative mode
  // sums everything before applying the rate), so both go into one
  // calcCommission call. Negative ids for manual rows (quoteId is always
  // positive) keep the two id spaces from ever colliding in commissionById.
  const netOrders = useMemo(
    () => [
      ...selectedOrders.map((o) => ({ id: o.leadId, amount: Math.max(0, effectiveBase(o) - (deductions[o.leadId] || 0)) })),
      ...selectedManualRows.map((r) => ({ id: -r.quoteId, amount: Math.max(0, r.baseAmount - r.deduction) })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedOrders, selectedManualRows, deductions, baseOverrides]
  );
  const computed = useMemo(() => calcCommission(netOrders, mode), [netOrders, mode]);
  const commissionById = useMemo(() => new Map(computed.map((c) => [c.id, c])), [computed]);

  const totalNet = netOrders.reduce((s, o) => s + o.amount, 0);
  const totalCommission = computed.reduce((s, c) => s + c.commission, 0);
  const upcoming = mode === "cumulative" ? nextTier(totalNet) : null;

  const ownerLabel = owner === "all" ? t("ทุกคน", "Everyone", "全部") : owner === NO_OWNER ? t("ยังไม่ระบุ", "Not set", "未设置") : owner;
  const selectedQuoteIds = [
    ...selectedOrders.map((o) => o.sourceQuoteId).filter((id): id is number => id != null),
    ...selectedManualRows.map((r) => r.quoteId),
  ];

  async function downloadQuotations() {
    if (!selectedQuoteIds.length) {
      toast.error(t("ออเดอร์ที่เลือกไม่มีใบเสนอราคาอ้างอิงเลย", "None of the selected orders have a linked quotation", "所选订单均未关联报价单"));
      return;
    }
    const result = await printQuoteIds(selectedQuoteIds);
    if (!result.ok) toast.error(t("โหลดใบเสนอราคาไม่สำเร็จ", "Failed to load quotations", "加载报价单失败"));
  }

  async function save() {
    if (!selectedOrders.length && !selectedManualRows.length) return;
    setSaving(true);
    try {
      const items = [
        ...selectedOrders.map((o) => ({
          leadId: o.leadId,
          customerName: o.customerName,
          closedDate: o.closedDate,
          baseAmount: effectiveBase(o),
          deduction: deductions[o.leadId] || 0,
        })),
        ...selectedManualRows.map((r) => ({
          sourceQuoteId: r.quoteId,
          customerName: r.customerName,
          closedDate: r.closedDate,
          baseAmount: r.baseAmount,
          deduction: r.deduction,
        })),
      ];
      const fallbackDate = items[0].closedDate;
      const res = await fetch("/api/admin/commission/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, periodFrom: from || fallbackDate, periodTo: to || fallbackDate, mode, base, items }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
        return;
      }
      toast.success(t("บันทึกรอบค่าคอมแล้ว", "Commission batch saved", "已保存提成批次"));
      router.push(`/admin/AdminFutai/sales-detail/commission?batch=${data.batch.id}`);
    } finally {
      setSaving(false);
    }
  }

  if (orders === null) {
    return (
      <div className="py-16 text-center text-sm text-[#6B6B6B]">
        <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
        {t("กำลังโหลด...", "Loading...", "加载中...")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">{t("คิดค่าคอมมิชชั่น", "Calculate Commission", "计算提成")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {ownerLabel} · {from && to ? `${from} → ${to}` : t("ทั้งหมด", "All time", "全部时间")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#E8E5E0] bg-white p-0.5 gap-0.5">
            {([
              { key: "cumulative", label: t("รวมทั้งรอบ", "Cumulative", "累计") },
              { key: "per_order", label: t("ต่อออเดอร์", "Per order", "按单") },
            ] as { key: CommissionMode; label: string }[]).map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setMode(b.key)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  mode === b.key ? "bg-[#C8102E] text-white font-medium" : "text-[#6B6B6B] hover:bg-[#FAF7F2]"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-lg border border-[#E8E5E0] bg-white p-0.5 gap-0.5">
            {([
              { key: "ex_vat", label: t("ก่อน VAT", "Ex-VAT", "不含税") },
              { key: "inc_vat", label: t("รวม VAT", "Inc-VAT", "含税") },
            ] as { key: CommissionBase; label: string }[]).map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setBase(b.key)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  base === b.key ? "bg-[#C8102E] text-white font-medium" : "text-[#6B6B6B] hover:bg-[#FAF7F2]"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-[#9CA3AF]">
        {t(
          "ยอดฐาน \"ประมาณการ\" คือออเดอร์ที่ไม่มีใบเสนอราคาอ้างอิง เลยไม่มี VAT/ส่วนลดจริงให้ดึง ใช้มูลค่าดีลคาดคะเนแทน — แก้ไขค่านี้ตรงๆ ได้เลยในช่อง \"ยอดฐาน\" ถ้าตัวเลขที่ระบบดึงมาไม่ถูกต้อง (เช่น ลิงก์กับใบเสนอราคาผิดใบ)",
          "\"Estimated\" base = no linked quotation to read real VAT/discount from, so it's approximated from the deal value — edit the \"Base\" field directly on a row if the number is wrong (e.g. linked to the wrong quotation).",
          "\"估算\"基数表示没有关联报价单可读取真实的增值税/折扣，因此按成交金额估算 — 如果数字不对（如关联错了报价单），可直接在\"基数\"栏修改"
        )}
      </p>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{t("เพิ่มรายการเอง", "Add manually", "手动添加")}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {t(
                "ใช้ตอนมีใบเสนอราคา/ออเดอร์ที่ควรนับในรอบนี้ แต่ไม่ขึ้นในตารางด้านล่าง เช่น ไม่มีลีดคอนเวิร์ตคู่กัน หรืออยู่คนละผู้ดูแล",
                "Use this when a quotation/order should count toward this batch but isn't showing below — e.g. no matching converted lead, or filed under a different owner.",
                "用于应计入本批次但未显示在下表中的报价单/订单 — 例如没有对应的已转化线索，或归在其他负责人名下"
              )}
            </p>
          </div>
          {!searchOpen && (
            <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
              <Plus size={14} className="mr-1.5" /> {t("ค้นหา", "Search", "搜索")}
            </Button>
          )}
        </div>
        {searchOpen && (
          <div className="relative mt-3">
            <Input
              autoFocus
              placeholder={t("ค้นหาเลขที่เอกสารหรือชื่อลูกค้า...", "Search doc no. or customer name...", "搜索单号或客户名称...")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length >= 2) setSearching(true);
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1 h-7"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setSearchResults(null);
              }}
            >
              {t("ปิด", "Close", "关闭")}
            </Button>
            {searchQuery.trim().length >= 2 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E8E5E0] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searching ? (
                  <div className="p-3 text-center text-xs text-[#9CA3AF]">
                    <Loader2 size={14} className="inline animate-spin mr-1.5" />
                    {t("กำลังค้นหา...", "Searching...", "搜索中...")}
                  </div>
                ) : searchResults && searchResults.length ? (
                  searchResults.map((r) => (
                    <button
                      key={r.quoteId}
                      type="button"
                      disabled={r.alreadyClaimed}
                      onClick={() => addManualRow(r)}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-[#F0EDE6] last:border-0 ${
                        r.alreadyClaimed ? "opacity-50 cursor-not-allowed" : "hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{r.docNo}</span>
                        <span className="font-medium">฿{fmtMoney(r.baseAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#6B6B6B] mt-0.5">
                        <span>{r.customerName} · {r.closedDate}</span>
                        {r.alreadyClaimed && <span className="text-red-500">{r.reason}</span>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-[#9CA3AF]">{t("ไม่พบ", "No results", "未找到结果")}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-[#FAF7F2] text-left text-xs font-semibold text-[#6B6B6B]">
              <th className="p-3 w-8" />
              <th className="p-3">{t("วันที่ปิด", "Closed", "成交日")}</th>
              <th className="p-3">{t("ลูกค้า", "Customer", "客户")}</th>
              <th className="p-3">{t("ช่องทาง", "Channel", "渠道")}</th>
              <th className="p-3 text-right">{t("ยอดฐาน", "Base", "基数")}</th>
              <th className="p-3 text-right w-28">{t("หักเพิ่มเติม", "Deduction", "额外扣除")}</th>
              <th className="p-3 text-right">{t("ยอดสุทธิ", "Net", "净额")}</th>
              <th className="p-3 text-right">{t("เรท", "Rate", "费率")}</th>
              <th className="p-3 text-right">{t("ค่าคอม", "Commission", "提成")}</th>
              <th className="p-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const rowBase = effectiveBase(o);
              const net = Math.max(0, rowBase - (deductions[o.leadId] || 0));
              const c = commissionById.get(o.leadId);
              const overridden = baseOverrides[o.leadId] != null;
              return (
                <tr key={o.leadId} className={`border-t border-[#F0EDE6] ${o.eligible ? "" : "bg-[#FAF7F2] text-[#9CA3AF]"}`}>
                  <td className="p-3">
                    <Checkbox
                      checked={!!selected[o.leadId]}
                      onCheckedChange={() => setSelected((s) => ({ ...s, [o.leadId]: !s[o.leadId] }))}
                      aria-label={t("เลือกออเดอร์", "Select order", "选择订单")}
                    />
                  </td>
                  <td className="p-3">{o.closedDate}</td>
                  <td className="p-3">
                    {o.customerName}
                    {!o.eligible && o.reason && <div className="text-[10px] text-red-500 mt-0.5">{o.reason}</div>}
                  </td>
                  <td className="p-3">{channelLabel(o.channel, t)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[#6B6B6B]">฿</span>
                      <Input
                        type="number"
                        className="w-28 h-8 text-right text-xs"
                        value={baseOverrides[o.leadId] ?? o.baseAmount}
                        onChange={(e) =>
                          setBaseOverrides((b) => ({ ...b, [o.leadId]: e.target.value === "" ? o.baseAmount : Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5 text-right">
                      {overridden
                        ? t(`เดิม ฿${fmtMoney(o.baseAmount)}`, `was ฿${fmtMoney(o.baseAmount)}`, `原为 ฿${fmtMoney(o.baseAmount)}`)
                        : o.baseIsEstimate
                          ? t("(ประมาณการ)", "(est.)", "(估)")
                          : ""}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Input
                      type="number"
                      className="w-24 h-8 text-right text-xs"
                      value={deductions[o.leadId] || ""}
                      placeholder="0"
                      onChange={(e) => setDeductions((d) => ({ ...d, [o.leadId]: Number(e.target.value) || 0 }))}
                    />
                  </td>
                  <td className="p-3 text-right tabular-nums">฿{fmtMoney(net)}</td>
                  <td className="p-3 text-right tabular-nums">{selected[o.leadId] && c ? `${(c.rate * 100).toFixed(1)}%` : "-"}</td>
                  <td className="p-3 text-right tabular-nums font-medium">{selected[o.leadId] && c ? `฿${fmtMoney(c.commission)}` : "-"}</td>
                  <td className="p-3" />
                </tr>
              );
            })}
            {manualRows.map((r) => {
              const net = Math.max(0, r.baseAmount - r.deduction);
              const c = commissionById.get(-r.quoteId);
              return (
                <tr key={`manual-${r.quoteId}`} className="border-t border-[#F0EDE6] bg-blue-50/40">
                  <td className="p-3">
                    <Checkbox
                      checked={r.selected}
                      onCheckedChange={() =>
                        setManualRows((rows) => rows.map((x) => (x.quoteId === r.quoteId ? { ...x, selected: !x.selected } : x)))
                      }
                      aria-label={t("เลือกออเดอร์", "Select order", "选择订单")}
                    />
                  </td>
                  <td className="p-3">{r.closedDate}</td>
                  <td className="p-3">
                    {r.customerName}
                    <div className="text-[10px] text-blue-600 mt-0.5">{t(`เพิ่มเอง · ${r.docNo}`, `Added manually · ${r.docNo}`, `手动添加 · ${r.docNo}`)}</div>
                  </td>
                  <td className="p-3">{channelLabel(r.channel, t)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[#6B6B6B]">฿</span>
                      <Input
                        type="number"
                        className="w-28 h-8 text-right text-xs"
                        value={r.baseAmount}
                        onChange={(e) =>
                          setManualRows((rows) =>
                            rows.map((x) => (x.quoteId === r.quoteId ? { ...x, baseAmount: Number(e.target.value) || 0 } : x))
                          )
                        }
                      />
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Input
                      type="number"
                      className="w-24 h-8 text-right text-xs"
                      value={r.deduction || ""}
                      placeholder="0"
                      onChange={(e) =>
                        setManualRows((rows) =>
                          rows.map((x) => (x.quoteId === r.quoteId ? { ...x, deduction: Number(e.target.value) || 0 } : x))
                        )
                      }
                    />
                  </td>
                  <td className="p-3 text-right tabular-nums">฿{fmtMoney(net)}</td>
                  <td className="p-3 text-right tabular-nums">{r.selected && c ? `${(c.rate * 100).toFixed(1)}%` : "-"}</td>
                  <td className="p-3 text-right tabular-nums font-medium">{r.selected && c ? `฿${fmtMoney(c.commission)}` : "-"}</td>
                  <td className="p-3 text-center">
                    <Button size="icon-sm" variant="ghost" onClick={() => setManualRows((rows) => rows.filter((x) => x.quoteId !== r.quoteId))}>
                      <Trash2 size={13} className="text-red-500" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && manualRows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-10 text-center text-sm text-[#9CA3AF]">
                  {t("ไม่มีออเดอร์ในช่วงนี้", "No orders in this period", "该期间没有订单")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#9CA3AF]">
            {t(
              `เลือกแล้ว ${selectedOrders.length + selectedManualRows.length} ออเดอร์ · ยอดสุทธิ`,
              `${selectedOrders.length + selectedManualRows.length} orders selected · net`,
              `已选 ${selectedOrders.length + selectedManualRows.length} 单 · 净额`
            )}
          </p>
          <p className="text-lg font-bold text-[#1A1A1A]">฿{fmtMoney(totalNet)}</p>
          {upcoming && (
            <p className="text-xs text-amber-600 mt-1">
              {t(
                `อีก ฿${fmtMoney(upcoming.min - totalNet)} ถึงเรท ${(upcoming.rate * 100).toFixed(1)}%`,
                `฿${fmtMoney(upcoming.min - totalNet)} more to reach ${(upcoming.rate * 100).toFixed(1)}%`,
                `还差 ฿${fmtMoney(upcoming.min - totalNet)} 达到 ${(upcoming.rate * 100).toFixed(1)}%`
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9CA3AF]">{t("ค่าคอมรวม", "Total commission", "总提成")}</p>
          <p className="text-2xl font-bold text-[#C8102E]">฿{fmtMoney(totalCommission)}</p>
        </div>
        <Button variant="outline" onClick={downloadQuotations} disabled={!selectedQuoteIds.length || pdfLoading}>
          {pdfLoading ? <Loader2 size={15} className="mr-1.5 animate-spin" /> : <FileDown size={15} className="mr-1.5" />}
          {t(`ดาวน์โหลดใบเสนอราคา (${selectedQuoteIds.length}/${selectedOrders.length})`, `Download quotations (${selectedQuoteIds.length}/${selectedOrders.length})`, `下载报价单 (${selectedQuoteIds.length}/${selectedOrders.length})`)}
        </Button>
        <Button onClick={save} disabled={(!selectedOrders.length && !selectedManualRows.length) || saving}>
          {saving ? <Loader2 size={15} className="mr-1.5 animate-spin" /> : null}
          {t("บันทึกเป็นร่าง", "Save as draft", "保存为草稿")}
        </Button>
      </div>

      {batchQuotes && batchQuotes.length > 0 && (
        <div id="batch-print-area">
          {batchQuotes.map((q) => (
            <div key={q.id} className="batch-print-page no-break">
              <QuoteDocument quote={q} />
            </div>
          ))}
        </div>
      )}

      {history && history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E5E0] text-sm font-semibold text-[#1A1A1A]">
            {t("ประวัติการคิดค่าคอม", "Commission history", "提成历史")}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF7F2] text-left text-xs font-semibold text-[#6B6B6B]">
                <th className="p-3">{t("ช่วงวันที่", "Period", "期间")}</th>
                <th className="p-3">{t("สถานะ", "Status", "状态")}</th>
                <th className="p-3 text-right">{t("ค่าคอม", "Commission", "提成")}</th>
                <th className="p-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-[#F0EDE6] cursor-pointer hover:bg-[#FAF7F2]"
                  onClick={() => router.push(`/admin/AdminFutai/sales-detail/commission?batch=${b.id}`)}
                >
                  <td className="p-3">{b.period_from} → {b.period_to}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[b.status].className}`}>
                      {t(STATUS_META[b.status].th, STATUS_META[b.status].en, STATUS_META[b.status].zh)}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums">฿{fmtMoney(b.total_commission)}</td>
                  <td className="p-3 text-[#9CA3AF]">#{b.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BatchViewer({ id, t, router }: { id: string; t: (th: string, en: string, zh: string) => string; router: ReturnType<typeof useRouter> }) {
  const [batch, setBatch] = useState<CommissionBatch | null>(null);
  const [splits, setSplits] = useState<CommissionSplit[]>([]);
  const [busy, setBusy] = useState(false);
  const { batchQuotes, loading: pdfLoading, printQuoteIds } = useQuoteBatchPdf();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/commission/batches/${id}`);
      const data = await res.json();
      if (!cancelled && res.ok) {
        setBatch(data.batch);
        setSplits(data.batch.commission_splits?.length ? data.batch.commission_splits : []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function changeStatus(status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/commission/batches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("ทำรายการไม่สำเร็จ", "Action failed", "操作失败"));
        return;
      }
      setBatch(data.batch);
    } finally {
      setBusy(false);
    }
  }

  async function saveSplits() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/commission/batches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splits }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
        return;
      }
      setBatch(data.batch);
      toast.success(t("บันทึกสัดส่วนแล้ว", "Split saved", "已保存分成"));
    } finally {
      setBusy(false);
    }
  }

  if (!batch) {
    return (
      <div className="py-16 text-center text-sm text-[#6B6B6B]">
        <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
        {t("กำลังโหลด...", "Loading...", "加载中...")}
      </div>
    );
  }

  const splitSum = splits.reduce((s, x) => s + (Number(x.percent) || 0), 0);

  const quoteIds = batch.commission_items.map(getItemSourceQuoteId).filter((id): id is number => id != null);

  async function downloadQuotations() {
    if (!quoteIds.length) {
      toast.error(t("ออเดอร์ในรอบนี้ไม่มีใบเสนอราคาอ้างอิงเลย", "None of this batch's orders have a linked quotation", "本批次订单均未关联报价单"));
      return;
    }
    const result = await printQuoteIds(quoteIds);
    if (!result.ok) toast.error(t("โหลดใบเสนอราคาไม่สำเร็จ", "Failed to load quotations", "加载报价单失败"));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 no-print">
        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/AdminFutai/sales-detail/commission?owner=${encodeURIComponent(batch.owner)}`)}>
          <ArrowLeft size={14} className="mr-1.5" /> {t("กลับไปเลือกออเดอร์", "Back to selector", "返回选单")}
        </Button>
        <div className="flex items-center gap-2">
          {batch.status === "draft" && (
            <>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => changeStatus("cancelled")} disabled={busy}>
                {t("ยกเลิกรอบนี้", "Cancel batch", "取消批次")}
              </Button>
              <Button size="sm" onClick={() => changeStatus("approved")} disabled={busy}>
                {t("อนุมัติ", "Approve", "批准")}
              </Button>
            </>
          )}
          {batch.status === "approved" && (
            <Button size="sm" onClick={() => changeStatus("paid")} disabled={busy}>
              {t("บันทึกว่าจ่ายแล้ว", "Mark as paid", "标记为已发放")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={downloadQuotations} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileDown size={14} className="mr-1.5" />}
            {t(`ดาวน์โหลดใบเสนอราคา (${quoteIds.length})`, `Download quotations (${quoteIds.length})`, `下载报价单 (${quoteIds.length})`)}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer size={14} className="mr-1.5" /> {t("พิมพ์ / PDF", "Print / PDF", "打印/PDF")}
          </Button>
        </div>
      </div>

      <div id="print-area" className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1A1A1A]">{t("รอบคิดค่าคอมมิชชั่น", "Commission Batch", "提成批次")} #{batch.id}</h1>
            <p className="text-sm text-[#6B6B6B]">
              {batch.owner} · {batch.period_from} → {batch.period_to} ·{" "}
              {t(batch.mode === "cumulative" ? "รวมทั้งรอบ" : "ต่อออเดอร์", batch.mode === "cumulative" ? "Cumulative" : "Per order", batch.mode === "cumulative" ? "累计" : "按单")}
            </p>
          </div>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_META[batch.status].className}`}>
            {t(STATUS_META[batch.status].th, STATUS_META[batch.status].en, STATUS_META[batch.status].zh)}
          </span>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[#6B6B6B] border-b border-[#1A1A1A]">
              <th className="py-1.5 pr-2 w-8">#</th>
              <th className="py-1.5 pr-2">{t("วันที่ปิด", "Closed", "成交日")}</th>
              <th className="py-1.5 pr-2">{t("ลูกค้า", "Customer", "客户")}</th>
              <th className="py-1.5 pr-2 text-right">{t("ยอดฐาน", "Base", "基数")}</th>
              <th className="py-1.5 pr-2 text-right">{t("หัก", "Deduct", "扣除")}</th>
              <th className="py-1.5 pr-2 text-right">{t("เรท", "Rate", "费率")}</th>
              <th className="py-1.5 pl-2 text-right">{t("ค่าคอม", "Commission", "提成")}</th>
            </tr>
          </thead>
          <tbody>
            {batch.commission_items.map((it, i) => (
              <tr key={it.id} className="border-b border-[#F0EDE6]">
                <td className="py-1.5 pr-2 text-[#9CA3AF]">{i + 1}</td>
                <td className="py-1.5 pr-2">{it.closed_date}</td>
                <td className="py-1.5 pr-2">{it.customer_name}</td>
                <td className="py-1.5 pr-2 text-right">฿{fmtMoney(it.base_amount)}</td>
                <td className="py-1.5 pr-2 text-right">{it.deduction ? `฿${fmtMoney(it.deduction)}` : "-"}</td>
                <td className="py-1.5 pr-2 text-right">{(it.rate * 100).toFixed(1)}%</td>
                <td className="py-1.5 pl-2 text-right font-medium">฿{fmtMoney(it.commission)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t-2 border-[#1A1A1A]">
              <td className="py-2" colSpan={6} />
              <td className="py-2 pl-2 text-right">฿{fmtMoney(batch.total_commission)}</td>
            </tr>
          </tfoot>
        </table>

        {splits.length > 0 && (
          <div className="pt-2 border-t border-[#F0EDE6]">
            <p className="text-xs font-semibold text-[#6B6B6B] mb-1.5">{t("แบ่งตามสัดส่วน", "Split by share", "按比例分成")}</p>
            {splits.map((s, i) => (
              <p key={i} className="text-xs text-[#1A1A1A]">
                {s.person}: {s.percent}% = ฿{fmtMoney((batch.total_commission * s.percent) / 100)}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 no-print">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-2">
          {t('แบ่งค่าคอมของ "', 'Split commission for "', '分成 "')}{batch.owner}{t('"', '"', '"')}
        </p>
        <p className="text-xs text-[#9CA3AF] mb-3">
          {t(
            "ยังไม่บังคับใส่ — ถ้าไม่ใส่ ระบบจะเก็บค่าคอมรวมไว้ที่ชื่อนี้เฉยๆ โดยไม่หารแบ่งคน",
            "Optional — leave empty to keep the total under this owner name without splitting it between people.",
            "非必填 — 留空则总提成只记在此名下，不按人拆分"
          )}
        </p>
        <div className="space-y-2">
          {splits.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="flex-1 h-9"
                placeholder={t("ชื่อคน", "Person", "姓名")}
                value={s.person}
                onChange={(e) => setSplits((arr) => arr.map((x, idx) => (idx === i ? { ...x, person: e.target.value } : x)))}
              />
              <Input
                type="number"
                className="w-24 h-9"
                placeholder="%"
                value={s.percent || ""}
                onChange={(e) => setSplits((arr) => arr.map((x, idx) => (idx === i ? { ...x, percent: Number(e.target.value) || 0 } : x)))}
              />
              <Button size="icon-sm" variant="outline" onClick={() => setSplits((arr) => arr.filter((_, idx) => idx !== i))}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <Button size="sm" variant="outline" onClick={() => setSplits((arr) => [...arr, { person: "", percent: 0 }])}>
              <Plus size={14} className="mr-1.5" /> {t("เพิ่มคน", "Add person", "添加")}
            </Button>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${Math.abs(splitSum - 100) < 0.01 || !splits.length ? "text-[#9CA3AF]" : "text-red-500"}`}>
                {t(`รวม ${splitSum}%`, `Sum ${splitSum}%`, `合计 ${splitSum}%`)}
              </span>
              <Button size="sm" onClick={saveSplits} disabled={busy}>
                {t("บันทึกสัดส่วน", "Save split", "保存分成")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {batchQuotes && batchQuotes.length > 0 && (
        <div id="batch-print-area">
          {batchQuotes.map((q) => (
            <div key={q.id} className="batch-print-page no-break">
              <QuoteDocument quote={q} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommissionPage() {
  return (
    <Suspense fallback={null}>
      <CommissionInner />
    </Suspense>
  );
}
