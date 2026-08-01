"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { useLanguage } from "@/store/language";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

// Position as % of the image, hand-placed against /sofa-station/shop-the-room.png
const HOTSPOTS: { id: string; x: number; y: number; th: string; en: string; zh: string; sku?: string }[] = [
  { id: "cream-sofa",    x: 17.5, y: 50, th: "โซฟา 2 ที่นั่ง ผ้าครีม",      en: "2-Seater Sofa, Cream",      zh: "米色双人沙发" },
  { id: "cream-lounge",  x: 13,   y: 74, th: "เก้าอี้เลานจ์ผ้ากำมะหยี่",   en: "Velvet Lounge Chair",       zh: "天鹅绒躺椅",   sku: "T-902" },
  { id: "rust-daybed",   x: 47.5, y: 52, th: "โซฟาเดย์เบด สีสนิม",         en: "Daybed Sofa, Rust",         zh: "锈橙色贵妃沙发", sku: "T-901" },
  { id: "rust-sofa",     x: 79,   y: 53, th: "โซฟา 3 ที่นั่ง สีสนิม",      en: "3-Seater Sofa, Rust",       zh: "锈橙色三人沙发" },
  { id: "rust-armchair", x: 94,   y: 68, th: "เก้าอี้อาร์มแชร์ สีสนิม",    en: "Armchair, Rust",            zh: "锈橙色扶手椅" },
];

export function SofaStation() {
  const { t } = useLanguage();
  const [active, setActive] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <section className="bg-[#F5F3EF] py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 sm:mb-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="text-[#C8102E] text-xs tracking-[0.3em] uppercase font-semibold mb-3">
            {t("โซฟาสเตชั่น", "Sofa Station", "沙发专区")}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
            {t("แตะดูโซฟาในห้องนี้", "Tap to Shop This Room", "点击探索这间房")}
          </h2>
        </motion.div>

        <motion.div
          ref={containerRef}
          className="relative w-full mx-auto"
          style={{ aspectRatio: "2033 / 774" }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        >
          <Image
            src="/sofa-station/shop-the-room.png"
            alt={t("ห้องนั่งเล่นตัวอย่าง", "Sample living room", "样板客厅")}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1152px"
            priority
          />

          {HOTSPOTS.map((h) => (
            <div
              key={h.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
            >
              <button
                type="button"
                onClick={() => setActive((cur) => (cur === h.id ? null : h.id))}
                aria-label={t(h.th, h.en, h.zh)}
                className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 shadow-md border border-white flex items-center justify-center text-[#1A1A1A] hover:scale-110 transition-transform"
              >
                <span
                  className="absolute inset-0 rounded-full bg-white/70 animate-ping"
                  style={{ animationDuration: "2.5s" }}
                />
                <Plus
                  size={14}
                  className={`relative transition-transform ${active === h.id ? "rotate-45" : ""}`}
                />
              </button>

              <AnimatePresence>
                {active === h.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className={`absolute z-20 top-full mt-3 w-48 bg-white shadow-xl p-3 ${
                      h.x > 70 ? "right-0" : h.x < 25 ? "left-0" : "left-1/2 -translate-x-1/2"
                    }`}
                  >
                    <p className="text-[#1A1A1A] text-sm font-semibold mb-2 leading-snug">
                      {t(h.th, h.en, h.zh)}
                    </p>
                    <Link
                      href={h.sku ? `/product/${h.sku}` : "/category/sofa"}
                      className="inline-flex items-center gap-1.5 text-[#C8102E] text-xs font-bold hover:underline"
                    >
                      {h.sku ? t("ดูสินค้านี้", "Shop This Item", "查看此产品") : t("ดูหมวดโซฟา", "Shop Sofas", "查看沙发")}
                      <ArrowRight size={12} />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

        <div className="text-center mt-8">
          <Link
            href="/category/sofa"
            className="inline-flex items-center gap-2 text-[#C8102E] text-sm font-semibold hover:underline"
          >
            {t("ดูโซฟาทั้งหมด", "View all sofas", "查看全部沙发")}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
