"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import HTMLFlipBookImport from "react-pageflip";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/store/language";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// react-pageflip's TS types mark every StPageFlip setting as required, even
// though the library fills in sane runtime defaults for anything you omit —
// relax the type here instead of hand-specifying two dozen options.
const HTMLFlipBook = HTMLFlipBookImport as unknown as ComponentType<Record<string, unknown>>;

// Pages more than this far from the one currently on screen render as a
// plain placeholder instead of running pdf.js — keeps a 100+ page catalog
// light on mobile since only a handful of canvases exist at once.
const RENDER_WINDOW = 2;

const CatalogPage = forwardRef<
  HTMLDivElement,
  { pageNumber: number; width: number; active: boolean; onFirstLoad?: (page: { originalWidth?: number; originalHeight?: number; width: number; height: number }) => void }
>(({ pageNumber, width, active, onFirstLoad }, ref) => (
  <div ref={ref} className="bg-white flex items-center justify-center overflow-hidden shadow-sm">
    {active ? (
      <Page
        pageNumber={pageNumber}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={onFirstLoad}
        loading={<div className="w-full h-full bg-[#EDEBE6] animate-pulse" />}
      />
    ) : (
      <div className="w-full h-full bg-[#EDEBE6]" />
    )}
  </div>
));
CatalogPage.displayName = "CatalogPage";

export function CatalogFlipbook() {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<{ pageFlip?: () => { flipPrev: () => void; flipNext: () => void } } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [aspect, setAspect] = useState(0.707); // width/height, refined once page 1 loads
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: containerWidth, height: containerHeight } = containerSize;

  // Always show one large page at a time (never split into a two-page
  // spread) — a single page filling the available box reads far better
  // for a product catalog than two half-width pages side by side.
  let pageWidth = 0;
  let pageHeight = 0;
  if (containerWidth > 0 && containerHeight > 0) {
    const widthBudget = containerWidth - 4;
    const heightBudget = containerHeight * aspect;
    pageWidth = Math.floor(Math.min(widthBudget, heightBudget));
    pageHeight = Math.floor(pageWidth / aspect);
  }

  const handleFirstPageLoad = useCallback(
    (page: { originalWidth?: number; originalHeight?: number; width: number; height: number }) => {
      const w = page.originalWidth || page.width;
      const h = page.originalHeight || page.height;
      if (w && h) setAspect(w / h);
    },
    []
  );

  const goPrev = () => bookRef.current?.pageFlip?.().flipPrev();
  const goNext = () => bookRef.current?.pageFlip?.().flipNext();

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
        {containerWidth > 0 && (
          <Document
            file="/catalog.pdf"
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadProgress={({ loaded, total }) => setLoadProgress(total ? loaded / total : 0)}
            loading={
              <div className="flex flex-col items-center justify-center gap-3 text-[#999]">
                <Loader2 className="animate-spin" size={28} />
                <p className="text-sm">{Math.round(loadProgress * 100)}%</p>
              </div>
            }
            error={
              <div className="flex items-center justify-center text-[#999] text-sm">
                {t("โหลดแคตตาล็อกไม่สำเร็จ", "Failed to load catalog", "加载目录失败")}
              </div>
            }
          >
            {numPages > 0 && pageWidth > 0 && (
              <HTMLFlipBook
                key={`${pageWidth}x${pageHeight}`}
                ref={bookRef}
                width={pageWidth}
                height={pageHeight}
                size="fixed"
                minWidth={200}
                maxWidth={3000}
                minHeight={280}
                maxHeight={4000}
                showCover
                mobileScrollSupport
                usePortrait
                drawShadow
                flippingTime={700}
                className="mx-auto"
                startPage={0}
                startZIndex={0}
                autoSize
                maxShadowOpacity={0.5}
                clickEventForward
                useMouseEvents
                swipeDistance={30}
                showPageCorners
                disableFlipByClick={false}
                onFlip={(e: { data: number }) => setCurrentPage(e.data)}
              >
                {Array.from({ length: numPages }, (_, i) => {
                  const pageNumber = i + 1;
                  const active = Math.abs(i - currentPage) <= RENDER_WINDOW;
                  return (
                    <CatalogPage
                      key={pageNumber}
                      pageNumber={pageNumber}
                      width={pageWidth}
                      active={active}
                      onFirstLoad={i === 0 ? handleFirstPageLoad : undefined}
                    />
                  );
                })}
              </HTMLFlipBook>
            )}
          </Document>
        )}
      </div>

      {numPages > 0 && (
        <div className="flex items-center justify-center gap-4 py-3 shrink-0">
          <button
            type="button"
            onClick={goPrev}
            aria-label={t("ก่อนหน้า", "Previous", "上一页")}
            className="w-10 h-10 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#444] flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-[#666] font-mono min-w-16 text-center">
            {currentPage + 1} / {numPages}
          </span>
          <button
            type="button"
            onClick={goNext}
            aria-label={t("ถัดไป", "Next", "下一页")}
            className="w-10 h-10 rounded-full border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] text-[#444] flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
