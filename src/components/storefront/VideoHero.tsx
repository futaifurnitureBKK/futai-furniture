"use client";
import { useRef, useState, useEffect, useCallback } from "react";

const VIDEOS = [
  "/videos/vid-1.mp4",
  "/videos/vid-2.mp4",
  "/videos/vid-3.mp4",
  "/videos/vid-4.mp4",
  "/videos/vid-5.mp4",
  "/videos/vid-6.mp4",
  "/videos/vid-7.mp4",
  "/videos/vid-8.mp4",
  "/videos/vid-9.mp4",
  "/videos/vid-10.mp4",
  "/videos/vid-11.mp4",
  "/videos/vid-12.mp4",
  "/hero.mp4",
];

export function VideoHero() {
  const [current, setCurrent] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = useCallback(() => {
    // fade out
    setOpacity(0);
    timerRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % VIDEOS.length);
      setOpacity(1);
    }, 600);
  }, []);

  // load & play whenever current changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = VIDEOS[current];
    video.load();
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        // autoplay blocked or bad file — skip to next after 3s
        timerRef.current = setTimeout(goNext, 3000);
      });
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, goNext]);

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        className="w-full h-full object-cover pointer-events-none"
        style={{ opacity, transition: "opacity 0.6s ease", touchAction: "pan-y" }}
        autoPlay
        muted
        playsInline
        poster="/hero.png"
        onEnded={goNext}
        onError={goNext}
      />

      {/* Dot indicators */}
      <div className="absolute bottom-20 right-6 flex flex-col gap-1.5 z-10">
        {VIDEOS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              setOpacity(0);
              timerRef.current = setTimeout(() => {
                setCurrent(i);
                setOpacity(1);
              }, 300);
            }}
            className="rounded-full transition-all duration-300"
            style={{
              width: "4px",
              height: i === current ? "24px" : "6px",
              backgroundColor: i === current ? "white" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
