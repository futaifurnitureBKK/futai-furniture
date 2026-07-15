"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Expand, Plus } from "lucide-react";
import { useLanguage } from "@/store/language";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const INITIAL_COUNT = 10;

export function InstallationGallery({ photos }: { photos: string[] }) {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(gridRef, { once: true, margin: "-60px 0px" });

  const visiblePhotos = showAll ? photos : photos.slice(0, INITIAL_COUNT);
  const remaining = photos.length - INITIAL_COUNT;

  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  const next = () => setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex]);

  return (
    <>
      <div ref={gridRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
        <AnimatePresence initial={false}>
          {visiblePhotos.map((src, i) => (
            <motion.button
              key={src}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative aspect-square overflow-hidden bg-[#E8E5E0] cursor-pointer"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: i < INITIAL_COUNT ? i * 0.03 : (i - INITIAL_COUNT) * 0.03, ease: EASE }}
            >
              <Image
                src={src}
                alt={t("ผลงานติดตั้งจริง", "Real installation", "真实安装案例")}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                priority={i === 0}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center">
                <Expand
                  size={18}
                  className="text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300"
                />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {!showAll && remaining > 0 && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="group inline-flex items-center gap-2 border border-[#E8E5E0] hover:border-[#C8102E] text-[#444] hover:text-[#C8102E] text-sm font-semibold px-6 h-11 transition-colors"
          >
            <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" />
            {t(`ดูเพิ่มเติม (+${remaining})`, `View More (+${remaining})`, `查看更多 (+${remaining})`)}
          </button>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {openIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 sm:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label={t("ปิด", "Close", "关闭")}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <X size={26} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label={t("ก่อนหน้า", "Previous", "上一张")}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label={t("ถัดไป", "Next", "下一张")}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight size={22} />
            </button>

            <motion.div
              key={openIndex}
              className="relative w-full h-full max-w-4xl max-h-[80vh]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={photos[openIndex]}
                alt={t("ผลงานติดตั้งจริง", "Real installation", "真实安装案例")}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </motion.div>

            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-wide">
              {openIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
