"use client";
import Link from "next/link";
import { ShieldCheck, RotateCcw, PackageCheck, Phone, PhoneCall } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { useLanguage } from "@/store/language";

const WARRANTY_TERMS: [string, string, string][] = [
  [
    "รับประกันโครงสร้างและกลไก 2 ปี นับจากวันที่ส่งมอบสินค้า ครอบคลุมความเสียหายจากข้อบกพร่องในการผลิต",
    "2-year warranty on structure and mechanisms from the delivery date, covering manufacturing defects.",
    "自交货之日起，结构及机械部件保修2年，涵盖生产缺陷造成的损坏。",
  ],
  [
    "ไม่ครอบคลุมความเสียหายจากการใช้งานผิดวิธี อุบัติเหตุ ไฟไหม้ น้ำท่วม หรือการดัดแปลงสินค้าเอง",
    "Does not cover damage from misuse, accidents, fire, flooding, or unauthorized modification.",
    "不涵盖因使用不当、意外事故、火灾、水灾或自行改装造成的损坏。",
  ],
  [
    "วัสดุสิ้นเปลือง เช่น หนัง ผ้าบุ ล้อเลื่อน ระบบไฮดรอลิกของเก้าอี้ รับประกัน 1 ปี",
    "Wear items such as upholstery leather/fabric, casters, and chair hydraulic systems carry a 1-year warranty.",
    "易损件（如皮革/布艺面料、脚轮、椅子液压系统）保修1年。",
  ],
  [
    "สินค้าสั่งทำพิเศษ (Custom order) ตามแบบลูกค้า รับประกันเฉพาะข้อบกพร่องจากการผลิต ไม่รับเปลี่ยน/คืนจากการเปลี่ยนใจ",
    "Custom-made products are warranted for manufacturing defects only — not eligible for change-of-mind return.",
    "定制产品仅保修生产缺陷，不接受因客户改变主意而退换货。",
  ],
];

const RETURN_STEPS: { icon: typeof PackageCheck; th: string; en: string; zh: string }[] = [
  {
    icon: PackageCheck,
    th: "แจ้งปัญหาภายใน 7 วัน หลังได้รับสินค้า พร้อมรูปถ่าย/วิดีโอจุดที่ชำรุด",
    en: "Report the issue within 7 days of delivery with photos/video of the defect.",
    zh: "收货后7天内报告问题，并附上损坏部位的照片/视频。",
  },
  {
    icon: ShieldCheck,
    th: "ทีมงานตรวจสอบและยืนยันว่าเป็นข้อบกพร่องจากการผลิตภายใน 3 วันทำการ",
    en: "Our team reviews and confirms the manufacturing defect within 3 business days.",
    zh: "我们的团队在3个工作日内审核并确认是否为生产缺陷。",
  },
  {
    icon: RotateCcw,
    th: "ซ่อม เปลี่ยนชิ้นส่วน หรือเปลี่ยนสินค้าใหม่ โดยไม่มีค่าใช้จ่าย ขึ้นอยู่กับลักษณะปัญหา",
    en: "We repair, replace parts, or replace the item free of charge, depending on the issue.",
    zh: "根据问题情况，我们将免费维修、更换零件或更换新品。",
  },
];

export function WarrantyPageClient() {
  const { t } = useLanguage();

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-16">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-20 text-center px-4">
        <FadeIn>
          <p className="text-[#C9A876] text-xs tracking-[0.3em] uppercase mb-3">Warranty &amp; Returns</p>
          <h1 className="text-white text-4xl font-bold mb-4">
            {t("การรับประกันและการคืนสินค้า", "Warranty & Returns", "保修与退换货")}
          </h1>
          <p className="text-white/60 text-sm max-w-lg mx-auto">
            {t(
              "เราให้ความสำคัญกับคุณภาพสินค้าและความมั่นใจของลูกค้าในทุกการสั่งซื้อ",
              "We stand behind the quality of every order and want you to buy with confidence.",
              "我们重视每一份订单的产品质量，让您安心购买。"
            )}
          </p>
        </FadeIn>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Warranty terms */}
        <FadeIn>
          <h2 className="text-[#1A1A1A] font-bold text-xl mb-6 flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#C8102E]" />
            {t("เงื่อนไขการรับประกัน", "Warranty Terms", "保修条款")}
          </h2>
        </FadeIn>
        <StaggerChildren className="space-y-4 mb-16">
          {WARRANTY_TERMS.map((term) => (
            <StaggerItem key={term[0]}>
              <div className="bg-white border border-[#E8E5E0] px-5 py-4 flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-2 shrink-0" />
                <p className="text-[#444] text-sm leading-relaxed">{t(...term)}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        {/* Return process */}
        <FadeIn>
          <h2 className="text-[#1A1A1A] font-bold text-xl mb-6 flex items-center gap-2">
            <RotateCcw size={20} className="text-[#C8102E]" />
            {t("ขั้นตอนการเคลม / คืนสินค้า", "Claim / Return Process", "理赔/退货流程")}
          </h2>
        </FadeIn>
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {RETURN_STEPS.map((step, i) => (
            <StaggerItem key={step.th}>
              <div className="bg-white border border-[#E8E5E0] px-5 py-6 h-full">
                <div className="w-9 h-9 rounded-full bg-[#FAF7F2] flex items-center justify-center mb-4">
                  <step.icon size={16} className="text-[#C8102E]" />
                </div>
                <p className="text-[#C8102E] font-mono font-bold text-xs mb-2">STEP {i + 1}</p>
                <p className="text-[#444] text-sm leading-relaxed">{t(step.th, step.en, step.zh)}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        {/* Contact CTA */}
        <FadeIn>
          <div className="bg-[#1A1A1A] px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-white font-bold text-base mb-1">
                {t("ต้องการเคลมสินค้า หรือมีคำถาม?", "Need to file a claim, or have a question?", "需要理赔或有疑问？")}
              </p>
              <p className="text-white/50 text-sm">
                {t("ติดต่อทีมบริการหลังการขายของเราได้ทุกช่องทาง", "Reach our after-sales team through any channel below.", "欢迎通过以下任意渠道联系我们的售后团队。")}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap shrink-0">
              <a href="tel:0638261333" className="inline-flex items-center gap-2 border border-white/30 hover:border-white text-white text-sm px-6 h-11 transition-colors">
                <Phone size={15} /> 063-826-1333
              </a>
              <a href="https://line.me/R/ti/p/660305099" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#06C755] hover:bg-[#05a847] text-white text-sm font-bold px-6 h-11 transition-colors">
                <PhoneCall size={15} /> LINE OA
              </a>
            </div>
          </div>
        </FadeIn>

        <p className="text-[#999] text-xs text-center mt-8">
          <Link href="/showroom" className="hover:text-[#C8102E] transition-colors">
            {t("ดูที่ตั้งโชว์รูมของเรา", "View our showroom location", "查看我们的展厅位置")}
          </Link>
        </p>
      </div>
    </div>
  );
}
