"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/store/language";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const COL_WIDTH = 190;
const BOX_W = 220;
const BOX_H = 160;
const CONTAINER_H = 260;
const AUTOPLAY_MS = 2400;

export function InstallationGallery({ photos }: { photos: string[] }) {
  const { t } = useLanguage();
  const count = photos.length;
  const [centerIndex, setCenterIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const clamp = useCallback((i: number) => Math.max(0, Math.min(count - 1, i)), [count]);

  const goTo = useCallback(
    (i: number) => setCenterIndex(clamp(i)),
    [clamp]
  );
  const prev = useCallback(() => {
    setDir(-1);
    goTo(centerIndex - 1);
  }, [centerIndex, goTo]);
  const next = useCallback(() => {
    setDir(1);
    goTo(centerIndex + 1);
  }, [centerIndex, goTo]);

  // Autoplay — bounces back and forth so it loops without a jarring jump-cut.
  useEffect(() => {
    if (paused || lightboxIndex !== null || count <= 1) return;
    const id = setInterval(() => {
      setCenterIndex((i) => {
        let n = i + dir;
        if (n >= count - 1) {
          setDir(-1);
          n = count - 1;
        } else if (n <= 0) {
          setDir(1);
          n = 0;
        }
        return n;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, lightboxIndex, count, dir]);

  // Lightbox keyboard nav
  const closeLightbox = () => setLightboxIndex(null);
  const lightboxPrev = () => setLightboxIndex((i) => (i === null ? null : (i - 1 + count) % count));
  const lightboxNext = () => setLightboxIndex((i) => (i === null ? null : (i + 1) % count));

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 w-full">
        {/* ── Left button ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={prev}
          disabled={centerIndex === 0}
          aria-label={t("เลื่อนไปทางซ้าย", "Scroll left", "向左滚动")}
          className="flex-none w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#999] flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={18} />
        </button>

        {/* ── Horizontal carousel ──────────────────────────────────── */}
        <div
          className="relative flex-1 flex items-center overflow-hidden"
          style={{ height: CONTAINER_H }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="pointer-events-none absolute left-0 inset-y-0 w-16 sm:w-24 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 inset-y-0 w-16 sm:w-24 bg-gradient-to-l from-white to-transparent z-10" />

          <motion.div
            className="absolute top-1/2"
            style={{ y: "-50%" }}
            animate={{ x: `calc(50% - ${COL_WIDTH / 2}px - ${centerIndex * COL_WIDTH}px)` }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
          >
            <div className="flex">
              {photos.map((src, i) => {
                const dist = i - centerIndex;
                const abs = Math.abs(dist);
                const isCenter = dist === 0;
                const scale = isCenter ? 1.28 : Math.max(0.55, 1 - abs * 0.18);
                const opacity = Math.max(0, 1 - abs * 0.3);

                return (
                  <div key={src} className="flex items-center justify-center" style={{ width: COL_WIDTH }}>
                    {opacity > 0 && (
                      <motion.button
                        type="button"
                        onClick={() => (isCenter ? setLightboxIndex(i) : goTo(i))}
                        className="relative overflow-hidden bg-[#E8E5E0] rounded-sm shadow-md"
                        animate={{ scale, opacity }}
                        transition={{ duration: 0.35, ease: EASE }}
                        style={{ width: BOX_W, height: BOX_H, zIndex: isCenter ? 5 : 4 - abs }}
                      >
                        <Image
                          src={src}
                          alt={t("ผลงานติดตั้งจริง", "Real installation", "真实安装案例")}
                          fill
                          className="object-cover"
                          sizes="220px"
                          priority={i === 0}
                        />
                        {isCenter && <div className="absolute inset-0 ring-2 ring-[#C8102E]" />}
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── Right button ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={next}
          disabled={centerIndex === count - 1}
          aria-label={t("เลื่อนไปทางขวา", "Scroll right", "向右滚动")}
          className="flex-none w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#999] flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="text-[#999] text-xs mt-3 tracking-wide">
        {centerIndex + 1} / {count}
      </p>

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 sm:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              aria-label={t("ปิด", "Close", "关闭")}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <X size={26} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                lightboxPrev();
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
                lightboxNext();
              }}
              aria-label={t("ถัดไป", "Next", "下一张")}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight size={22} />
            </button>

            <motion.div
              key={lightboxIndex}
              className="relative w-full h-full max-w-4xl max-h-[80vh]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={photos[lightboxIndex]}
                alt={t("ผลงานติดตั้งจริง", "Real installation", "真实安装案例")}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </motion.div>

            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-wide">
              {lightboxIndex + 1} / {count}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
