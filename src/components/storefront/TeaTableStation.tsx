"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/store/language";
import { toast } from "sonner";
import type { Product } from "@/types";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

// Slide-style section for the tea table catalog — built to hold more than one
// item, but nav arrows/dots only show once there's actually more than one.
export function TeaTableStation({ products }: { products: Product[] }) {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [index, setIndex] = useState(0);
  const total = products.length;

  if (total === 0) return null;
  const product = products[index];

  function go(delta: 1 | -1) {
    setIndex((i) => (i + delta + total) % total);
  }

  function handleAddToCart() {
    addItem(product);
    toast.success(t("เพิ่มลงตะกร้าแล้ว", "Added to cart", "已加入购物车"));
  }

  return (
    <section className="bg-[#F3EEE4] py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex items-end justify-between mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div>
            <p className="text-[#C8102E] text-xs tracking-[0.3em] uppercase font-semibold mb-3">
              {t("โต๊ะน้ำชา", "Tea Table", "茶桌")}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              {t("คอลเลกชันโต๊ะน้ำชา", "Explore the Tea Table Collection", "探索茶桌系列")}
            </h2>
          </div>
          <Link
            href="/category/tea-table"
            className="hidden sm:flex text-[#C8102E] text-sm font-semibold items-center gap-1 hover:underline shrink-0"
          >
            {t("ดูโต๊ะน้ำชาทั้งหมด", "View all tea tables", "查看全部茶桌")} <ArrowRight size={15} />
          </Link>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={product.sku}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="bg-white shadow-sm"
            >
              <Link href={`/product/${product.sku}`} className="relative block w-full aspect-video">
                <Image
                  src={product.images[0]}
                  alt={t(product.name_th, product.name_en, product.name_zh)}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 900px"
                  priority
                />
              </Link>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-t border-[#E8E5E0]">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">
                    {t(product.name_th, product.name_en, product.name_zh)}
                  </p>
                  <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">{product.sku}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Link
                    href={`/product/${product.sku}`}
                    className="flex-1 sm:flex-none text-center border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-sm font-semibold px-5 h-10 flex items-center justify-center transition-colors"
                  >
                    {t("ดูสินค้า", "View Product", "查看产品")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={product.stock_status === "out_of_stock"}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#C8102E] hover:bg-[#a30d25] text-white text-sm font-bold px-5 h-10 transition-colors disabled:opacity-50"
                  >
                    <ShoppingCart size={15} />
                    {t("เพิ่มลงตะกร้า", "Add to Cart", "加入购物车")}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("ก่อนหน้า", "Previous", "上一张")}
                className="hidden md:flex absolute left-2 top-[36%] -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-md border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] items-center justify-center text-[#1A1A1A] transition-colors z-10"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t("ถัดไป", "Next", "下一张")}
                className="hidden md:flex absolute right-2 top-[36%] -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-md border border-[#E8E5E0] hover:border-[#C8102E] hover:text-[#C8102E] items-center justify-center text-[#1A1A1A] transition-colors z-10"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {products.map((p, i) => (
              <button
                key={p.sku}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={p.sku}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-[#C8102E]" : "w-1.5 bg-[#1A1A1A]/15 hover:bg-[#C9A876]"
                }`}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-6 sm:hidden">
          <Link
            href="/category/tea-table"
            className="text-[#C8102E] text-sm font-semibold inline-flex items-center gap-1"
          >
            {t("ดูโต๊ะน้ำชาทั้งหมด", "View all tea tables", "查看全部茶桌")} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
