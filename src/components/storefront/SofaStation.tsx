"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useLanguage } from "@/store/language";
import type { Product } from "@/types";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const CARD_WIDTH = 300;
const CARD_GAP = 20;

export function SofaStation({ products }: { products: Product[] }) {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px 0px" });

  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scrollBy = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * (CARD_WIDTH + CARD_GAP) * 2, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section ref={sectionRef} className="bg-[#FAF7F2] py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex items-end justify-between mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div>
            <p className="text-[#C8102E] text-xs tracking-[0.3em] uppercase font-semibold mb-3">
              {t("โซฟาสเตชั่น", "Sofa Station", "沙发专区")}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              {t("เลือกชมคอลเลกชันโซฟา", "Explore the Sofa Collection", "探索沙发系列")}
            </h2>
          </div>
          <Link
            href="/category/sofa"
            className="hidden sm:flex text-[#C8102E] text-sm font-semibold items-center gap-1 hover:underline shrink-0"
          >
            {t("ดูทั้งหมด", "View all", "查看全部")} <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* edge fades */}
          <div className={`pointer-events-none absolute left-0 top-0 bottom-4 w-12 z-10 bg-gradient-to-r from-[#FAF7F2] to-transparent transition-opacity ${atStart ? "opacity-0" : "opacity-100"}`} />
          <div className={`pointer-events-none absolute right-0 top-0 bottom-4 w-12 z-10 bg-gradient-to-l from-[#FAF7F2] to-transparent transition-opacity ${atEnd ? "opacity-0" : "opacity-100"}`} />

          <div
            ref={trackRef}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            {products.map((p, i) => (
              <motion.div
                key={p.sku}
                className="snap-start shrink-0"
                style={{ width: CARD_WIDTH }}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.06, ease: EASE }}
              >
                <Link href={`/product/${p.sku}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-white border border-[#E8E5E0] group-hover:border-[#C8102E] transition-colors">
                    <Image
                      src={p.images[0]}
                      alt={t(p.name_th, p.name_en, p.name_zh)}
                      fill
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-400"
                      sizes="300px"
                    />
                    <p className="absolute top-2 left-2 text-[10px] font-mono tracking-wide bg-white/90 text-[#6B6B6B] px-2 py-1">
                      {p.sku}
                    </p>
                  </div>
                  <div className="pt-3">
                    <h3 className="text-sm font-semibold text-[#1A1A1A] leading-snug line-clamp-1 group-hover:text-[#C8102E] transition-colors">
                      {t(p.name_th, p.name_en, p.name_zh)}
                    </h3>
                    <p className="text-xs text-[#999] mt-1 line-clamp-1">{p.dimensions}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <Link
            href="/category/sofa"
            className="sm:hidden text-[#C8102E] text-sm font-semibold flex items-center gap-1"
          >
            {t("ดูทั้งหมด", "View all", "查看全部")} <ArrowRight size={15} />
          </Link>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              aria-label={t("เลื่อนไปทางซ้าย", "Scroll left", "向左滚动")}
              className="w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] disabled:opacity-30 disabled:hover:border-[#E8E5E0] disabled:hover:text-[#999] text-[#999] flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              aria-label={t("เลื่อนไปทางขวา", "Scroll right", "向右滚动")}
              className="w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] disabled:opacity-30 disabled:hover:border-[#E8E5E0] disabled:hover:text-[#999] text-[#999] flex items-center justify-center transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
