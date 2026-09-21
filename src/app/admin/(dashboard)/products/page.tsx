"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/browser";
import { CATEGORIES } from "@/data/mock";
import { useLanguage } from "@/store/language";
import type { Product } from "@/types";

const STOCK_LABEL: Record<string, { th: string; en: string; zh: string }> = {
  in_stock: { th: "มีสินค้า", en: "In Stock", zh: "有货" },
  out_of_stock: { th: "สินค้าหมด", en: "Out of Stock", zh: "缺货" },
  on_order: { th: "สั่งจอง", en: "On Order", zh: "订购中" },
};
const STOCK_COLOR: Record<string, string> = {
  in_stock: "bg-green-100 text-green-700",
  out_of_stock: "bg-red-100 text-red-700",
  on_order: "bg-yellow-100 text-yellow-700",
};

export default function ProductsPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (!cancelled) {
        setProducts((data as Product[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleActive(product: Product) {
    const next = !product.is_active;
    setProducts((prev) => prev.map((p) => (p.sku === product.sku ? { ...p, is_active: next } : p)));
    const res = await fetch(`/api/admin/products/${encodeURIComponent(product.sku)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      setProducts((prev) => prev.map((p) => (p.sku === product.sku ? { ...p, is_active: !next } : p)));
    }
  }

  function toggleSelect(sku: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.sku))));
  }

  async function deleteProducts(skus: string[]) {
    if (skus.length === 0) return;
    const confirmMsg =
      skus.length === 1
        ? t(`ลบสินค้า ${skus[0]} ใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)`, `Delete product ${skus[0]}? (This cannot be undone)`, `确定要删除商品 ${skus[0]} 吗？（删除后无法恢复）`)
        : t(`ลบสินค้าที่เลือกทั้งหมด ${skus.length} รายการ ใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)`, `Delete all ${skus.length} selected products? (This cannot be undone)`, `确定要删除所选的全部 ${skus.length} 件商品吗？（删除后无法恢复）`);
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    const results = await Promise.all(
      skus.map(async (sku) => {
        const res = await fetch(`/api/admin/products/${encodeURIComponent(sku)}`, { method: "DELETE" });
        return { sku, ok: res.ok };
      })
    );
    setDeleting(false);

    const succeeded = new Set(results.filter((r) => r.ok).map((r) => r.sku));
    setProducts((prev) => prev.filter((p) => !succeeded.has(p.sku)));
    setSelected((prev) => {
      const next = new Set(prev);
      succeeded.forEach((sku) => next.delete(sku));
      return next;
    });

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      alert(t(
        `ลบไม่สำเร็จ ${failed.length} รายการ: ${failed.map((f) => f.sku).join(", ")}`,
        `Failed to delete ${failed.length} item(s): ${failed.map((f) => f.sku).join(", ")}`,
        `删除失败 ${failed.length} 项：${failed.map((f) => f.sku).join(", ")}`
      ));
    }
  }

  const filtered = products.filter((p) => {
    const matchCat = catFilter === "all" || p.category_slug === catFilter;
    const matchSearch =
      !search ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.name_th.includes(search) ||
      p.name_en.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Grouped by category (in CATEGORIES order) when no single category is picked,
  // so chairs sit with chairs, sofas with sofas, etc. instead of one flat dump.
  const groups: { slug: string; name_th: string; name_en: string; name_zh: string; products: Product[] }[] =
    catFilter === "all"
      ? [...CATEGORIES]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => ({ slug: c.slug, name_th: c.name_th, name_en: c.name_en, name_zh: c.name_zh, products: filtered.filter((p) => p.category_slug === c.slug) }))
          .filter((g) => g.products.length > 0)
          .concat([
            {
              slug: "__uncategorized",
              name_th: "ไม่มีหมวดหมู่",
              name_en: "Uncategorized",
              name_zh: "未分类",
              products: filtered.filter((p) => !CATEGORIES.some((c) => c.slug === p.category_slug)),
            },
          ].filter((g) => g.products.length > 0))
      : [{ slug: catFilter, name_th: "", name_en: "", name_zh: "", products: filtered }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("จัดการสินค้า", "Manage Products", "商品管理")}</h1>
        <div className="flex gap-3">
          <Button size="sm" variant="outline">{t("นำเข้า CSV", "Import CSV", "导入CSV")}</Button>
          <Link href="/admin/products/new">
            <Button size="sm" className="bg-[#C8102E] hover:bg-[#a30d25] text-white gap-1">
              <Plus size={14} /> {t("เพิ่มสินค้า", "Add Product", "添加商品")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={14} />
          <Input
            placeholder={t("ค้นหา SKU / ชื่อ...", "Search SKU / name...", "搜索SKU/名称...")}
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
          <option value="all">{t("ทุกหมวดหมู่", "All Categories", "所有分类")}</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{t(c.name_th, c.name_en, c.name_zh)}</option>
          ))}
        </select>
        <p className="text-xs text-[#6B6B6B] self-center">
          {loading ? t("กำลังโหลด...", "Loading...", "加载中...") : t(`${filtered.length} รายการ`, `${filtered.length} items`, `${filtered.length} 项`)}
        </p>
        {filtered.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-[#6B6B6B] self-center cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size > 0 && selected.size === filtered.length}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5"
            />
            {t("เลือกทั้งหมด", "Select All", "全选")}
          </label>
        )}
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="destructive"
            disabled={deleting}
            onClick={() => deleteProducts(Array.from(selected))}
            className="h-9 gap-1 text-xs"
          >
            <Trash2 size={14} />
            {deleting ? t("กำลังลบ...", "Deleting...", "删除中...") : t(`ลบที่เลือก (${selected.size})`, `Delete Selected (${selected.size})`, `删除所选 (${selected.size})`)}
          </Button>
        )}
      </div>

      {/* Product grid — grouped by category when viewing all categories */}
      {groups.map((group) => (
        <div key={group.slug} className="space-y-4">
          {group.name_th && (
            <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2 pt-2">
              {t(group.name_th, group.name_en, group.name_zh)}
              <span className="text-xs font-normal text-[#9B9B9B]">({group.products.length})</span>
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.products.map((product) => (
              <div
            key={product.sku}
            className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
              !product.is_active ? "opacity-60" : ""
            }`}
          >
            <div className="relative aspect-video bg-[#FAF7F2]">
              <label className="absolute top-2 left-2 z-10 flex items-center justify-center h-5 w-5 rounded bg-white/90 shadow cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(product.sku)}
                  onChange={() => toggleSelect(product.sku)}
                  className="h-3.5 w-3.5"
                />
              </label>
              <Image
                src={product.images[0]}
                alt={product.name_th}
                fill
                sizes="80px"
                className="object-contain p-2"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                {product.is_featured && (
                  <Badge className="bg-[#C9A876] text-white text-[10px] px-1.5 py-0.5">{t("แนะนำ", "Featured", "推荐")}</Badge>
                )}
                {!product.is_active && (
                  <Badge className="bg-[#1A1A1A] text-white text-[10px] px-1.5 py-0.5">{t("ซ่อนอยู่", "Hidden", "已隐藏")}</Badge>
                )}
              </div>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-mono text-[#6B6B6B] mb-0.5">{product.sku}</p>
              <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1 mb-1">{product.name_th}</p>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STOCK_COLOR[product.stock_status]}`}>
                  {t(STOCK_LABEL[product.stock_status].th, STOCK_LABEL[product.stock_status].en, STOCK_LABEL[product.stock_status].zh)}
                </span>
                <span className="text-sm font-semibold text-[#C8102E]">
                  {product.price ? `฿${product.price.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href={`/admin/products/${encodeURIComponent(product.sku)}/edit`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                    {t("แก้ไข", "Edit", "编辑")}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActive(product)}
                  className="flex-1 h-7 text-xs gap-1"
                  title={product.is_active ? t("ซ่อนสินค้าจากหน้าเว็บ", "Hide product from website", "从网站隐藏商品") : t("แสดงสินค้าบนหน้าเว็บ", "Show product on website", "在网站上显示商品")}
                >
                  {product.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                  {product.is_active ? t("ซ่อนสินค้า", "Hide Product", "隐藏商品") : t("แสดงสินค้า", "Show Product", "显示商品")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => deleteProducts([product.sku])}
                  className="h-7 w-7 p-0 shrink-0"
                  title={t("ลบสินค้า", "Delete Product", "删除商品")}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
              {product.is_active && (
                <a
                  href={`/product/${encodeURIComponent(product.sku)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2"
                >
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs text-[#C8102E] border-[#C8102E]/30 hover:bg-[#C8102E]/5">
                    {t("ดูหน้า", "View Page", "查看页面")}
                  </Button>
                </a>
              )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
