"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PRODUCTS, CATEGORIES } from "@/data/mock";

const STOCK_LABEL: Record<string, string> = {
  in_stock: "มีสินค้า",
  out_of_stock: "สินค้าหมด",
  on_order: "สั่งจอง",
};
const STOCK_COLOR: Record<string, string> = {
  in_stock: "bg-green-100 text-green-700",
  out_of_stock: "bg-red-100 text-red-700",
  on_order: "bg-yellow-100 text-yellow-700",
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const filtered = PRODUCTS.filter((p) => {
    const matchCat = catFilter === "all" || p.category_slug === catFilter;
    const matchSearch =
      !search ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.name_th.includes(search) ||
      p.name_en.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">จัดการสินค้า</h1>
        <div className="flex gap-3">
          <Button size="sm" variant="outline">Import CSV</Button>
          <Button size="sm" className="bg-[#C8102E] hover:bg-[#a30d25] text-white gap-1">
            <Plus size={14} /> เพิ่มสินค้า
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={14} />
          <Input
            placeholder="ค้นหา SKU / ชื่อ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-56 h-9 text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-[#E8E5E0] text-sm bg-white text-[#1A1A1A]"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name_th}</option>
          ))}
        </select>
        <p className="text-xs text-[#6B6B6B] self-center">{filtered.length} รายการ</p>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <div
            key={product.sku}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-video bg-[#FAF7F2]">
              <Image
                src={product.images[0]}
                alt={product.name_th}
                fill
                sizes="80px"
                className="object-contain p-2"
              />
              {product.is_featured && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-[#C9A876] text-white text-[10px] px-1.5 py-0.5">Featured</Badge>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-[10px] font-mono text-[#6B6B6B] mb-0.5">{product.sku}</p>
              <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1 mb-1">{product.name_th}</p>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STOCK_COLOR[product.stock_status]}`}>
                  {STOCK_LABEL[product.stock_status]}
                </span>
                <span className="text-sm font-semibold text-[#C8102E]">
                  {product.price ? `฿${product.price.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
                  แก้ไข
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-[#C8102E] border-[#C8102E]/30 hover:bg-[#C8102E]/5">
                  ดูหน้า
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
