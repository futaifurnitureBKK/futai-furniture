"use client";
import { MapPin, Phone, Clock } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { useLanguage } from "@/store/language";

const HOURS: [string, string, string][] = [
  ["จันทร์ – ศุกร์", "Mon – Fri", "周一 – 周五"],
  ["เสาร์", "Saturday", "周六"],
  ["อาทิตย์", "Sunday", "周日"],
];
const HOUR_TIMES = ["09:00 – 18:00", "09:00 – 17:00", "10:00 – 16:00"];

export function ShowroomPageClient() {
  const { t } = useLanguage();

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-16">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-20 text-center">
        <FadeIn>
          <p className="text-[#C9A876] text-xs tracking-[0.3em] uppercase mb-3">
            Come Visit Us
          </p>
          <h1 className="text-white text-4xl font-bold mb-4">{t("โชว์รูม ฟูไท่", "Futai Showroom", "富泰展厅")}</h1>
          <p className="text-white/60 text-sm">
            {t("ชมสินค้าจริง นั่งทดลอง สัมผัสคุณภาพด้วยตัวเอง", "See the real products, try them out, feel the quality yourself", "亲眼看实物，亲身体验，感受品质")}
          </p>
        </FadeIn>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Info */}
          <FadeIn>
            <div className="space-y-8">
              {/* Address */}
              <div>
                <h2 className="text-[#1A1A1A] font-semibold text-lg mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[#C8102E]" />
                  {" "}{t("ที่ตั้งโชว์รูม", "Showroom Location", "展厅地址")}
                </h2>
                <p className="text-[#1A1A1A] font-medium">{t("ตึกฟูไท่ ชั้น 4", "Futai Building, 4th Floor", "富泰大厦4楼")}</p>
                <p className="text-[#6B6B6B] text-sm mt-1">
                  {t("คลอง 8 ลำลูกกา ปทุมธานี", "Klong 8, Lam Luk Ka, Pathum Thani", "八运河，兰鲁卡，巴吞他尼")}
                  <br />
                  {t("(ใกล้แยกคลอง 8 ถนนลำลูกกา)", "(Near Klong 8 intersection, Lam Luk Ka Rd)", "（靠近八运河兰鲁卡路口）")}
                </p>
              </div>

              {/* Hours */}
              <div>
                <h2 className="text-[#1A1A1A] font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-[#C8102E]" />
                  {" "}{t("เวลาทำการ", "Opening Hours", "营业时间")}
                </h2>
                <div className="space-y-2">
                  {HOURS.map((h, i) => (
                    <div key={h[0]} className="flex justify-between text-sm">
                      <span className="text-[#6B6B6B]">{t(...h)}</span>
                      <span className="text-[#1A1A1A] font-medium">{HOUR_TIMES[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <h2 className="text-[#1A1A1A] font-semibold text-lg mb-4 flex items-center gap-2">
                  <Phone size={18} className="text-[#C8102E]" />
                  {" "}{t("ติดต่อเรา", "Contact Us", "联系我们")}
                </h2>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href="tel:0638261333" className="text-[#C8102E] hover:underline font-medium">
                      063 826 1333
                    </a>
                  </li>
                  <li>
                    <a href="mailto:futai.furniture@gmail.com" className="text-[#6B6B6B] hover:text-[#1A1A1A]">
                      futai.furniture@gmail.com
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://line.me/ti/p/KJFKqUTMk-"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#06C755] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#05b34d] transition-colors font-medium"
                    >
                      LINE OA: @660305099
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </FadeIn>

          {/* Map */}
          <FadeIn delay={0.15}>
            <div className="rounded-xl overflow-hidden shadow-md h-80 md:h-full min-h-[320px] bg-[#E8E5E0]">
              <iframe
                title="Futai Showroom Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3872.8!2d100.8!3d13.95!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zFutai+Furniture!5e0!3m2!1sth!2sth!4v1"
              />
            </div>
          </FadeIn>
        </div>

        {/* Getting there */}
        <FadeIn className="mt-16">
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="font-bold text-[#1A1A1A] text-xl mb-6">{t("การเดินทาง", "Getting There", "交通指南")}</h2>
            <StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-6" stagger={0.1}>
              {[
                {
                  title: ["รถยนต์ส่วนตัว", "By Car", "自驾"] as [string, string, string],
                  desc: [
                    "จาก กรุงเทพฯ ใช้ทางหลวงหมายเลข 1 (พหลโยธิน) ผ่านรังสิต เลี้ยวซ้ายเข้าถนนลำลูกกา มาทางคลอง 8",
                    "From Bangkok, take Highway 1 (Phahonyothin) via Rangsit, turn left onto Lam Luk Ka Rd toward Klong 8",
                    "从曼谷出发，沿1号公路（帕荷约廷路）经过兰实，左转进入兰鲁卡路，前往八运河方向",
                  ] as [string, string, string],
                },
                {
                  title: ["รถไฟฟ้า", "By Train", "轻轨/地铁"] as [string, string, string],
                  desc: [
                    "นั่ง BTS หรือ MRT มาลงสถานีที่ใกล้ที่สุด จากนั้นนั่งรถ Grab หรือวินมอเตอร์ไซค์",
                    "Take BTS or MRT to the nearest station, then continue by Grab or motorcycle taxi",
                    "乘坐BTS或MRT到最近的站点，再转乘Grab或摩的",
                  ] as [string, string, string],
                },
                {
                  title: ["โทรนัด", "Call Ahead", "电话预约"] as [string, string, string],
                  desc: [
                    "โทรหาเราก่อนมา เพื่อให้ทีมงานเตรียมตัวต้อนรับ และแนะนำเส้นทางให้ถูกต้อง",
                    "Call us before you come so our team can prepare and give you accurate directions",
                    "来访前请致电，我们的团队会做好接待准备并提供准确路线",
                  ] as [string, string, string],
                },
              ].map((item) => (
                <StaggerItem key={item.title[0]}>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">{t(...item.title)}</h3>
                    <p className="text-sm text-[#6B6B6B] leading-relaxed">{t(...item.desc)}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
