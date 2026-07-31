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
  const jump = useCallback((i: number) => {
    setSlide(([cur]) => [i, i > cur ? 1 : -1]);
  }, []);

  if (total === 0) return null;

  const p = products[index];
  const name = t(p.name_th, p.name_en, p.name_zh);
  const description = t(p.description_th, p.description_en, p.description_zh);

  return (
    <section ref={sectionRef} className="bg-[#EDEBE6] py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex items-end justify-between mb-6 sm:mb-8"
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

        {/* ── Catalog sheet ────────────────────────────────────────────── */}
        <div className="relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={p.sku}
              custom={direction}
              initial={{ opacity: 0, x: direction >= 0 ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -50 : 50 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="border border-[#1A1A1A]/15 bg-[#F5F3EE] p-5 sm:p-8 lg:p-10"
            >
              {/* header row */}
              <div className="flex items-center justify-between mb-5 sm:mb-8">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] shrink-0" />
                  <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-[#1A1A1A]">
                    Futai Furniture
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs tracking-[0.15em] text-[#999] uppercase">
                  {String(index + 1).padStart(2, "0")} — {t("โซฟา", "SOFAS", "沙发")}
                </span>
              </div>

              {/* photo */}
              <Link
                href={`/product/${p.sku}`}
                className="relative block w-full aspect-[16/11] sm:aspect-[16/9] bg-white mb-6 sm:mb-10 overflow-hidden"
              >
                <Image
                  src={p.images[0]}
                  alt={name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority={index === 0}
                />
              </Link>

              {/* name / desc left, model right */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="min-w-0 lg:max-w-lg">
                  <h3 className="text-xl sm:text-2xl font-medium text-[#1A1A1A] mb-1.5">{name}</h3>
                  <p className="text-[#8a8a8a] text-sm mb-2">{p.dimensions}</p>
                  {description && (
                    <p className="text-[#8a8a8a] text-sm leading-relaxed line-clamp-2">{description}</p>
                  )}
                </div>

                <div className="shrink-0 flex items-end gap-6">
                  <div className="text-right">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#999] mb-0.5">
                      {t("รุ่น", "Model", "型号")}
                    </p>
                    <p className="font-semibold text-lg text-[#1A1A1A]">{p.sku}</p>
                  </div>
                  <Link
                    href={`/product/${p.sku}`}
                    className="inline-flex items-center gap-1.5 text-[#C8102E] text-sm font-semibold hover:underline whitespace-nowrap pb-1"
                  >
                    {t("ดูรายละเอียด", "View Product", "查看详情")} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* footer contact line, matches the source catalog sheet */}
              <div className="mt-6 sm:mt-8 pt-4 border-t border-[#1A1A1A]/10 text-[11px] text-[#999]">
                Futai Furniture Co.,Ltd | Tel : 063 826 1333 | LINE : Futai08 | WeChat : Futai_02
              </div>
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
            {t("ดูทั้งหมด", "View all", "查看全部")} <ArrowRight size={15} />
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
          {products.map((sp, i) => (
            <button
              key={sp.sku}
              type="button"
              onClick={() => jump(i)}
              aria-label={`${i + 1}`}
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
