import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";

const HOURS = [
  { day: "จันทร์ – ศุกร์", time: "09:00 – 18:00 น." },
  { day: "เสาร์", time: "09:00 – 17:00 น." },
  { day: "อาทิตย์", time: "10:00 – 16:00 น." },
];

export const metadata = {
  title: "โชว์รูม | Futai Furniture",
  description: "ตึกฟู่ไท ชั้น 4 คลอง 8 ลำลูกกา ปทุมธานี",
};

export default function ShowroomPage() {
  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-16">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-20 text-center">
        <FadeIn>
          <p className="text-[#C9A876] text-xs tracking-[0.3em] uppercase mb-3">
            Come Visit Us
          </p>
          <h1 className="text-white text-4xl font-bold mb-4">โชว์รูม ฟู่ไท</h1>
          <p className="text-white/60 text-sm">
            ชมสินค้าจริง นั่งทดลอง สัมผัสคุณภาพด้วยตัวเอง
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
                  {" "}ที่ตั้งโชว์รูม
                </h2>
                <p className="text-[#1A1A1A] font-medium">ตึกฟู่ไท ชั้น 4</p>
                <p className="text-[#6B6B6B] text-sm mt-1">
                  คลอง 8 ลำลูกกา ปทุมธานี
                  <br />
                  (ใกล้แยกคลอง 8 ถนนลำลูกกา)
                </p>
              </div>

              {/* Hours */}
              <div>
                <h2 className="text-[#1A1A1A] font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-[#C8102E]" />
                  {" "}เวลาทำการ
                </h2>
                <div className="space-y-2">
                  {HOURS.map((h) => (
                    <div key={h.day} className="flex justify-between text-sm">
                      <span className="text-[#6B6B6B]">{h.day}</span>
                      <span className="text-[#1A1A1A] font-medium">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <h2 className="text-[#1A1A1A] font-semibold text-lg mb-4 flex items-center gap-2">
                  <Phone size={18} className="text-[#C8102E]" />
                  {" "}ติดต่อเรา
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
                      href="https://line.me/R/ti/p/660305099"
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
            <h2 className="font-bold text-[#1A1A1A] text-xl mb-6">การเดินทาง</h2>
            <StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-6" stagger={0.1}>
              {[
                {
                  title: "รถยนต์ส่วนตัว",
                  desc: "จาก กรุงเทพฯ ใช้ทางหลวงหมายเลข 1 (พหลโยธิน) ผ่านรังสิต เลี้ยวซ้ายเข้าถนนลำลูกกา มาทางคลอง 8",
                },
                {
                  title: "รถไฟฟ้า",
                  desc: "นั่ง BTS หรือ MRT มาลงสถานีที่ใกล้ที่สุด จากนั้นนั่งรถ Grab หรือวินมอเตอร์ไซค์",
                },
                {
                  title: "โทรนัด",
                  desc: "โทรหาเราก่อนมา เพื่อให้ทีมงานเตรียมตัวต้อนรับ และแนะนำเส้นทางให้ถูกต้อง",
                },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#6B6B6B] leading-relaxed">{item.desc}</p>
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
