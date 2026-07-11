"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { CATEGORIES, FEATURED_PRODUCTS } from "@/data/mock";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CategoryTile } from "@/components/storefront/CategoryTile";
import { VideoHero } from "@/components/storefront/VideoHero";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const MARQUEE_ITEMS = [
  "คลังสินค้าในไทย",
  "ติดตั้งฟรีทั่วประเทศ",
  "ออกใบกำกับภาษีได้",
  "10+ ปีประสบการณ์",
  "500+ ลูกค้าที่ไว้วางใจ",
  "บริการหลังขายในไทย",
  "เฟอร์นิเจอร์สำนักงานพรีเมียม",
];

const NAV_CATS = [
  { slug: "office-chair",   th: "เก้าอี้สำนักงาน" },
  { slug: "office-desk",    th: "โต๊ะทำงาน" },
  { slug: "workstation",    th: "เวิร์คสเตชั่น" },
  { slug: "executive-desk", th: "โต๊ะผู้บริหาร" },
  { slug: "lounge-chair",   th: "เก้าอี้รับแขก" },
  { slug: "wood-cabinet",   th: "ตู้เก็บเอกสาร" },
  { slug: "sofa",           th: "โซฟา" },
  { slug: "standing-desk",  th: "โต๊ะปรับระดับ" },
  { slug: "tea-table",      th: "โต๊ะน้ำชา" },
];

/* ── Reusable reveal wrapper ───────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  const offsets = { up: [0, 40], left: [-40, 0], right: [40, 0], none: [0, 0] };
  const [x, y] = direction === "up" ? [0, offsets.up[1]] : direction === "left" ? [offsets.left[0], 0] : direction === "right" ? [offsets.right[0], 0] : [0, 0];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: direction === "up" ? 40 : 0, x: direction === "left" ? -40 : direction === "right" ? 40 : 0 }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger grid wrapper ──────────────────────────────────────────── */
function StaggerGrid({
  children,
  className = "",
  stagger = 0.07,
}: {
  children: React.ReactNode[];
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: i * stagger, ease: EASE }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const topCats = CATEGORIES.slice(0, 8);
  const splitCat = CATEGORIES.find((c) => c.slug === "office-chair")!;

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">

      {/* ── Category nav strip ───────────────────────────────────────── */}
      <div className="border-b border-[#E8E5E0] bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto gap-0" style={{ scrollbarWidth: "none" }}>
            {NAV_CATS.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="flex-none px-4 py-3.5 text-[13px] font-medium text-[#444] hover:text-[#C8102E] border-b-2 border-transparent hover:border-[#C8102E] whitespace-nowrap transition-all duration-200"
              >
                {c.th}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Video Hero ───────────────────────────────────────────────── */}
      <section className="relative h-[92vh] min-h-[600px] overflow-hidden bg-[#111]">
        {/* Video loop carousel */}
        <div className="absolute inset-0 opacity-75">
          <VideoHero />
        </div>

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* content */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 sm:px-12 w-full">
            <div className="max-w-lg">
              <motion.p
                className="text-white/60 text-xs tracking-[0.4em] uppercase mb-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
              >
                บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด
              </motion.p>

              <div className="overflow-hidden mb-2">
                <motion.h1
                  className="text-white font-bold text-5xl sm:text-6xl lg:text-7xl leading-tight"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.5, duration: 0.9, ease: EASE }}
                >
                  เฟอร์นิเจอร์
                </motion.h1>
              </div>
              <div className="overflow-hidden mb-6">
                <motion.h1
                  className="text-[#C8102E] font-bold text-5xl sm:text-6xl lg:text-7xl leading-tight"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.65, duration: 0.9, ease: EASE }}
                >
                  สำนักงาน
                </motion.h1>
              </div>

              <motion.p
                className="text-white/60 text-sm leading-relaxed mb-8 max-w-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.7 }}
              >
                คลังสินค้าในไทย · ติดตั้งฟรี · ออกใบกำกับภาษีได้
              </motion.p>

              <motion.div
                className="flex gap-3 flex-wrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6 }}
              >
                <Link
                  href="/category/office-chair"
                  className="group inline-flex items-center gap-2 bg-[#C8102E] hover:bg-[#a30d25] text-white text-sm font-bold px-8 h-12 transition-colors"
                >
                  ดูสินค้าทั้งหมด
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/showroom"
                  className="inline-flex items-center gap-2 border border-white/40 hover:border-white hover:bg-white/10 text-white text-sm px-8 h-12 transition-all"
                >
                  โชว์รูม
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          <motion.div
            className="w-px h-10 bg-white/40 origin-top"
            animate={{ scaleY: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          />
          <span className="text-white/30 text-[9px] tracking-[0.3em] uppercase">Scroll</span>
        </motion.div>
      </section>

      {/* ── Marquee strip ────────────────────────────────────────────── */}
      <div className="bg-[#C8102E] py-3 overflow-hidden">
        <div className="flex whitespace-nowrap" style={{ animation: "marquee 28s linear infinite" }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="text-white text-xs font-semibold tracking-widest uppercase mx-8">
              {item} <span className="text-white/40 mx-4">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Shop by Category ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-[#1A1A1A]">เลือกซื้อตามหมวดหมู่</h2>
          <Link href="/search" className="text-[#C8102E] text-sm font-semibold flex items-center gap-1 hover:underline">
            ดูทั้งหมด <ChevronRight size={15} />
          </Link>
        </Reveal>
        <StaggerGrid
          className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4"
          stagger={0.06}
        >
          {topCats.map((cat) => (
            <CategoryTile key={cat.slug} category={cat} size="small" />
          ))}
        </StaggerGrid>
      </section>

      <div className="border-t border-[#E8E5E0]" />

      {/* ── Featured Products ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-[#1A1A1A]">สินค้าแนะนำ</h2>
          <Link href="/search" className="text-[#C8102E] text-sm font-semibold flex items-center gap-1 hover:underline">
            ดูทั้งหมด <ChevronRight size={15} />
          </Link>
        </Reveal>
        <StaggerGrid
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          stagger={0.07}
        >
          {FEATURED_PRODUCTS.slice(0, 8).map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </StaggerGrid>
      </section>

      {/* ── Split feature section ─────────────────────────────────────── */}
      <section className="bg-[#F5F5F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text side */}
          <Reveal direction="left">
            <p className="text-[#C8102E] text-xs tracking-[0.3em] uppercase font-semibold mb-4">เก้าอี้เด่นประจำร้าน</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] leading-tight mb-4">
              เก้าอี้สำนักงาน<br />Ergonomic Series
            </h2>
            <p className="text-[#666] text-sm leading-relaxed mb-8 max-w-md">
              ออกแบบเพื่อการนั่งนานหลายชั่วโมง รองรับแผ่นหลังส่วนล่าง ปรับระดับได้หลายจุด
              มีในคลังสินค้าไทย พร้อมส่งทันที
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              {["ปรับความสูงได้", "รองรับแผ่นหลัง", "รับประกัน 2 ปี", "ส่งฟรี"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                  <span className="text-sm text-[#444]">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/category/office-chair"
              className="group inline-flex items-center gap-3 bg-[#1A1A1A] hover:bg-[#C8102E] text-white text-sm font-bold px-8 h-12 transition-colors duration-300"
            >
              ดูเก้าอี้ทั้งหมด
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>

          {/* Image side */}
          <Reveal direction="right" delay={0.15}>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#E8E5E0]">
                <Image
                  src="/cat/chair-banner.jpg"
                  alt="เก้าอี้สำนักงาน"
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              </div>
              {/* Floating badge */}
              <motion.div
                className="absolute -bottom-5 -left-5 bg-white shadow-xl px-6 py-4 border-l-4 border-[#C8102E]"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <p className="text-[#C8102E] font-black text-xl leading-none">30+</p>
                <p className="text-[#666] text-xs mt-0.5">รุ่นให้เลือก</p>
              </motion.div>
              {/* Second badge */}
              <motion.div
                className="absolute -top-4 -right-4 bg-[#C8102E] text-white px-5 py-3 shadow-lg"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
              >
                <p className="font-black text-sm leading-none">BEST</p>
                <p className="font-black text-sm leading-none">SELLER</p>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 2-column promo banners ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { href: "/category/office-desk",  src: "/cat/desk-banner.png",  th: "โต๊ะทำงาน" },
          { href: "/category/workstation",  src: "/cat/case-banner.jpg",  th: "เวิร์คสเตชั่น" },
        ].map((b, i) => (
          <Reveal key={b.th} direction={i === 0 ? "left" : "right"} delay={i * 0.12}>
            <Link href={b.href} className="group relative block h-60 overflow-hidden bg-[#F5F5F5]">
              <Image src={b.src} alt={b.th} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-600" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors duration-300" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <p className="text-white text-xl font-bold">{b.th}</p>
                <motion.div
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
                  whileHover={{ scale: 1.15 }}
                >
                  <ArrowRight size={14} className="text-[#1A1A1A]" />
                </motion.div>
              </div>
            </Link>
          </Reveal>
        ))}
      </section>

      {/* ── Why Futai ────────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { num: "01", th: "คลังสินค้าในไทย",           sub: "ไม่รอนำเข้า พร้อมส่งทันที ทั่วประเทศ" },
            { num: "02", th: "ติดตั้งฟรี + ใบกำกับภาษี", sub: "ทีมงานติดตั้งมือโปร ออกเอกสารครบ" },
            { num: "03", th: "บริการหลังขายในไทย",         sub: "ซัพพอร์ตในประเทศ แก้ปัญหาได้ทันที" },
          ].map((item, i) => (
            <Reveal key={item.num} delay={i * 0.1}>
              <div className="border-t border-white/10 pt-6">
                <p className="text-[#C8102E] font-mono font-bold text-3xl mb-3">{item.num}</p>
                <p className="text-white font-semibold text-sm mb-2">{item.th}</p>
                <p className="text-white/40 text-xs leading-relaxed">{item.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Showroom strip ───────────────────────────────────────────── */}
      <Reveal>
        <div className="bg-white border-t border-[#E8E5E0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-[#1A1A1A] font-bold text-base mb-0.5">โชว์รูม ฟูไท่ เฟอร์นิเจอร์</p>
              <p className="text-[#999] text-sm">ลำลูกกา ปทุมธานี · จ–ส 9:00–18:00</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/showroom" className="bg-[#1A1A1A] hover:bg-[#C8102E] text-white text-sm font-bold px-6 h-10 flex items-center transition-colors">
                ดูแผนที่
              </Link>
              <a href="tel:0638261333" className="border border-[#E8E5E0] hover:border-[#C8102E] text-[#444] hover:text-[#C8102E] text-sm px-6 h-10 flex items-center transition-colors">
                063-826-1333
              </a>
              <a href="https://line.me/R/ti/p/660305099" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] hover:bg-[#05a847] text-white text-sm font-bold px-6 h-10 flex items-center transition-colors">
                LINE OA
              </a>
            </div>
          </div>
        </div>
      </Reveal>

    </div>
  );
}
