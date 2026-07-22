"use client";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { useLanguage } from "@/store/language";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useLanguage();

  return (
    <Link
      href={`/product/${product.sku}`}
      className="group block bg-white border border-[#E8E5E0] hover:border-[#C8102E] hover:shadow-md transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#F5F5F5]">
        <Image
          src={product.images[0] ?? "/products/DHX-BK-BG.jpg"}
          alt={product.name_th}
          fill
          className="object-contain p-4 group-hover:scale-105 transition-transform duration-400"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        {product.is_featured && (
          <div className="absolute top-2 left-2 bg-[#C8102E] text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5">
            {t("แนะนำ", "Featured", "推荐")}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 border-t border-[#E8E5E0]">
        <h3 className="text-[13px] font-semibold text-[#1A1A1A] leading-snug line-clamp-2 mb-1 group-hover:text-[#C8102E] transition-colors">
          {t(product.name_th, product.name_en, product.name_zh)}
        </h3>
        <p className="text-[11px] text-[#999] mb-2">{product.dimensions}</p>
        <div>
          <p className="text-xs text-[#C8102E] font-semibold">{t("ขอใบเสนอราคา", "Request Quote", "索取报价")}</p>
        </div>
      </div>
    </Link>
  );
}
