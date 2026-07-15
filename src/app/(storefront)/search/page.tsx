"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/browser";
import { ProductCard } from "@/components/storefront/ProductCard";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { FadeIn } from "@/components/animations/FadeIn";
import { useLanguage } from "@/store/language";
import type { Product } from "@/types";

export default function SearchPage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const q = query.trim();

  useEffect(() => {
    if (q.length <= 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .or(`sku.ilike.%${q}%,name_th.ilike.%${q}%,name_en.ilike.%${q}%,name_zh.ilike.%${q}%`)
        .limit(48);
      if (!cancelled) setResults((data as Product[]) ?? []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FadeIn>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">{t("ค้นหาสินค้า", "Search Products", "搜索产品")}</h1>
          <div className="relative max-w-xl mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={18} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ค้นหาด้วย SKU, ชื่อ, หรือแท็ก...", "Search by SKU, name, or tag...", "按SKU、名称或标签搜索...")}
              className="pl-12 h-12 text-base bg-white border-[#E8E5E0]"
              autoFocus
            />
          </div>
        </FadeIn>

        {q.length > 1 && (
          <FadeIn>
            <p className="text-sm text-[#6B6B6B] mb-6">
              {t(`พบ ${results.length} รายการ สำหรับ "${query}"`, `Found ${results.length} results for "${query}"`, `找到 ${results.length} 个与"${query}"相关的结果`)}
            </p>
          </FadeIn>
        )}

        {results.length > 0 ? (
          <StaggerChildren
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            stagger={0.05}
          >
            {results.map((product) => (
              <StaggerItem key={product.sku}>
                <ProductCard product={product} />
              </StaggerItem>
            ))}
          </StaggerChildren>
        ) : q.length > 1 ? (
          <div className="text-center py-16 text-[#6B6B6B]">
            <p className="text-lg mb-2">{t("ไม่พบสินค้าที่ค้นหา", "No products found", "未找到相关产品")}</p>
            <p className="text-sm">{t("ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่", "Try a different search term or browse categories", "请尝试其他关键词或浏览分类")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
