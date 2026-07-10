"use client";
import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/types";
import { useLanguage } from "@/store/language";

interface CategoryTileProps {
  category: Category;
  size?: "large" | "medium" | "small";
}

export function CategoryTile({ category, size = "medium" }: CategoryTileProps) {
  const { t } = useLanguage();

  return (
    <Link href={`/category/${category.slug}`} className="group block text-center">
      <div className="relative aspect-square overflow-hidden bg-[#F5F5F5] mb-2 rounded-sm">
        <Image
          src={category.banner_url}
          alt={category.name_th}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-400"
          sizes="(max-width: 640px) 30vw, 15vw"
        />
      </div>
      <p className="text-[11px] sm:text-xs font-semibold text-[#1A1A1A] line-clamp-2 leading-tight group-hover:text-[#C8102E] transition-colors">
        {t(category.name_th, category.name_en)}
      </p>
    </Link>
  );
}
