"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Printer, UserRound, FileText, MapPin, CalendarDays, Phone, CheckCircle2, Search, ChevronRight, StickyNote } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/store/language";
import {
  STATUS_META, STATUS_ORDER, CHANNEL_META, DOC_LABELS, PAYMENT_TYPE_META,
  computeDepositAmount, computeGrandTotal, fmtMoney,
} from "@/lib/saved-quote-options";
import type { SavedQuote, SavedQuoteStatus, SavedQuotePayment } from "@/types";

type PaymentRow = Pick<SavedQuotePayment, "id" | "paid_date" | "amount" | "percent" | "payment_type" | "method" | "slip_url">;

type Row = Pick<
  SavedQuote,
  | "id" | "doc_type" | "doc_no" | "customer_name" | "doc_date" | "status" | "channel"
  | "shipping_date" | "shipping_address" | "contact_person" | "contact_phone" | "salesperson" | "notes"
  | "items" | "discount_pct" | "vat_pct" | "deposit_pct" | "updated_at"
> & { saved_quote_payments: PaymentRow[] };

// The "awaiting shipment" status is what this page exists to answer, so it
// gets a full-width band up top; everything else sits in a row underneath.
const OTHER_STATUSES = STATUS_ORDER.filter((s) => s !== "awaiting_shipment");

// Defined at module scope (not inside ShippingPage) so it keeps a stable
// component identity across re-renders — nesting it in the page body made
// every card (and its Select) remount whenever rows/loading changed, which
// is why the status dropdown would flash the raw enum value instead of its
// translated label.
function QuoteCard({
  r,
  t,
  onStatusChange,
}: {
  r: Row;
  t: (th: string, en: string, zh?: string) => string;
  onStatusChange: (id: number, status: SavedQuoteStatus) => void;
}) {
  const deposit = computeDepositAmount(r.items, r.discount_pct, r.vat_pct, r.deposit_pct);
  return (
    <div className="bg-[#FAF7F2] rounded-lg p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{r.customer_name || "-"}</p>
          <p className="text-[10px] text-[#9CA3AF] font-mono">{r.doc_no}</p>
        </div>
        <Link href={`/admin/quote-builder?open=${r.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
          {t("เปิด", "Open", "打开")}
        </Link>
      </div>

      {r.shipping_date && (
        <p className="text-sm font-bold text-purple-700">
          {t("กำหนดส่ง", "Ship by", "发货日期")}: {r.shipping_date}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#6B6B6B]">
        <span className="bg-white rounded px-1.5 py-0.5">{t(DOC_LABELS[r.doc_type].th, DOC_LABELS[r.doc_type].en, DOC_LABELS[r.doc_type].zh)}</span>
        <span className="bg-white rounded px-1.5 py-0.5">{t(CHANNEL_META[r.channel].th, CHANNEL_META[r.channel].en, CHANNEL_META[r.channel].zh)}</span>
        <span className="bg-white rounded px-1.5 py-0.5">
          {t("สร้าง", "Created", "创建")} {r.doc_date}
        </span>
        {r.salesperson && (
          <span className="bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 inline-flex items-center gap-1 font-medium">
            <UserRound size={10} /> {r.salesperson}
          </span>
        )}
      </div>

      {r.shipping_address && <p className="text-xs text-[#6B6B6B] line-clamp-2">{r.shipping_address}</p>}
      {(r.contact_person || r.contact_phone) && (
        <div className="bg-white rounded-md px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-[#9CA3AF]">{t("ผู้รับ", "Recipient", "收件人")}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{r.contact_person || "-"}</p>
            {r.contact_phone && <p className="text-sm font-mono font-semibold text-[#1A1A1A] leading-tight">{r.contact_phone}</p>}
          </div>
        </div>
      )}
      {deposit > 0 && (
        <p className="text-xs font-medium text-[#1A1A1A]">
          {t("มัดจำ", "Deposit", "定金")}: ฿{fmtMoney(deposit)} ({r.deposit_pct}%)
        </p>
      )}

      {r.saved_quote_payments && r.saved_quote_payments.length > 0 && (
        <div className="bg-emerald-50 rounded-md px-2 py-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase tracking-wide text-emerald-700/70">{t("ชำระเงินแล้ว", "Paid", "已付款")}</p>
            <p className="text-xs font-bold text-emerald-700">
              ฿{fmtMoney(r.saved_quote_payments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {r.saved_quote_payments
              .filter((p) => p.slip_url)
              .map((p) => (
                <a
                  key={p.id}
                  href={p.slip_url as string}
                  target="_blank"
                  rel="noreferrer"
                  title={`฿${fmtMoney(p.amount)} · ${p.paid_date} · ${t(PAYMENT_TYPE_META[p.payment_type].th, PAYMENT_TYPE_META[p.payment_type].en, PAYMENT_TYPE_META[p.payment_type].zh)}`}
                  className="relative w-9 h-9 rounded overflow-hidden border border-white shadow-sm shrink-0 hover:opacity-80 transition-opacity"
                >
                  <Image src={p.slip_url as string} alt="" fill sizes="36px" className="object-cover" />
                </a>
              ))}
          </div>
        </div>
      )}

      {r.notes && <p className="text-xs text-[#6B6B6B] line-clamp-2 italic">{r.notes}</p>}

      <div className="flex items-center gap-1.5">
      <Select value={r.status} onValueChange={(v) => onStatusChange(r.id, v as SavedQuoteStatus)}>
        <SelectTrigger
          size="sm"
          className={`flex-1 h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${STATUS_META[r.status].color}`}
        >
          <SelectValue>{(v: SavedQuoteStatus) => t(STATUS_META[v].th, STATUS_META[v].en, STATUS_META[v].zh)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {t(STATUS_META[s].th, STATUS_META[s].en, STATUS_META[s].zh)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link
        href={`/admin/quote-builder?open=${r.id}&print=1`}
        className={buttonVariants({ size: "icon-sm", variant: "outline" })}
        title={t("ปริ้นใบส่งของ", "Print Delivery Note", "打印送货单")}
      >
        <Printer size={13} />
      </Link>
      </div>
    </div>
  );
}

// Richer card just for the "awaiting shipment" band — that's the status
// this whole page exists to answer, so it gets the full order-summary
// treatment (totals, payment evidence, contacts) instead of the compact
// tile used for the other columns.
function AwaitingShipmentCard({
  r,
  t,
  onStatusChange,
}: {
  r: Row;
  t: (th: string, en: string, zh?: string) => string;
  onStatusChange: (id: number, status: SavedQuoteStatus) => void;
}) {
  const grandTotal = computeGrandTotal(r.items, r.discount_pct, r.vat_pct);
  const totalPaid = r.saved_quote_payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(grandTotal - totalPaid, 0);
  const paidPct = grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0;
  const remainingPct = grandTotal > 0 ? 100 - paidPct : 0;
  const sortedPayments = [...r.saved_quote_payments].sort((a, b) => (a.paid_date < b.paid_date ? 1 : -1));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E8E5E0] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide text-[#9CA3AF]">{t("เลขที่ใบสั่งซื้อ", "Order No.", "订单号")}</p>
            <p className="text-sm font-bold text-[#1A1A1A] font-mono truncate">{r.doc_no}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <Select value={r.status} onValueChange={(v) => onStatusChange(r.id, v as SavedQuoteStatus)}>
            <SelectTrigger
              size="sm"
              className={`h-auto min-h-0 rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${STATUS_META[r.status].color}`}
            >
              <SelectValue>{(v: SavedQuoteStatus) => t(STATUS_META[v].th, STATUS_META[v].en, STATUS_META[v].zh)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(STATUS_META[s].th, STATUS_META[s].en, STATUS_META[s].zh)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-[#9CA3AF] mt-1">{t("สร้างเมื่อ", "Created", "创建于")} {r.doc_date}</p>
          {r.salesperson && <p className="text-[9px] text-indigo-600 font-medium">{t("โดย", "By", "由")} {r.salesperson}</p>}
        </div>
      </div>

      <div>
        <p className="text-base font-bold text-[#1A1A1A] leading-snug truncate">{r.customer_name || "-"}</p>
        {r.shipping_address && (
          <p className="text-xs text-[#9CA3AF] flex items-start gap-1 mt-0.5">
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-1">{r.shipping_address}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {r.shipping_date && (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 rounded-full px-2.5 py-1 text-[11px] font-semibold">
            <CalendarDays size={11} /> {t("กำหนดส่ง", "Ship by", "发货日期")}: {r.shipping_date}
          </span>
        )}
        <span className="inline-flex items-center gap-1 bg-[#F5F3EF] border border-[#E8E5E0] rounded-full px-2.5 py-1 text-[11px] text-[#6B6B6B]">
          {t(DOC_LABELS[r.doc_type].th, DOC_LABELS[r.doc_type].en, DOC_LABELS[r.doc_type].zh)}
        </span>
        <span className="inline-flex items-center gap-1 bg-[#F5F3EF] border border-[#E8E5E0] rounded-full px-2.5 py-1 text-[11px] text-[#6B6B6B]">
          {t(CHANNEL_META[r.channel].th, CHANNEL_META[r.channel].en, CHANNEL_META[r.channel].zh)}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#E8E5E0] border border-[#E8E5E0] rounded-xl overflow-hidden text-center">
        <div className="p-2.5">
          <p className="text-[9px] text-[#9CA3AF]">{t("ยอดสั่งซื้อทั้งหมด", "Total Order", "订单总额")}</p>
          <p className="text-base font-bold text-[#1A1A1A]">฿{fmtMoney(grandTotal)}</p>
          <p className="text-[8.5px] text-[#9CA3AF]">{t("(รวมภาษีแล้ว)", "(incl. tax)", "（含税）")}</p>
        </div>
        <div className="p-2.5 bg-emerald-50">
          <p className="text-[9px] text-emerald-700/70">{t("ชำระแล้ว", "Paid", "已付款")}</p>
          <p className="text-base font-bold text-emerald-700">฿{fmtMoney(totalPaid)}</p>
          <p className="text-[8.5px] text-emerald-700/70">({paidPct}%)</p>
        </div>
        <div className="p-2.5 bg-red-50">
          <p className="text-[9px] text-red-700/70">{t("ค้างชำระ", "Outstanding", "尚欠")}</p>
          <p className="text-base font-bold text-red-700">฿{fmtMoney(remaining)}</p>
          <p className="text-[8.5px] text-red-700/70">({remainingPct}%)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#FAF7F2] rounded-xl px-2.5 py-2">
          <p className="text-[8.5px] uppercase tracking-wide text-[#9CA3AF] flex items-center gap-1">
            <UserRound size={10} /> {t("ผู้รับ / ผู้ติดต่อ", "Recipient", "收件人")}
          </p>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className="text-sm font-bold text-[#1A1A1A] truncate">{r.contact_person || "-"}</p>
            {r.contact_phone && (
              <a
                href={`tel:${r.contact_phone}`}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#6B6B6B] shrink-0"
                title={r.contact_phone}
              >
                <Phone size={11} />
              </a>
            )}
          </div>
          {r.contact_phone && <p className="text-xs font-mono text-[#6B6B6B]">{r.contact_phone}</p>}
        </div>
        <div className="bg-[#FAF7F2] rounded-xl px-2.5 py-2">
          <p className="text-[8.5px] uppercase tracking-wide text-[#9CA3AF] flex items-center gap-1">
            <UserRound size={10} /> {t("ผู้ดูแลออเดอร์", "Order Owner", "负责人")}
          </p>
          <p className="text-sm font-bold text-[#1A1A1A] mt-0.5 truncate">{r.salesperson || "-"}</p>
        </div>
      </div>

      {sortedPayments.length > 0 ? (
        <div className="bg-emerald-50 rounded-xl p-2.5 space-y-1.5">
          <p className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" /> {t("หลักฐานการชำระเงิน", "Payment Evidence", "付款凭证")}
          </p>
          {sortedPayments.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 bg-white/70 rounded-lg p-1.5">
              {p.slip_url ? (
                <a
                  href={p.slip_url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm shrink-0"
                >
                  <Image src={p.slip_url} alt="" fill sizes="40px" className="object-cover" />
                </a>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#F5F3EF] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#1A1A1A]">
                  ฿{fmtMoney(p.amount)}{p.percent != null && ` (${p.percent}%)`}
                </p>
                <p className="text-[10px] text-emerald-700">
                  {p.paid_date} · {t(PAYMENT_TYPE_META[p.payment_type].th, PAYMENT_TYPE_META[p.payment_type].en, PAYMENT_TYPE_META[p.payment_type].zh)}
                </p>
              </div>
              {p.slip_url && (
                <a
                  href={p.slip_url}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ size: "icon-sm", variant: "outline", className: "shrink-0" })}
                  title={t("ดูหลักฐาน", "View", "查看")}
                >
                  <Search size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#F5F3EF] rounded-xl p-2.5 text-center text-xs text-[#9CA3AF]">
          {t("ยังไม่มีการบันทึกการชำระเงิน", "No payment recorded yet", "尚无付款记录")}
        </div>
      )}

      <div className="bg-[#FAF7F2] rounded-xl px-2.5 py-2">
        <p className="text-[8.5px] uppercase tracking-wide text-[#9CA3AF] flex items-center gap-1">
          <StickyNote size={10} /> {t("หมายเหตุ", "Note", "备注")}
        </p>
        <p className="text-xs text-[#1A1A1A] mt-0.5 whitespace-pre-line line-clamp-3">{r.notes || "-"}</p>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <Link
          href={`/admin/quote-builder?open=${r.id}&print=1`}
          className={buttonVariants({ variant: "outline", className: "flex-1" })}
        >
          <Printer size={14} className="mr-1.5" /> {t("พิมพ์", "Print", "打印")}
        </Link>
        <Link
          href={`/admin/quote-builder?open=${r.id}`}
          className={buttonVariants({ className: "flex-1 bg-[#1A1A1A] text-white hover:bg-black" })}
        >
          {t("จัดการคำสั่งซื้อ", "Manage Order", "管理订单")} <ChevronRight size={14} className="ml-1" />
        </Link>
      </div>
    </div>
  );
}

export default function ShippingPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRows(showSpinner: boolean) {
      if (showSpinner && !cancelled) setLoading(true);
      const res = await fetch("/api/admin/saved-quotes");
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setRows(data.quotes);
        setLoading(false);
      }
    }

    fetchRows(true);

    // Status is often changed from quote-builder on a different tab or a
    // previous visit to this page — refetch whenever the tab regains focus
    // instead of trusting whatever we last loaded.
    function onFocus() {
      fetchRows(false);
    }
    function onVisibility() {
      if (document.visibilityState === "visible") fetchRows(false);
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function updateStatus(id: number, status: SavedQuoteStatus) {
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await fetch(`/api/admin/saved-quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setRows(prev);
  }

  const awaitingShipment = useMemo(
    () =>
      rows
        .filter((r) => r.status === "awaiting_shipment")
        .sort((a, b) => (a.shipping_date || "9999").localeCompare(b.shipping_date || "9999")),
    [rows]
  );

  const otherColumns = useMemo(
    () => OTHER_STATUSES.map((s) => ({ key: s, rows: rows.filter((r) => r.status === s) })),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("จัดส่งสินค้า", "Shipping", "发货")}</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          {t(
            "ติดตามสถานะใบเสนอราคา/ใบแจ้งหนี้/ใบส่งของ ตั้งแต่รอตอบกลับจนถึงจัดส่งเสร็จ",
            "Track quotation/invoice/delivery note status from awaiting response through to shipped",
            "跟踪报价单/发票/送货单状态，从待回复到发货完成"
          )}
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">
          {t("กำลังโหลด...", "Loading...", "加载中...")}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">
          {t(
            'ยังไม่มีเอกสาร — สร้างได้ที่หน้า "สร้างใบเสนอราคา"',
            'No documents yet — create one from "Quote Builder"',
            '暂无文件 — 请到"生成报价单"页面创建'
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Awaiting shipment — full width, top */}
          <div className="rounded-xl border-2 border-purple-300 bg-white overflow-hidden">
            <div className={`px-4 py-3 flex items-center justify-between ${STATUS_META.awaiting_shipment.color}`}>
              <p className="text-base font-bold">
                {t(STATUS_META.awaiting_shipment.th, STATUS_META.awaiting_shipment.en, STATUS_META.awaiting_shipment.zh)}
              </p>
              <span className="text-xs font-bold bg-black/10 rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                {awaitingShipment.length}
              </span>
            </div>
            <div className="p-3 max-h-[85vh] overflow-y-auto">
              {awaitingShipment.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] text-center py-6">{t("ไม่มีรายการ", "No items", "暂无")}</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {awaitingShipment.map((r) => (
                    <AwaitingShipmentCard key={r.id} r={r} t={t} onStatusChange={updateStatus} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Other statuses — row underneath */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {otherColumns.map((col) => {
              const meta = STATUS_META[col.key];
              return (
                <div key={col.key} className="rounded-xl border overflow-hidden bg-white">
                  <div className={`px-4 py-2.5 flex items-center justify-between ${meta.color}`}>
                    <p className="text-sm font-semibold">{t(meta.th, meta.en, meta.zh)}</p>
                    <span className="text-xs font-bold bg-black/10 rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                      {col.rows.length}
                    </span>
                  </div>
                  <div className="p-2.5 space-y-2.5 max-h-[60vh] overflow-y-auto">
                    {col.rows.length === 0 ? (
                      <p className="text-xs text-[#9CA3AF] text-center py-6">{t("ไม่มีรายการ", "No items", "暂无")}</p>
                    ) : (
                      col.rows.map((r) => <QuoteCard key={r.id} r={r} t={t} onStatusChange={updateStatus} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
