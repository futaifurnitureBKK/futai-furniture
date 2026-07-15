"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ChevronRight, Search, ShoppingCart } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CategoryTile } from "@/components/storefront/CategoryTile";
import { VideoHero } from "@/components/storefront/VideoHero";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/store/language";
import { TESTIMONIALS } from "@/data/testimonials";
import type { Category, Product } from "@/types";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const MARQUEE_ITEMS: [string, string, string][] = [
  ["คลังสินค้าในไทย", "In-stock in Thailand", "泰国本地仓库"],
  ["ติดตั้งฟรีทั่วประเทศ", "Free installation nationwide", "全国免费安装"],
  ["ออกใบกำกับภาษีได้", "Tax invoice available", "可开具税务发票"],
  ["10+ ปีประสบการณ์", "10+ years of experience", "10年以上经验"],
  ["500+ ลูกค้าที่ไว้วางใจ", "500+ trusted customers", "500+信赖客户"],
  ["บริการหลังขายในไทย", "After-sales service in Thailand", "泰国本地售后服务"],
  ["เฟอร์นิเจอร์สำนักงานพรีเมียม", "Premium office furniture", "高端办公家具"],
];

const NAV_CATS: { slug: string; th: string; en: string; zh: string }[] = [
  { slug: "office-chair",   th: "เก้าอี้สำนักงาน",   en: "Office Chair",   zh: "办公椅" },
  { slug: "office-desk",    th: "โต๊ะทำงาน",         en: "Office Desk",    zh: "办公桌" },
  { slug: "workstation",    th: "เวิร์คสเตชั่น",     en: "Workstation",    zh: "工作站" },
  { slug: "executive-desk", th: "โต๊ะผู้บริหาร",     en: "Executive Desk", zh: "行政桌" },
  { slug: "lounge-chair",   th: "เก้าอี้รับแขก",     en: "Lounge Chair",   zh: "休闲椅" },
  { slug: "wood-cabinet",   th: "ตู้เก็บเอกสาร",     en: "Wood Cabinet",   zh: "文件柜" },
  { slug: "sofa",           th: "โซฟา",               en: "Sofa",           zh: "沙发" },
  { slug: "standing-desk",  th: "โต๊ะปรับระดับ",     en: "Standing Desk",  zh: "升降桌" },
  { slug: "tea-table",      th: "โต๊ะน้ำชา",         en: "Tea Table",      zh: "茶桌" },
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

export function HomeClient({
  featuredProducts,
  categories,
}: {
  featuredProducts: Product[];
  categories: Category[];
}) {
  const { t } = useLanguage();
  const { totalItems } = useCart();
  const topCats = categories.slice(0, 8);

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">

      {/* ── Category nav strip (homepage's single header row) ──────────── */}
      <div className="border-b border-[#E8E5E0] bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4">
          <Link href="/" className="flex-none flex items-center py-2">
            <Image src="/logo.png" alt="Futai Furniture" width={100} height={40} className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex overflow-x-auto gap-0 flex-1" style={{ scrollbarWidth: "none" }}>
            {NAV_CATS.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="flex-none px-4 py-3.5 text-[13px] font-medium text-[#444] hover:text-[#C8102E] border-b-2 border-transparent hover:border-[#C8102E] whitespace-nowrap transition-all duration-200"
              >
                {t(c.th, c.en, c.zh)}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link href="/search" aria-label={t("ค้นหา", "Search", "搜索")}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1A1A1A]">
                <Search size={18} />
              </Button>
            </Link>
            <Link href="/cart" aria-label={t("ตะกร้า", "Cart", "购物车")} className="relative">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1A1A1A]">
                <ShoppingCart size={18} />
                {totalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C8102E] text-white text-[10px] flex items-center justify-center font-bold">
                    {totalItems()}
                  </span>
                )}
              </Button>
            </Link>
            <LanguageSwitcher variant="dark" className="ml-1" />
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
                  {t("เฟอร์นิเจอร์", "Furniture", "家具")}
                </motion.h1>
              </div>
              <div className="overflow-hidden mb-6">
                <motion.h1
                  className="text-[#C8102E] font-bold text-5xl sm:text-6xl lg:text-7xl leading-tight"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.65, duration: 0.9, ease: EASE }}
                >
                  {t("สำนักงาน", "Office", "办公室")}
                </motion.h1>
              </div>

              <motion.p
                className="text-white/60 text-sm leading-relaxed mb-8 max-w-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.7 }}
              >
                {t("คลังสินค้าในไทย · ติดตั้งฟรี · ออกใบกำกับภาษีได้", "In-stock in Thailand · Free installation · Tax invoice available", "泰国现货 · 免费安装 · 可开税票")}
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
                  {t("ดูสินค้าทั้งหมด", "Shop All Products", "查看所有产品")}
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/showroom"
                  className="inline-flex items-center gap-2 border border-white/40 hover:border-white hover:bg-white/10 text-white text-sm px-8 h-12 transition-all"
                >
                  {t("โชว์รูม", "Showroom", "展厅")}
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
              {t(...item)} <span className="text-white/40 mx-4">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Shop by Category ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Reveal className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-[#1A1A1A]">{t("เลือกซื้อตามหมวดหมู่", "Shop by Category", "按分类选购")}</h2>
          <Link href="/search" className="text-[#C8102E] text-sm font-semibold flex items-center gap-1 hover:underline">
            {t("ดูทั้งหมด", "View all", "查看全部")} <ChevronRight size={15} />
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
          <h2 className="text-xl font-bold text-[#1A1A1A]">{t("สินค้าแนะนำ", "Featured Products", "推荐产品")}</h2>
          <Link href="/search" className="text-[#C8102E] text-sm font-semibold flex items-center gap-1 hover:underline">
            {t("ดูทั้งหมด", "View all", "查看全部")} <ChevronRight size={15} />
          </Link>
        </Reveal>
        <StaggerGrid
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          stagger={0.07}
        >
          {featuredProducts.slice(0, 8).map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </StaggerGrid>
      </section>

      {/* ── Split feature section ─────────────────────────────────────── */}
      <section className="bg-[#F5F5F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text side */}
          <Reveal direction="left">
            <p className="text-[#C8102E] text-xs tracking-[0.3em] uppercase font-semibold mb-4">{t("เก้าอี้เด่นประจำร้าน", "Store Highlight", "店铺推荐")}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] leading-tight mb-4">
              {t("เก้าอี้สำนักงาน", "Office Chair", "办公椅")}<br />Ergonomic Series
            </h2>
            <p className="text-[#666] text-sm leading-relaxed mb-8 max-w-md">
              {t(
                "ออกแบบเพื่อการนั่งนานหลายชั่วโมง รองรับแผ่นหลังส่วนล่าง ปรับระดับได้หลายจุด มีในคลังสินค้าไทย พร้อมส่งทันที",
                "Designed for hours of sitting, with lower-back support and multi-point adjustment. In stock in Thailand, ready to ship.",
                "专为长时间久坐设计，支撑下背部，多点可调节。泰国现货，随时发货。"
              )}
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              {([
                ["ปรับความสูงได้", "Height adjustable", "高度可调"],
                ["รองรับแผ่นหลัง", "Back support", "背部支撑"],
                ["รับประกัน 2 ปี", "2-year warranty", "2年保修"],
                ["ส่งฟรี", "Free delivery", "免费配送"],
              ] as [string, string, string][]).map((f) => (
                <div key={f[0]} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                  <span className="text-sm text-[#444]">{t(...f)}</span>
                </div>
              ))}
            </div>
            <Link
              href="/category/office-chair"
              className="group inline-flex items-center gap-3 bg-[#1A1A1A] hover:bg-[#C8102E] text-white text-sm font-bold px-8 h-12 transition-colors duration-300"
            >
              {t("ดูเก้าอี้ทั้งหมด", "Shop All Chairs", "查看所有椅子")}
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>

          {/* Image side */}
          <Reveal direction="right" delay={0.15}>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#E8E5E0]">
                <Image
                  src="/cat/chair-banner.jpg"
                  alt={t("เก้าอี้สำนักงาน", "Office Chair", "办公椅")}
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
                <p className="text-[#666] text-xs mt-0.5">{t("รุ่นให้เลือก", "Models available", "款式可选")}</p>
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
          { href: "/category/office-desk",  src: "/cat/desk-banner.png",  th: "โต๊ะทำงาน",     en: "Office Desk",  zh: "办公桌" },
          { href: "/category/workstation",  src: "/cat/case-banner.jpg",  th: "เวิร์คสเตชั่น", en: "Workstation",  zh: "工作站" },
        ].map((b, i) => (
          <Reveal key={b.th} direction={i === 0 ? "left" : "right"} delay={i * 0.12}>
            <Link href={b.href} className="group relative block h-60 overflow-hidden bg-[#F5F5F5]">
              <Image src={b.src} alt={t(b.th, b.en, b.zh)} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-600" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors duration-300" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <p className="text-white text-xl font-bold">{t(b.th, b.en, b.zh)}</p>
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
            { num: "01", th: "คลังสินค้าในไทย",           en: "In-stock in Thailand",     zh: "泰国本地仓库",   subTh: "ไม่รอนำเข้า พร้อมส่งทันที ทั่วประเทศ",       subEn: "No import wait — ships nationwide immediately", subZh: "无需等待进口，全国即时发货" },
            { num: "02", th: "ติดตั้งฟรี + ใบกำกับภาษี", en: "Free Install + Tax Invoice", zh: "免费安装+税务发票", subTh: "ทีมงานติดตั้งมือโปร ออกเอกสารครบ",           subEn: "Professional install team, full documentation", subZh: "专业安装团队，单据齐全" },
            { num: "03", th: "บริการหลังขายในไทย",         en: "Local After-sales",         zh: "泰国本地售后",   subTh: "ซัพพอร์ตในประเทศ แก้ปัญหาได้ทันที",         subEn: "Local support, issues resolved fast",           subZh: "本地支持，快速解决问题" },
          ].map((item, i) => (
            <Reveal key={item.num} delay={i * 0.1}>
              <div className="border-t border-white/10 pt-6">
                <p className="text-[#C8102E] font-mono font-bold text-3xl mb-3">{item.num}</p>
                <p className="text-white font-semibold text-sm mb-2">{t(item.th, item.en, item.zh)}</p>
                <p className="text-white/40 text-xs leading-relaxed">{t(item.subTh, item.subEn, item.subZh)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Real Installations (customer proof) ─────────────────────── */}
      {TESTIMONIALS.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Reveal className="mb-8">
            <p className="text-[#C8102E] text-xs tracking-[0.3em] uppercase font-semibold mb-3">
              {t("ลูกค้าไว้วางใจ", "Trusted by Clients", "客户信赖")}
            </p>
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              {t("ผลงานติดตั้งจริง", "Real Installations", "真实安装案例")}
            </h2>
          </Reveal>

          {TESTIMONIALS.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.1} className={i > 0 ? "mt-10" : ""}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {item.images.map((src, imgI) => (
                  <div key={src} className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-[#E8E5E0]">
                    <Image
                      src={src}
                      alt={t(item.th, item.en, item.zh)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                      priority={i === 0 && imgI === 0}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3 mt-4">
                <span className="flex-none bg-[#1A1A1A] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1">
                  {t(item.tagTh, item.tagEn, item.tagZh)}
                </span>
                <p className="text-[#555] text-sm leading-relaxed">{t(item.th, item.en, item.zh)}</p>
              </div>
            </Reveal>
          ))}
        </section>
      )}

      {/* ── Showroom strip ───────────────────────────────────────────── */}
      <Reveal>
        <div className="bg-white border-t border-[#E8E5E0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-[#1A1A1A] font-bold text-base mb-0.5">{t("โชว์รูม ฟูไท่ เฟอร์นิเจอร์", "Futai Furniture Showroom", "富泰家具展厅")}</p>
              <p className="text-[#999] text-sm">{t("ลำลูกกา ปทุมธานี · จ–ส 9:00–18:00", "Lam Luk Ka, Pathum Thani · Mon–Sat 9:00–18:00", "兰鲁卡，巴吞他尼 · 周一至周六 9:00–18:00")}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/showroom" className="bg-[#1A1A1A] hover:bg-[#C8102E] text-white text-sm font-bold px-6 h-10 flex items-center transition-colors">
                {t("ดูแผนที่", "View Map", "查看地图")}
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
