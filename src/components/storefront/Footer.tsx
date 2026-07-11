import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { CATEGORIES } from "@/data/mock";

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white/80 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-white text-xl font-bold tracking-wide mb-3">
              FUTAI
            </h3>
            <p className="text-xs leading-relaxed mb-4">
              บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด
              <br />
              富泰家具
            </p>
            <p className="text-xs italic text-white/50">
              "Present in Thailand, genuine after-sales service"
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              สินค้า
            </h4>
            <ul className="space-y-2">
              {CATEGORIES.slice(0, 8).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-xs hover:text-white transition-colors"
                  >
                    {cat.name_th}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              &nbsp;
            </h4>
            <ul className="space-y-2 mt-0 md:mt-[28px]">
              {CATEGORIES.slice(8).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-xs hover:text-white transition-colors"
                  >
                    {cat.name_th}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              ติดต่อเรา
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="flex gap-2">
                <MapPin size={14} className="shrink-0 mt-0.5 text-[#C9A876]" />
                <span>ตึกฟูไท่ ชั้น 4 คลอง 8 ลำลูกกา ปทุมธานี</span>
              </li>
              <li className="flex gap-2">
                <Phone size={14} className="shrink-0 mt-0.5 text-[#C9A876]" />
                <a href="tel:0638261333" className="hover:text-white">063 826 1333</a>
              </li>
              <li className="flex gap-2">
                <Mail size={14} className="shrink-0 mt-0.5 text-[#C9A876]" />
                <a href="mailto:futai.furniture@gmail.com" className="hover:text-white">
                  futai.furniture@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://line.me/R/ti/p/660305099"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 bg-[#06C755] text-white text-xs px-3 py-1.5 rounded hover:bg-[#05b34d] transition-colors"
                >
                  LINE: @660305099
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>© 2024 บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/showroom" className="hover:text-white/70 transition-colors">
              โชว์รูม
            </Link>
            <Link href="/search" className="hover:text-white/70 transition-colors">
              ค้นหาสินค้า
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
