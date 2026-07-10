"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, Menu, X, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/store/language";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/mock";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: t("หมวดหมู่สินค้า", "Categories"), href: "/category/office-chair" },
    { label: t("โชว์รูม", "Showroom"), href: "/showroom" },
    { label: t("เกี่ยวกับเรา", "About"), href: "#about" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src={scrolled ? "/logo.png" : "/logo-white.png"}
              alt="Futai Furniture"
              width={160}
              height={64}
              className="h-14 w-auto object-contain"
              style={scrolled ? {} : { filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.6))" }}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {/* Categories mega-hint */}
            <div className="relative group">
              <button
                className={`text-sm font-medium transition-colors ${
                  scrolled ? "text-[#1A1A1A] hover:text-[#C8102E]" : "text-white hover:text-[#C9A876]"
                }`}
              >
                {t("สินค้า", "Products")}
              </button>
              {/* Dropdown */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[480px] bg-white rounded-lg shadow-xl p-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-2">
                {CATEGORIES.slice(0, 12).map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="text-xs text-[#1A1A1A] hover:text-[#C8102E] py-1 truncate"
                  >
                    {t(cat.name_th, cat.name_en)}
                  </Link>
                ))}
                <Link
                  href="/category/office-desk"
                  className="text-xs text-[#C8102E] font-medium py-1 col-span-3"
                >
                  {t("ดูทั้งหมด →", "View all →")}
                </Link>
              </div>
            </div>

            {navLinks.slice(1).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors ${
                  scrolled ? "text-[#1A1A1A] hover:text-[#C8102E]" : "text-white hover:text-[#C9A876]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              className={`flex items-center gap-1 text-xs font-medium ${
                scrolled ? "text-[#6B6B6B] hover:text-[#1A1A1A]" : "text-white/80 hover:text-white"
              }`}
              aria-label="Toggle language"
            >
              <Globe size={14} />
              {lang === "th" ? "EN" : "TH"}
            </button>

            <Link href="/search" aria-label={t("ค้นหา", "Search")}>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${scrolled ? "" : "text-white hover:bg-white/20"}`}
              >
                <Search size={18} />
              </Button>
            </Link>

            <Link href="/cart" aria-label={t("ตะกร้า", "Cart")} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${scrolled ? "" : "text-white hover:bg-white/20"}`}
              >
                <ShoppingCart size={18} />
                {totalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C8102E] text-white text-[10px] flex items-center justify-center font-bold">
                    {totalItems()}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              className={`md:hidden ${scrolled ? "text-[#1A1A1A]" : "text-white"}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-[#E8E5E0] overflow-hidden"
          >
            <nav className="px-4 py-4 flex flex-col gap-1">
              <Link
                href="/"
                className="py-2 text-[#1A1A1A] font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {t("หน้าแรก", "Home")}
              </Link>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="py-1.5 text-sm text-[#6B6B6B] hover:text-[#C8102E] pl-2"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(cat.name_th, cat.name_en)}
                </Link>
              ))}
              <Link
                href="/showroom"
                className="py-2 text-[#1A1A1A] font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {t("โชว์รูม", "Showroom")}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
