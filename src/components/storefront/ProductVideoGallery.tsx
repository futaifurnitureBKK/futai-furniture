"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play, Music2 } from "lucide-react";
import { useLanguage } from "@/store/language";
import type { TikTokVideoData } from "@/lib/tiktok";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const COL_WIDTH = 190;
const BOX_W = 220;
const BOX_H = 280;
const CONTAINER_H = 320;
const AUTOPLAY_MS = 3200;
const RADIUS = 8;

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function ProductVideoGallery({ videos }: { videos: TikTokVideoData[] }) {
  const { t } = useLanguage();
  const count = videos.length;

  // Same endless-strip trick as InstallationGallery: three copies back to
  // back so the carousel can keep sliding one direction forever.
  const track = useMemo(() => [...videos, ...videos, ...videos], [videos]);

  const [centerIndex, setCenterIndex] = useState(() => ({
    value: count + Math.floor(count / 2),
    skip: false,
  }));
  const [paused, setPaused] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackContainerRef.current;
    if (!el) return;
    const update = () => setTrackWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const step = useCallback(
    (delta: number) => {
      setCenterIndex(({ value }) => {
        let n = value + delta;
        let skip = false;
        if (n >= 2 * count) {
          skip = true;
          n -= count;
        } else if (n < count) {
          skip = true;
          n += count;
        }
        return { value: n, skip };
      });
    },
    [count]
  );
  const prev = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);
  const goTo = useCallback((i: number) => step(i - centerIndex.value), [step, centerIndex.value]);

  useEffect(() => {
    if (paused || playingIndex !== null || count <= 1) return;
    const id = setInterval(() => step(1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, playingIndex, count, step]);

  const closePlayer = () => setPlayingIndex(null);

  useEffect(() => {
    if (playingIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePlayer();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [playingIndex]);

  if (count === 0) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 w-full">
        <button
          type="button"
          onClick={prev}
          aria-label={t("เลื่อนไปทางซ้าย", "Scroll left", "向左滚动")}
          className="flex-none w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#999] flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={trackContainerRef}
          className="relative flex-1 flex items-center overflow-hidden"
          style={{ height: CONTAINER_H }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="pointer-events-none absolute left-0 inset-y-0 w-16 sm:w-24 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 inset-y-0 w-16 sm:w-24 bg-gradient-to-l from-white to-transparent z-10" />

          <motion.div
            className="absolute top-1/2 left-0"
            style={{ y: "-50%" }}
            animate={{ x: trackWidth / 2 - COL_WIDTH / 2 - centerIndex.value * COL_WIDTH }}
            transition={centerIndex.skip ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 30 }}
          >
            <div className="flex">
              {track.map((video, i) => {
                const dist = i - centerIndex.value;
                const abs = Math.abs(dist);
                if (abs > RADIUS) return <div key={i} style={{ width: COL_WIDTH }} />;

                const isCenter = dist === 0;
                const scale = isCenter ? 1.15 : Math.max(0.55, 1 - abs * 0.18);
                const opacity = Math.max(0, 1 - abs * 0.3);

                return (
                  <div key={i} className="flex items-center justify-center" style={{ width: COL_WIDTH }}>
                    <motion.button
                      type="button"
                      onClick={() => (isCenter ? setPlayingIndex(mod(i, count)) : goTo(i))}
                      className="relative overflow-hidden bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] rounded-lg shadow-md"
                      animate={{ scale, opacity }}
                      transition={{ duration: 0.35, ease: EASE }}
                      style={{ width: BOX_W, height: BOX_H, zIndex: isCenter ? 5 : 4 - abs }}
                    >
                      {video.thumbnail ? (
                        <Image
                          src={video.thumbnail}
                          alt={video.title}
                          fill
                          className="object-cover"
                          sizes="220px"
                          priority={isCenter}
                        />
                      ) : (
                        <div className="absolute top-3 left-3 flex items-center gap-1 text-white/60 text-[10px] font-medium tracking-wide">
                          <Music2 size={12} />
                          TikTok
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center">
                          <Play size={18} className="text-[#C8102E] ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-xs font-medium leading-snug text-left line-clamp-3">
                          {video.title}
                        </p>
                      </div>
                      {isCenter && <div className="absolute inset-0 ring-2 ring-[#C8102E] rounded-lg" />}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <button
          type="button"
          onClick={next}
          aria-label={t("เลื่อนไปทางขวา", "Scroll right", "向右滚动")}
          className="flex-none w-9 h-9 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#999] flex items-center justify-center transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="text-[#999] text-xs mt-3 tracking-wide">
        {mod(centerIndex.value, count) + 1} / {count}
      </p>

      <AnimatePresence>
        {playingIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 sm:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closePlayer}
          >
            <button
              type="button"
              onClick={closePlayer}
              aria-label={t("ปิด", "Close", "关闭")}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <X size={26} />
            </button>

            <motion.div
              className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-lg overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={videos[playingIndex].embedSrc}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
