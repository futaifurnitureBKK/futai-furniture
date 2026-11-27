"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/store/language";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const CARD_W = 210;
const ROW_H = 150;
const ROW_GAP = 12;
const PER_ROW_CAP = 30; // how many distinct photos each row renders before looping

const mod = (n: number, m: number) => ((n % m) + m) % m;

type Item = { src: string; i: number };

export function InstallationGallery({ photos }: { photos: string[] }) {
  const { t } = useLanguage();
  const count = photos.length;
  const [paused, setPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Two rows, scrolling opposite directions. Each row gets every other photo
  // (capped for render/perf) and is duplicated once so the CSS marquee
  // (0 -> -50%) loops seamlessly. The full set stays reachable through the
  // lightbox, not just what's visible in the strips.
  const { rowA, rowB } = useMemo(() => {
    const withIndex: Item[] = photos.map((src, i) => ({ src, i }));
    const a = withIndex.filter((_, idx) => idx % 2 === 0).slice(0, PER_ROW_CAP);
    const b = withIndex.filter((_, idx) => idx % 2 === 1).slice(0, PER_ROW_CAP);
    return { rowA: [...a, ...a], rowB: [...b, ...b] };
  }, [photos]);

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

  const renderRow = (items: Item[], reverse: boolean, durationSec: number) => (
    <div
      className="flex"
      style={{
        gap: ROW_GAP,
        animation: `marquee ${durationSec}s linear infinite${reverse ? " reverse" : ""}`,
        animationPlayState: paused ? "paused" : "running",
      }}
    >
      {items.map((item, idx) => (
        <button
          key={`${item.i}-${idx}`}
          type="button"
          onClick={() => setLightboxIndex(item.i)}
          className="relative flex-none overflow-hidden rounded-md shadow-sm bg-[#E8E5E0] hover:opacity-90 transition-opacity"
          style={{ width: CARD_W, height: ROW_H }}
        >
          <Image
            src={item.src}
            alt={t("ผลงานติดตั้งจริง", "Real installation", "真实安装案例")}
            fill
            className="object-cover"
            sizes="210px"
          />
        </button>
      ))}
    </div>
  );

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
            "เลื่อนอัตโนมัติ 2 แถว · วางเมาส์ค้างเพื่อหยุด หรือคลิกเพื่อดูภาพเต็มจอ",
            "Auto-scrolling, 2 rows · hover to pause, click to view full screen",
            "自动滚动，2排 · 悬停暂停，点击查看全屏"
          )}
        </p>
      </div>

      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="pointer-events-none absolute left-0 inset-y-0 w-10 sm:w-20 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 inset-y-0 w-10 sm:w-20 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="flex flex-col" style={{ gap: ROW_GAP }}>
          {renderRow(rowA, false, 50)}
          {renderRow(rowB, true, 58)}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="text-[#C8102E] text-sm font-semibold inline-flex items-center gap-1 hover:underline"
        >
          {t(
            `เปิดดูคลังภาพทั้งหมด (${count} ภาพ)`,
            `View the full gallery (${count} photos)`,
            `查看完整图库（${count}张）`
          )}
          <ArrowUpRight size={14} />
        </button>
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
