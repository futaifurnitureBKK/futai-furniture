"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Phone, Mail, MessageCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import type { QuoteRequest, QuoteStatus } from "@/types";

const STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "pending",   label: "รอตอบกลับ" },
  { value: "quoted",    label: "ส่งราคาแล้ว" },
  { value: "converted", label: "เปลี่ยนเป็นออเดอร์" },
  { value: "archived",  label: "เก็บถาวร" },
];

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/quotes/${id}`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setQuote(data.quote);
        else setError(data.error ?? "ไม่พบคำขอใบเสนอราคา");
        setLoading(false);
      }

      const sku = data.quote?.product_sku as string | undefined;
      if (sku) {
        const { data: product } = await supabase.from("products").select("images").eq("sku", sku).maybeSingle();
        if (!cancelled && product?.images?.[0]) setImage(product.images[0]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function changeStatus(status: QuoteStatus) {
    if (!quote) return;
    const prev = quote.status;
    setQuote({ ...quote, status });
    setSaving(true);
    const res = await fetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!res.ok) setQuote((q) => (q ? { ...q, status: prev } : q));
  }

  async function deleteQuote() {
    if (!confirm("ลบคำขอใบเสนอราคานี้ใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)")) return;
    const res = await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/quotes");
    } else {
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  if (loading) return <p className="text-sm text-[#6B6B6B]">กำลังโหลด...</p>;
  if (error || !quote) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/admin/quotes")}
          className="text-sm text-[#C8102E] flex items-center gap-1 w-fit hover:underline"
        >
          <ChevronLeft size={14} /> กลับไปใบเสนอราคา
        </button>
        <p className="text-sm text-red-500">{error || "ไม่พบคำขอใบเสนอราคา"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button
          onClick={() => router.push("/admin/quotes")}
          className="text-sm text-[#C8102E] flex items-center gap-1 mb-3 hover:underline"
        >
          <ChevronLeft size={14} /> กลับไปใบเสนอราคา
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">คำขอใบเสนอราคา</h1>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#6B6B6B]">
              {new Date(quote.created_at).toLocaleString("th-TH")}
            </p>
            <button
              onClick={deleteQuote}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50"
            >
              <Trash2 size={12} /> ลบ
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">สถานะ {saving && <span className="text-xs text-[#6B6B6B]">(กำลังบันทึก...)</span>}</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => changeStatus(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                quote.status === s.value
                  ? "bg-[#C8102E] text-white"
                  : "bg-[#E8E5E0] text-[#1A1A1A] hover:bg-[#d0cdc8]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">สินค้าที่สอบถาม</p>
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#FAF7F2] border border-[#E8E5E0] shrink-0">
            {image ? (
              <Image src={image} alt={quote.product_name_snapshot} fill sizes="64px" className="object-contain p-1" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-[#C8C5BE]">ไม่มีรูป</div>
            )}
          </div>
          <div>
            <p className="text-sm">{quote.product_name_snapshot || "-"}</p>
            <p className="text-xs font-mono text-[#6B6B6B]">{quote.product_sku}</p>
          </div>
        </div>
        <p className="text-xs text-[#6B6B6B] mt-3">จำนวนที่ต้องการ: <span className="font-medium text-[#1A1A1A]">{quote.quantity}</span></p>
        {quote.message && (
          <p className="text-sm text-[#1A1A1A] mt-3 pt-3 border-t border-[#E8E5E0]">{quote.message}</p>
        )}
      </div>

      {/* Customer */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">ข้อมูลลูกค้า</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <p><span className="text-[#6B6B6B]">ชื่อ:</span> {quote.name}</p>
          <p><span className="text-[#6B6B6B]">บริษัท:</span> {quote.company || "-"}</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {quote.phone && (
            <a href={`tel:${quote.phone}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#FAF7F2] rounded-lg text-[#1A1A1A] hover:bg-[#E8E5E0]">
              <Phone size={12} /> {quote.phone}
            </a>
          )}
          {quote.email && (
            <a href={`mailto:${quote.email}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#FAF7F2] rounded-lg text-[#1A1A1A] hover:bg-[#E8E5E0]">
              <Mail size={12} /> {quote.email}
            </a>
          )}
          {quote.line_id && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#06C755]/10 rounded-lg text-[#06C755] font-medium">
              <MessageCircle size={12} /> {quote.line_id}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
