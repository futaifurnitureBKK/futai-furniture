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

interface ColorVariantInput {
  label_th: string;
  hex: string;
  images: string[];
}

export interface ProductFormValues {
  sku: string;
  name_th: string;
  category_slug: string;
  description_th: string;
  dimensions: string;
  price: string;
  stock_status: StockStatus;
  images: string[];
  tags: string;
  colorVariants: ColorVariantInput[];
  is_featured: boolean;
  is_active: boolean;
}

function toFormValues(p?: Product): ProductFormValues {
  return {
    sku: p?.sku ?? "",
    name_th: p?.name_th ?? "",
    category_slug: p?.category_slug ?? CATEGORIES[0].slug,
    description_th: p?.description_th ?? "",
    dimensions: p?.dimensions ?? "",
    price: p?.price != null ? String(p.price) : "",
    stock_status: p?.stock_status ?? "in_stock",
    images: p?.images ?? [],
    tags: p?.tags?.join(", ") ?? "",
    colorVariants: p?.color_variants?.map((v) => ({ label_th: v.label_th, hex: v.hex, images: v.images })) ?? [],
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

  function addColorVariant() {
    set("colorVariants", [...values.colorVariants, { label_th: "", hex: "#C8102E", images: [] }]);
  }

  function updateColorVariant(idx: number, patch: Partial<ColorVariantInput>) {
    set(
      "colorVariants",
      values.colorVariants.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    );
  }

  function removeColorVariant(idx: number) {
    set(
      "colorVariants",
      values.colorVariants.filter((_, i) => i !== idx)
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      sku: values.sku.trim(),
      name_th: values.name_th.trim(),
      category_slug: values.category_slug,
      description_th: values.description_th.trim(),
      dimensions: values.dimensions.trim(),
      price: values.price.trim() === "" ? null : Number(values.price),
      stock_status: values.stock_status,
      images: values.images,
      tags: values.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      color_variants: values.colorVariants
        .filter((v) => v.label_th.trim())
        .map((v) => ({ label_th: v.label_th.trim(), hex: v.hex, images: v.images })),
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

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">ชื่อสินค้า (ไทย)</label>
          <Input value={values.name_th} onChange={(e) => set("name_th", e.target.value)} required />
          <p className="text-xs text-[#9B9B9B] mt-1">ระบบจะแปลเป็นอังกฤษและจีนให้อัตโนมัติตอนบันทึก</p>
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
          <p className="text-xs text-[#9B9B9B] mt-1">ระบบจะแปลเป็นอังกฤษและจีนให้อัตโนมัติตอนบันทึก</p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">รูปภาพสินค้า</label>
          <ImageUploader images={values.images} onChange={(images) => set("images", images)} />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-[#1A1A1A]">ตัวเลือกสี (ถ้ามี)</label>
            <Button type="button" variant="outline" size="sm" onClick={addColorVariant}>
              + เพิ่มสี
            </Button>
          </div>
          {values.colorVariants.length === 0 ? (
            <p className="text-xs text-[#9B9B9B]">ยังไม่มีตัวเลือกสี — สินค้านี้จะแสดงแค่รูปหลักด้านบน</p>
          ) : (
            <div className="space-y-4">
              {values.colorVariants.map((v, i) => (
                <div key={i} className="rounded-lg border border-[#E8E5E0] p-3 space-y-3">
                  <ImageUploader
                    images={v.images}
                    onChange={(images) => updateColorVariant(i, { images })}
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={v.hex}
                      onChange={(e) => updateColorVariant(i, { hex: e.target.value })}
                      className="h-9 w-9 shrink-0 rounded border border-[#E8E5E0] cursor-pointer"
                    />
                    <Input
                      value={v.label_th}
                      onChange={(e) => updateColorVariant(i, { label_th: e.target.value })}
                      placeholder="ชื่อสี เช่น เขียวเซจ"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeColorVariant(i)}
                      className="shrink-0 text-[#C8102E] border-[#C8102E]/30 hover:bg-[#C8102E]/5"
                    >
                      ลบสีนี้
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-[#9B9B9B] mt-1">ระบบจะแปลชื่อสีเป็นอังกฤษและจีนให้อัตโนมัติตอนบันทึก</p>
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
          {saving ? "กำลังแปลและบันทึก..." : "บันทึก"}
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
