"use client";
import Link from "next/link";
import { MapPin, Phone, Mail, Building2, QrCode, CreditCard } from "lucide-react";
import { CATEGORIES } from "@/data/mock";
import { useLanguage } from "@/store/language";

export function Footer() {
  const { t } = useLanguage();

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
              &quot;{t("มีตัวตนในไทย บริการหลังการขายจริง", "Present in Thailand, genuine after-sales service", "扎根泰国，提供真实的售后服务")}&quot;
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              {t("สินค้า", "Products", "产品")}
            </h4>
            <ul className="space-y-2">
              {CATEGORIES.slice(0, 8).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-xs hover:text-white transition-colors"
                  >
                    {t(cat.name_th, cat.name_en, cat.name_zh)}
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
                    {t(cat.name_th, cat.name_en, cat.name_zh)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              {t("ติดต่อเรา", "Contact Us", "联系我们")}
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="flex gap-2">
                <MapPin size={14} className="shrink-0 mt-0.5 text-[#C9A876]" />
                <span>{t("ตึกฟูไท่ ชั้น 4 คลอง 8 ลำลูกกา ปทุมธานี", "Futai Building, 4th Floor, Klong 8, Lam Luk Ka, Pathum Thani", "富泰大厦4楼，八运河，兰鲁卡，巴吞他尼")}</span>
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

        {/* Payment methods */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h4 className="text-white/40 text-[11px] uppercase tracking-wider shrink-0">
            {t("ช่องทางชำระเงิน", "Payment Methods", "支付方式")}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { icon: Building2, th: "โอนผ่านธนาคาร", en: "Bank Transfer", zh: "银行转账" },
              { icon: QrCode, th: "พร้อมเพย์", en: "PromptPay", zh: "PromptPay" },
              { icon: CreditCard, th: "บัตรเครดิต/เดบิต", en: "Credit/Debit Card", zh: "信用卡/借记卡" },
            ].map((m) => (
              <span
                key={m.th}
                className="inline-flex items-center gap-1.5 border border-white/15 rounded px-3 py-1.5 text-xs text-white/60"
              >
                <m.icon size={13} className="text-[#C9A876]" />
                {t(m.th, m.en, m.zh)}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>© 2024 บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/showroom" className="hover:text-white/70 transition-colors">
              {t("โชว์รูม", "Showroom", "展厅")}
            </Link>
            <Link href="/search" className="hover:text-white/70 transition-colors">
              {t("ค้นหาสินค้า", "Search Products", "搜索产品")}
            </Link>
            <Link href="/warranty" className="hover:text-white/70 transition-colors">
              {t("การรับประกัน/คืนสินค้า", "Warranty/Returns", "保修/退换货")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
