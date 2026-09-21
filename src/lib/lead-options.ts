import type { LeadChannel, LeadContactMethod, LeadSegment, LeadStatus, YesNoUnknown } from "@/types";

export const CHANNELS: { value: LeadChannel; th: string; en: string; zh: string; color: string }[] = [
  { value: "facebook", th: "Facebook", en: "Facebook", zh: "Facebook", color: "#1877F2" },
  { value: "shopee",   th: "Shopee",   en: "Shopee",   zh: "Shopee",   color: "#EE4D2D" },
  { value: "tiktok",   th: "TikTok",   en: "TikTok",   zh: "TikTok",   color: "#111111" },
  { value: "line",     th: "LINE",     en: "LINE",     zh: "LINE",     color: "#06C755" },
  { value: "other",    th: "อื่นๆ",     en: "Other",    zh: "其他",     color: "#9CA3AF" },
];

export const STATUSES: { value: LeadStatus; th: string; en: string; zh: string; color: string }[] = [
  { value: "new",            th: "⭕ ยังไม่เคยติดตาม",     en: "⭕ Not followed up yet",    zh: "⭕ 尚未跟进",       color: "bg-[#E8E5E0] text-[#6B6B6B]" },
  { value: "followed_1",     th: "🟡 ติดตามแล้ว 1 ครั้ง",  en: "🟡 Followed up once",       zh: "🟡 已跟进1次",      color: "bg-yellow-100 text-yellow-700" },
  { value: "followed_2plus", th: "🟠 ติดตามแล้ว 2+ ครั้ง", en: "🟠 Followed up 2+ times",   zh: "🟠 已跟进2次以上",  color: "bg-orange-100 text-orange-700" },
  { value: "engaged",        th: "🟢 ตอบรับแล้ว",          en: "🟢 Responded",              zh: "🟢 已回应",         color: "bg-green-100 text-green-700" },
  { value: "quoted",         th: "✅ ส่งใบเสนอราคาแล้ว",   en: "✅ Quote sent",             zh: "✅ 已发送报价单",   color: "bg-blue-100 text-blue-700" },
  { value: "converted",      th: "🎯 ปิดการขาย",           en: "🎯 Converted",              zh: "🎯 成交",           color: "bg-emerald-600 text-white" },
  { value: "lost",           th: "❌ เสียลูกค้า",          en: "❌ Lost",                   zh: "❌ 流失",           color: "bg-red-100 text-red-700" },
];

export const CONTACT_METHODS: { value: LeadContactMethod; th: string; en: string; zh: string }[] = [
  { value: "line",      th: "LINE",       en: "LINE",       zh: "LINE" },
  { value: "phone",     th: "โทรศัพท์",   en: "Phone",      zh: "电话" },
  { value: "email",     th: "อีเมล",      en: "Email",      zh: "邮箱" },
  { value: "messenger", th: "Messenger",  en: "Messenger",  zh: "Messenger" },
  { value: "wechat",    th: "WeChat",     en: "WeChat",     zh: "微信" },
];

export const YES_NO_UNKNOWN: { value: YesNoUnknown; th: string; en: string; zh: string }[] = [
  { value: "yes",     th: "ใช่",         en: "Yes",     zh: "是" },
  { value: "no",      th: "ไม่ใช่",      en: "No",      zh: "否" },
  { value: "unknown", th: "ยังไม่ทราบ",  en: "Unknown", zh: "未知" },
];

export const SEGMENTS: { value: LeadSegment; th: string; en: string; zh: string }[] = [
  { value: "b2b", th: "B2B (องค์กร/SME)", en: "B2B (Enterprise/SME)", zh: "B2B（企业/中小企业）" },
  { value: "b2c", th: "B2C (ผู้บริโภค)",  en: "B2C (Consumer)",       zh: "B2C（消费者）" },
];

export const LOST_REASONS: { value: string; th: string; en: string; zh: string }[] = [
  { value: "price",            th: "ราคา",           en: "Price",             zh: "价格" },
  { value: "not_interested",   th: "ไม่สนใจแล้ว",    en: "No longer interested", zh: "不再感兴趣" },
  { value: "bought_elsewhere", th: "ซื้อที่อื่น",     en: "Bought elsewhere",  zh: "在别处购买" },
  { value: "other",            th: "อื่นๆ",           en: "Other",             zh: "其他" },
];

export function statusMeta(status: LeadStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}
