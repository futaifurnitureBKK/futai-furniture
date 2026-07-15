"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CATEGORIES } from "@/data/mock";
import type { Product, StockStatus } from "@/types";

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: "in_stock", label: "มีสินค้า" },
  { value: "out_of_stock", label: "สินค้าหมด" },
  { value: "on_order", label: "สั่งจอง" },
];

export interface ProductFormValues {
  sku: string;
  name_th: string;
  name_en: string;
  name_zh: string;
  category_slug: string;
  description_th: string;
  description_en: string;
  description_zh: string;
  dimensions: string;
  price: string;
  stock_status: StockStatus;
  images: string[];
  tags: string;
  is_featured: boolean;
  is_active: boolean;
}

function toFormValues(p?: Product): ProductFormValues {
  return {
    sku: p?.sku ?? "",
    name_th: p?.name_th ?? "",
    name_en: p?.name_en ?? "",
    name_zh: p?.name_zh ?? "",
    category_slug: p?.category_slug ?? CATEGORIES[0].slug,
    description_th: p?.description_th ?? "",
    description_en: p?.description_en ?? "",
    description_zh: p?.description_zh ?? "",
    dimensions: p?.dimensions ?? "",
    price: p?.price != null ? String(p.price) : "",
    stock_status: p?.stock_status ?? "in_stock",
    images: p?.images ?? [],
    tags: p?.tags?.join(", ") ?? "",
    is_featured: p?.is_featured ?? false,
    is_active: p?.is_active ?? true,
  };
}

export function ProductForm({
  mode,
  product,
}: {
  mode: "new" | "edit";
  product?: Product;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(toFormValues(product));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      sku: values.sku.trim(),
      name_th: values.name_th.trim(),
      name_en: values.name_en.trim(),
      name_zh: values.name_zh.trim(),
      category_slug: values.category_slug,
      description_th: values.description_th.trim(),
      description_en: values.description_en.trim(),
      description_zh: values.description_zh.trim(),
      dimensions: values.dimensions.trim(),
      price: values.price.trim() === "" ? null : Number(values.price),
      stock_status: values.stock_status,
      images: values.images,
      tags: values.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      is_featured: values.is_featured,
      is_active: values.is_active,
    };

    const url = mode === "new" ? "/api/admin/products" : `/api/admin/products/${encodeURIComponent(product!.sku)}`;
    const method = mode === "new" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm(`ลบสินค้า ${product.sku} ใช่หรือไม่?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/products/${encodeURIComponent(product.sku)}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
    } else {
      setError("ลบไม่สำเร็จ");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">SKU</label>
          <Input
            value={values.sku}
            onChange={(e) => set("sku", e.target.value)}
            disabled={mode === "edit"}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">หมวดหมู่</label>
          <select
            value={values.category_slug}
            onChange={(e) => set("category_slug", e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-[#E8E5E0] text-sm bg-white text-[#1A1A1A]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name_th}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">ชื่อสินค้า (ไทย)</label>
          <Input value={values.name_th} onChange={(e) => set("name_th", e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">ชื่อสินค้า (English)</label>
          <Input value={values.name_en} onChange={(e) => set("name_en", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">ชื่อสินค้า (中文)</label>
          <Input value={values.name_zh} onChange={(e) => set("name_zh", e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">ราคา (บาท)</label>
          <Input type="number" value={values.price} onChange={(e) => set("price", e.target.value)} placeholder="เว้นว่างถ้าให้ขอใบเสนอราคา" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">สถานะสต็อก</label>
          <select
            value={values.stock_status}
            onChange={(e) => set("stock_status", e.target.value as StockStatus)}
            className="w-full h-9 px-3 rounded-md border border-[#E8E5E0] text-sm bg-white text-[#1A1A1A]"
          >
            {STOCK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">ขนาด (เช่น 120x60x75 cm)</label>
          <Input value={values.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">รายละเอียด (ไทย)</label>
          <RichTextEditor
            value={values.description_th}
            onChange={(html) => set("description_th", html)}
            placeholder="รายละเอียดสินค้า..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">รายละเอียด (English)</label>
          <RichTextEditor
            value={values.description_en}
            onChange={(html) => set("description_en", html)}
            placeholder="Product description..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">รายละเอียด (中文)</label>
          <RichTextEditor
            value={values.description_zh}
            onChange={(html) => set("description_zh", html)}
            placeholder="产品说明..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">รูปภาพสินค้า</label>
          <ImageUploader images={values.images} onChange={(images) => set("images", images)} />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">แท็ก (คั่นด้วยจุลภาค)</label>
          <Input value={values.tags} onChange={(e) => set("tags", e.target.value)} placeholder="เออร์โกโนมิกส์, ผู้บริหาร" />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="is_featured"
            type="checkbox"
            checked={values.is_featured}
            onChange={(e) => set("is_featured", e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="is_featured" className="text-sm text-[#1A1A1A]">แสดงเป็นสินค้าแนะนำ (Featured)</label>
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="is_active"
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="is_active" className="text-sm text-[#1A1A1A]">
            แสดงสินค้าบนหน้าเว็บ {!values.is_active && <span className="text-[#C8102E]">(ปัจจุบันซ่อนอยู่ ลูกค้าจะไม่เห็นสินค้านี้)</span>}
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-[#C8102E]">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="bg-[#C8102E] hover:bg-[#a30d25] text-white">
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          ยกเลิก
        </Button>
        {mode === "edit" && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto text-[#C8102E] border-[#C8102E]/30 hover:bg-[#C8102E]/5"
          >
            {deleting ? "กำลังลบ..." : "ลบสินค้า"}
          </Button>
        )}
      </div>
    </form>
  );
}
