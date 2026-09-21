import type { SavedQuoteDocType, SavedQuoteStatus, SavedQuoteChannel, SavedQuoteItem } from "@/types";

export interface TriText {
  th: string;
  en: string;
  zh: string;
}

export const DOC_LABELS: Record<SavedQuoteDocType, TriText & { prefix: string }> = {
  quotation:     { th: "ใบเสนอราคา", en: "QUOTATION",      zh: "报价单", prefix: "QT" },
  invoice:       { th: "ใบแจ้งหนี้", en: "INVOICE",        zh: "发票",   prefix: "IV" },
  delivery_note: { th: "ใบส่งของ",   en: "DELIVERY NOTE",  zh: "送货单", prefix: "DN" },
};

export const STATUS_META: Record<SavedQuoteStatus, { th: string; en: string; zh: string; color: string }> = {
  pending:            { th: "รอการตอบกลับ",       en: "Awaiting Response", zh: "待回复",     color: "bg-[#E8E5E0] text-[#6B6B6B]" },
  in_progress:        { th: "กำลังดำเนินการ",     en: "In Progress",       zh: "进行中",     color: "bg-blue-100 text-blue-700" },
  confirmed:          { th: "คอนเฟิร์ม/รอชำระ",   en: "Confirmed / Awaiting Payment", zh: "已确认/待付款", color: "bg-yellow-100 text-yellow-700" },
  awaiting_shipment:  { th: "รอจัดส่ง",           en: "Awaiting Shipment", zh: "待发货",     color: "bg-purple-100 text-purple-700" },
  completed:          { th: "จัดส่งเสร็จแล้ว",     en: "Shipped / Completed", zh: "已发货/完成", color: "bg-green-100 text-green-700" },
};
export const STATUS_ORDER: SavedQuoteStatus[] = ["pending", "in_progress", "confirmed", "awaiting_shipment", "completed"];

export const CHANNEL_META: Record<SavedQuoteChannel, { th: string; en: string; zh: string; color: string }> = {
  facebook: { th: "Facebook", en: "Facebook", zh: "Facebook", color: "bg-blue-100 text-blue-700" },
  shopee:   { th: "Shopee",   en: "Shopee",   zh: "Shopee",   color: "bg-orange-100 text-orange-700" },
  tiktok:   { th: "TikTok",   en: "TikTok",   zh: "TikTok",   color: "bg-[#1A1A1A]/10 text-[#1A1A1A]" },
  other:    { th: "อื่นๆ",    en: "Other",    zh: "其他",     color: "bg-[#E8E5E0] text-[#6B6B6B]" },
};
export const CHANNEL_ORDER: SavedQuoteChannel[] = ["facebook", "shopee", "tiktok", "other"];

// Mirrors the pricing math in quote-builder: subtotal -> discount -> VAT ->
// grand total -> deposit. Kept here so any page listing saved quotes can
// show the deposit amount without re-deriving the formula.
export function computeDepositAmount(
  items: SavedQuoteItem[],
  discountPct: number,
  vatPct: number,
  depositPct: number
): number {
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const afterDiscount = subtotal - subtotal * (discountPct / 100);
  const grandTotal = afterDiscount + afterDiscount * (vatPct / 100);
  return grandTotal * (depositPct / 100);
}

export function fmtMoney(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
