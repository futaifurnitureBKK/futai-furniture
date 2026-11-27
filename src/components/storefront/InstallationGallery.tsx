"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/store/language";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const UNIT_H = 140; // one grid row's height; a featured tile spans 2 of these
const FEATURED_EVERY = 6; // every Nth photo renders as a big 2x2 tile

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function InstallationGallery({ photos }: { photos: string[] }) {
  const { t } = useLanguage();
  const count = photos.length;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = () => setLightboxIndex(null);
  const lightboxPrev = () => setLightboxIndex((i) => (i === null ? null : mod(i - 1, count)));
  const lightboxNext = () => setLightboxIndex((i) => (i === null ? null : mod(i + 1, count)));

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
    <div>
      <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
        <p className="text-[#666] text-sm max-w-md">
          {t(
            `ภาพถ่ายหน้างานจริงจากทีมติดตั้งกว่า ${count}+ โปรเจกต์ทั่วประเทศ`,
            `Real job-site photos from ${count}+ installations nationwide`,
            `来自全国${count}+个安装项目的真实现场照片`
          )}
        </p>
        <p className="text-[#999] text-xs hidden sm:block">
          {t(
            `ภาพทั้งหมด ${count} ภาพ · เลื่อนดูเพิ่มเติม หรือคลิกเพื่อดูภาพเต็มจอ`,
            `All ${count} photos · scroll for more, click to view full screen`,
            `共${count}张照片 · 滚动查看更多，点击查看全屏`
          )}
        </p>
      </div>

      <div className="max-h-[620px] overflow-y-auto rounded-md pr-1">
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          style={{ gridAutoRows: UNIT_H, gridAutoFlow: "dense" }}
        >
          {photos.map((src, i) => {
            const featured = i % FEATURED_EVERY === 0;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative overflow-hidden rounded-md bg-[#E8E5E0] group"
                style={featured ? { gridColumn: "span 2", gridRow: "span 2" } : undefined}
              >
                <Image
                  src={src}
                  alt={t("ผลงานติดตั้งจริง", "Real installation", "真实安装案例")}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes={featured ? "420px" : "210px"}
                />
              </button>
            );
          })}
        </div>
      </div>

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
