"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchProducts } from "@/data/mock";
import { ProductCard } from "@/components/storefront/ProductCard";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { FadeIn } from "@/components/animations/FadeIn";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const results = query.trim().length > 1 ? searchProducts(query.trim()) : [];

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FadeIn>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">ค้นหาสินค้า</h1>
          <div className="relative max-w-xl mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={18} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาด้วย SKU, ชื่อ, หรือแท็ก..."
              className="pl-12 h-12 text-base bg-white border-[#E8E5E0]"
              autoFocus
            />
          </div>
        </FadeIn>

        {query.trim().length > 1 && (
          <FadeIn>
            <p className="text-sm text-[#6B6B6B] mb-6">
              พบ {results.length} รายการ สำหรับ &ldquo;{query}&rdquo;
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
        ) : query.trim().length > 1 ? (
          <div className="text-center py-16 text-[#6B6B6B]">
            <p className="text-lg mb-2">ไม่พบสินค้าที่ค้นหา</p>
            <p className="text-sm">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
