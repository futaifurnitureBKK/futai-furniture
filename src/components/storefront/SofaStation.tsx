"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useLanguage } from "@/store/language";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

// Curated straight from SOFA.pdf — shown as the real catalog page image,
// not a re-built layout. Kept separate from the rest of the sofa category.
const SLIDES = [
  { sku: "BJ-6344", name: "Nova", image: "/sofa-station/nova-BJ-6344.jpg" },
  { sku: "B0954", name: "Milo", image: "/sofa-station/milo-B0954.jpg" },
  { sku: "BJ-6427", name: "Sienna", image: "/sofa-station/sienna-BJ-6427.jpg" },
  { sku: "F720", name: "Bloc", image: "/sofa-station/bloc-F720.jpg" },
];

export function SofaStation() {
  const { t } = useLanguage();
  const [[index, direction], setSlide] = useState<[number, number]>([0, 0]);
  const total = SLIDES.length;

  const go = useCallback((delta: 1 | -1) => {
    setSlide(([i]) => [(i + delta + total) % total, delta]);
  }, []);
  const jump = useCallback((i: number) => {
    setSlide(([cur]) => [i, i > cur ? 1 : -1]);
  }, []);

  const s = SLIDES[index];

  return (
    <section className="bg-[#EDEBE6] py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex items-end justify-between mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
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
            {t("ดูโซฟาทั้งหมด", "View all sofas", "查看全部沙发")} <ArrowRight size={15} />
          </Link>
        </motion.div>

        {/* ── Full catalog page, one at a time ────────────────────────── */}
        <div className="relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={s.sku}
              custom={direction}
              initial={{ opacity: 0, x: direction >= 0 ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -50 : 50 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <Link href={`/product/${s.sku}`} className="relative block w-full aspect-[3510/2482] shadow-sm">
                <Image
                  src={s.image}
                  alt={s.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority={index === 0}
                />
              </Link>
            </motion.div>
          </AnimatePresence>

          {/* prev / next — flank the sheet */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("ก่อนหน้า", "Previous", "上一张")}
            className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-md border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] items-center justify-center text-[#1A1A1A] transition-colors z-10"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("ถัดไป", "Next", "下一张")}
            className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-md border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] items-center justify-center text-[#1A1A1A] transition-colors z-10"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* mobile prev/next + view all */}
        <div className="flex items-center justify-between mt-5 md:hidden">
          <Link href="/category/sofa" className="text-[#C8102E] text-sm font-semibold flex items-center gap-1">
            {t("ดูโซฟาทั้งหมด", "View all sofas", "查看全部沙发")} <ArrowRight size={15} />
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("ก่อนหน้า", "Previous", "上一张")}
              className="w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#999] flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("ถัดไป", "Next", "下一张")}
              className="w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#999] flex items-center justify-center transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* page ticks */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {SLIDES.map((sp, i) => (
            <button
              key={sp.sku}
              type="button"
              onClick={() => jump(i)}
              aria-label={sp.name}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-[#C8102E]" : "w-1.5 bg-[#1A1A1A]/15 hover:bg-[#C9A876]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
