"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/store/language";
import {
  STATUS_META, STATUS_ORDER, CHANNEL_META, DOC_LABELS, computeDepositAmount, fmtMoney,
} from "@/lib/saved-quote-options";
import type { SavedQuote, SavedQuoteStatus } from "@/types";

type Row = Pick<
  SavedQuote,
  | "id" | "doc_type" | "doc_no" | "customer_name" | "doc_date" | "status" | "channel"
  | "shipping_date" | "shipping_address" | "contact_person" | "contact_phone"
  | "items" | "discount_pct" | "vat_pct" | "deposit_pct" | "updated_at"
>;

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
      </div>

      {r.shipping_address && <p className="text-xs text-[#6B6B6B] line-clamp-2">{r.shipping_address}</p>}
      {(r.contact_person || r.contact_phone) && (
        <div className="bg-white rounded-md px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-[#9CA3AF]">{t("ผู้รับ", "Recipient", "收件人")}</p>
          <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{r.contact_person || "-"}</p>
          {r.contact_phone && <p className="text-sm font-mono font-semibold text-[#1A1A1A] leading-tight">{r.contact_phone}</p>}
        </div>
      )}
      {deposit > 0 && (
        <p className="text-xs font-medium text-[#1A1A1A]">
          {t("มัดจำ", "Deposit", "定金")}: ฿{fmtMoney(deposit)} ({r.deposit_pct}%)
        </p>
      )}

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
            <div className="p-3 max-h-[55vh] overflow-y-auto">
              {awaitingShipment.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] text-center py-6">{t("ไม่มีรายการ", "No items", "暂无")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {awaitingShipment.map((r) => (
                    <QuoteCard key={r.id} r={r} t={t} onStatusChange={updateStatus} />
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
