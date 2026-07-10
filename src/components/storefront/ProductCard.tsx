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
    <Link href={`/product/${product.sku}`} className="group block bg-white">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#F5F5F5] mb-3">
        <Image
          src={product.images[0] ?? "/products/DHX-BK-BG.jpg"}
          alt={product.name_th}
          fill
          className="object-contain p-4 group-hover:scale-105 transition-transform duration-400"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        {product.is_featured && (
          <div className="absolute top-2 left-2 bg-[#C8102E] text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5">
            แนะนำ
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <h3 className="text-[13px] font-semibold text-[#1A1A1A] leading-snug line-clamp-2 mb-1 group-hover:text-[#C8102E] transition-colors">
          {t(product.name_th, product.name_en)}
        </h3>
        <p className="text-[11px] text-[#999] mb-2">{product.dimensions}</p>
        <div>
          {product.price !== null ? (
            <p className="text-sm font-bold text-[#1A1A1A]">฿{product.price.toLocaleString()}</p>
          ) : (
            <p className="text-xs text-[#C8102E] font-semibold">{t("ขอใบเสนอราคา", "Request Quote")}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
