"use client";
import Image from "next/image";
import { useLanguage } from "@/store/language";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import type { Category, Product } from "@/types";

export function CategoryPageClient({ category, products }: { category: Category; products: Product[] }) {
  const { t } = useLanguage();
  const name = t(category.name_th, category.name_en, category.name_zh);

  return (
    <div className="bg-[#FAF7F2]">
      {/* Banner */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        <Image
          src={category.banner_url}
          alt={name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#1A1A1A]/55 flex flex-col items-center justify-center text-center px-4">
          <FadeIn>
            <p className="text-[#C9A876] text-xs tracking-[0.3em] uppercase mb-2 font-light">
              Futai Furniture
            </p>
            <h1 className="text-white text-3xl sm:text-4xl font-bold">
              {name}
            </h1>
          </FadeIn>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-[#6B6B6B]">
        <span>{t("หน้าแรก", "Home", "首页")}</span>
        <span className="mx-2">›</span>
        <span className="text-[#1A1A1A]">{name}</span>
      </div>

      {/* Products grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <FadeIn>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#6B6B6B]">
              {products.length} {t("รายการ", "items", "件")}
            </p>
          </div>
        </FadeIn>

        {products.length === 0 ? (
          <div className="text-center py-24 text-[#6B6B6B]">
            <p className="text-lg">{t("ไม่พบสินค้าในหมวดหมู่นี้", "No products in this category", "此分类暂无产品")}</p>
            <p className="text-sm mt-2">{t("กำลังเพิ่มสินค้าเร็วๆ นี้", "More products coming soon", "产品即将上架")}</p>
          </div>
        ) : (
          <StaggerChildren
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            stagger={0.05}
          >
            {products.map((product) => (
              <StaggerItem key={product.sku}>
                <ProductCard product={product} />
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </div>
    </div>
  );
}
