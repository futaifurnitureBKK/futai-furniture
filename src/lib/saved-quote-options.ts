import type { SavedQuoteDocType, SavedQuoteStatus, SavedQuoteChannel, SavedQuoteItem, PaymentMethod, PaymentType } from "@/types";

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

// Who's assigned to look after this order — a fixed roster the company
// keeps, not free text, so it stays consistent across quotes.
export const SALESPEOPLE = ["Jacob", "Kan", "Xiaoying", "P'Jane", "P'NEE"];

export const PAYMENT_METHOD_META: Record<PaymentMethod, TriText> = {
  cash:        { th: "เงินสด",     en: "Cash",           zh: "现金" },
  transfer:    { th: "โอนเงิน",    en: "Bank Transfer",  zh: "银行转账" },
  credit_card: { th: "บัตรเครดิต", en: "Credit Card",    zh: "信用卡" },
  cheque:      { th: "เช็ค",       en: "Cheque",         zh: "支票" },
  alipay:      { th: "Alipay",     en: "Alipay",         zh: "支付宝" },
  wechat:      { th: "WeChat Pay", en: "WeChat Pay",     zh: "微信支付" },
  other:       { th: "อื่นๆ",      en: "Other",          zh: "其他" },
};
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["cash", "transfer", "credit_card", "cheque", "alipay", "wechat", "other"];

export const PAYMENT_TYPE_META: Record<PaymentType, TriText> = {
  deposit:    { th: "เงินมัดจำ",       en: "Deposit",           zh: "定金" },
  additional: { th: "ชำระเพิ่มเติม",   en: "Additional Payment", zh: "追加付款" },
  full:       { th: "ชำระเต็มจำนวน",   en: "Full Payment",      zh: "全额付款" },
  other:      { th: "อื่นๆ",           en: "Other",             zh: "其他" },
};
export const PAYMENT_TYPE_ORDER: PaymentType[] = ["deposit", "additional", "full", "other"];

// Mirrors the pricing math in quote-builder: subtotal -> discount -> VAT ->
// grand total. Kept here so any page listing saved quotes can show totals
// without re-deriving the formula.
export function computeGrandTotal(items: SavedQuoteItem[], discountPct: number, vatPct: number): number {
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const afterDiscount = subtotal - subtotal * (discountPct / 100);
  return afterDiscount + afterDiscount * (vatPct / 100);
}

export function computeDepositAmount(
  items: SavedQuoteItem[],
  discountPct: number,
  vatPct: number,
  depositPct: number
): number {
  return computeGrandTotal(items, discountPct, vatPct) * (depositPct / 100);
}

export function fmtMoney(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
