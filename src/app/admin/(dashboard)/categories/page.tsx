"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (!cancelled) {
        setCategories((data as Category[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeImage(category: Category, file: File) {
    setUploadingSlug(category.slug);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/products/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      const patchRes = await fetch(`/api/admin/categories/${encodeURIComponent(category.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner_url: uploadData.url }),
      });
      if (!patchRes.ok) throw new Error("Save failed");

      setCategories((prev) =>
        prev.map((c) => (c.slug === category.slug ? { ...c, banner_url: uploadData.url } : c))
      );
    } catch {
      alert("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingSlug(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">จัดการรูปหมวดหมู่</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          รูปเหล่านี้ใช้แสดงในส่วน &ldquo;เลือกซื้อตามหมวดหมู่&rdquo; บนหน้าแรก และหน้าหมวดหมู่สินค้า
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B6B6B]">กำลังโหลด...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div key={cat.slug} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="relative aspect-square bg-[#FAF7F2]">
                <Image src={cat.banner_url} alt={cat.name_th} fill sizes="200px" className="object-cover" />
                {uploadingSlug === cat.slug && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#C8102E]" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1">{cat.name_th}</p>
                <button
                  type="button"
                  onClick={() => inputRefs.current[cat.slug]?.click()}
                  disabled={uploadingSlug === cat.slug}
                  className="w-full flex items-center justify-center gap-1.5 h-8 text-xs border border-[#E8E5E0] rounded-md hover:border-[#C8102E]/40 hover:bg-[#FAF7F2] transition-colors disabled:opacity-50"
                >
                  <Upload size={12} /> เปลี่ยนรูป
                </button>
                <input
                  ref={(el) => {
                    inputRefs.current[cat.slug] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) changeImage(cat, file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
