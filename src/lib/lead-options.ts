import type { LeadChannel, LeadContactMethod, LeadSegment, LeadStatus, YesNoUnknown } from "@/types";

export const CHANNELS: { value: LeadChannel; label: string; color: string }[] = [
  { value: "facebook", label: "Facebook", color: "#1877F2" },
  { value: "shopee",   label: "Shopee",   color: "#EE4D2D" },
  { value: "tiktok",   label: "TikTok",   color: "#111111" },
  { value: "line",     label: "LINE",     color: "#06C755" },
  { value: "other",    label: "อื่นๆ",     color: "#9CA3AF" },
];

export const STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new",            label: "⭕ ยังไม่เคยติดตาม",     color: "bg-[#E8E5E0] text-[#6B6B6B]" },
  { value: "followed_1",     label: "🟡 ติดตามแล้ว 1 ครั้ง",  color: "bg-yellow-100 text-yellow-700" },
  { value: "followed_2plus", label: "🟠 ติดตามแล้ว 2+ ครั้ง", color: "bg-orange-100 text-orange-700" },
  { value: "engaged",        label: "🟢 ตอบรับแล้ว",          color: "bg-green-100 text-green-700" },
  { value: "quoted",         label: "✅ ส่งใบเสนอราคาแล้ว",   color: "bg-blue-100 text-blue-700" },
  { value: "converted",      label: "🎯 ปิดการขาย",           color: "bg-emerald-600 text-white" },
  { value: "lost",           label: "❌ เสียลูกค้า",          color: "bg-red-100 text-red-700" },
];

export const CONTACT_METHODS: { value: LeadContactMethod; label: string }[] = [
  { value: "line",      label: "LINE" },
  { value: "phone",     label: "โทรศัพท์" },
  { value: "email",     label: "อีเมล" },
  { value: "messenger", label: "Messenger" },
  { value: "wechat",    label: "WeChat" },
];

export const YES_NO_UNKNOWN: { value: YesNoUnknown; label: string }[] = [
  { value: "yes",     label: "ใช่" },
  { value: "no",      label: "ไม่ใช่" },
  { value: "unknown", label: "ยังไม่ทราบ" },
];

export const SEGMENTS: { value: LeadSegment; label: string }[] = [
  { value: "b2b", label: "B2B (องค์กร/SME)" },
  { value: "b2c", label: "B2C (ผู้บริโภค)" },
];

export const LOST_REASONS = [
  { value: "price",            label: "ราคา" },
  { value: "not_interested",   label: "ไม่สนใจแล้ว" },
  { value: "bought_elsewhere", label: "ซื้อที่อื่น" },
  { value: "other",            label: "อื่นๆ" },
];

export function statusMeta(status: LeadStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}
