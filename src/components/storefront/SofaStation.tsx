"use client";
import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useLanguage } from "@/store/language";
import type { Product } from "@/types";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export function SofaStation({ products }: { products: Product[] }) {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px 0px" });

  const [[index, direction], setSlide] = useState<[number, number]>([0, 0]);
  const total = products.length;

  const go = useCallback(
    (delta: 1 | -1) => {
      setSlide(([i]) => [(i + delta + total) % total, delta]);
    },
    [total]
  );
  const jump = useCallback(
    (i: number) => {
      setSlide(([cur]) => [i, i > cur ? 1 : -1]);
    },
    []
  );

  if (total === 0) return null;

  const p = products[index];
  const name = t(p.name_th, p.name_en, p.name_zh);

  return (
    <section ref={sectionRef} className="bg-white py-16 overflow-hidden">
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

      {/* ── Full-bleed slide ─────────────────────────────────────────── */}
      <div className="relative w-full bg-[#F5F5F5]">
        <div className="relative h-[52vh] sm:h-[64vh] min-h-[360px] max-h-[640px] overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={p.sku}
              custom={direction}
              initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute inset-0"
            >
              <Link href={`/product/${p.sku}`} className="block relative w-full h-full">
                <Image
                  src={p.images[0]}
                  alt={name}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority={index === 0}
                />
              </Link>
            </motion.div>
          </AnimatePresence>

          {/* page-number badge, echoes the catalog sheet this collection is drawn from */}
          <div className="pointer-events-none absolute top-4 right-4 sm:top-6 sm:right-6 text-xs sm:text-sm tracking-[0.2em] text-[#1A1A1A]/50 font-mono">
            {String(index + 1).padStart(2, "0")} — {t("โซฟา", "SOFAS", "沙发")} — {String(total).padStart(2, "0")}
          </div>

          {/* prev / next */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("ก่อนหน้า", "Previous", "上一张")}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#1A1A1A] transition-colors z-10"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("ถัดไป", "Next", "下一张")}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#1A1A1A] transition-colors z-10"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* ── Info bar — name/desc left, model/spec + CTA right, catalog-sheet style ── */}
        <div className="border-t border-[#E8E5E0] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={p.sku}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
              >
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] leading-tight">{name}</h3>
                  <p className="text-[#999] text-sm mt-1 max-w-xl line-clamp-1">{p.dimensions}</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#999]">{t("รุ่น", "Model", "型号")}</p>
                    <p className="font-mono font-semibold text-[#1A1A1A]">{p.sku}</p>
                  </div>
                  <Link
                    href={`/product/${p.sku}`}
                    className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#C8102E] text-white text-sm font-bold px-6 h-11 transition-colors whitespace-nowrap"
                  >
                    {t("ดูรายละเอียด", "View Product", "查看详情")}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Page ticks ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 py-5 bg-white">
          {products.map((sp, i) => (
            <button
              key={sp.sku}
              type="button"
              onClick={() => jump(i)}
              aria-label={`${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-[#C8102E]" : "w-1.5 bg-[#E8E5E0] hover:bg-[#C9A876]"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:hidden">
        <Link href="/category/sofa" className="text-[#C8102E] text-sm font-semibold flex items-center gap-1">
          {t("ดูทั้งหมด", "View all", "查看全部")} <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
