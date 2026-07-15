"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Phone, Mail, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/browser";
import type { Order, OrderStatus } from "@/types";

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending",   label: "รอดำเนินการ" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "preparing", label: "กำลังเตรียม" },
  { value: "shipped",   label: "จัดส่งแล้ว" },
  { value: "delivered", label: "ส่งแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setOrder(data.order);
        else setError(data.error ?? "ไม่พบคำสั่งซื้อ");
        setLoading(false);
      }

      const skus = (data.order?.items as { sku: string }[] | undefined)?.map((i) => i.sku) ?? [];
      if (skus.length > 0) {
        const { data: products } = await supabase.from("products").select("sku, images").in("sku", skus);
        if (!cancelled && products) {
          const map: Record<string, string> = {};
          for (const p of products as { sku: string; images: string[] }[]) {
            if (p.images?.[0]) map[p.sku] = p.images[0];
          }
          setImages(map);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function changeStatus(status: OrderStatus) {
    if (!order) return;
    const prev = order.status;
    setOrder({ ...order, status });
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!res.ok) setOrder((o) => (o ? { ...o, status: prev } : o));
  }

  if (loading) return <p className="text-sm text-[#6B6B6B]">กำลังโหลด...</p>;
  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/orders" className="text-sm text-[#C8102E] flex items-center gap-1 w-fit">
          <ChevronLeft size={14} /> กลับไปคำสั่งซื้อ
        </Link>
        <p className="text-sm text-red-500">{error || "ไม่พบคำสั่งซื้อ"}</p>
      </div>
    );
  }

  const c = order.customer;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button
          onClick={() => router.push("/admin/orders")}
          className="text-sm text-[#C8102E] flex items-center gap-1 mb-3 hover:underline"
        >
          <ChevronLeft size={14} /> กลับไปคำสั่งซื้อ
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1A1A1A] font-mono">{order.order_number}</h1>
          <p className="text-xs text-[#6B6B6B]">
            {new Date(order.created_at).toLocaleString("th-TH")}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">สถานะคำสั่งซื้อ {saving && <span className="text-xs text-[#6B6B6B]">(กำลังบันทึก...)</span>}</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => changeStatus(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                order.status === s.value
                  ? "bg-[#C8102E] text-white"
                  : "bg-[#E8E5E0] text-[#1A1A1A] hover:bg-[#d0cdc8]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">ข้อมูลลูกค้า</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <p><span className="text-[#6B6B6B]">ชื่อ:</span> {c?.name ?? "-"}</p>
          <p><span className="text-[#6B6B6B]">บริษัท:</span> {c?.company || "-"}</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {c?.phone && (
            <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#FAF7F2] rounded-lg text-[#1A1A1A] hover:bg-[#E8E5E0]">
              <Phone size={12} /> {c.phone}
            </a>
          )}
          {c?.email && (
            <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#FAF7F2] rounded-lg text-[#1A1A1A] hover:bg-[#E8E5E0]">
              <Mail size={12} /> {c.email}
            </a>
          )}
          {c?.line_id && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#06C755]/10 rounded-lg text-[#06C755] font-medium">
              <MessageCircle size={12} /> {c.line_id}
            </span>
          )}
        </div>
        {order.delivery_method === "delivery" && c?.address && (
          <div className="flex items-start gap-1.5 text-sm mt-3 pt-3 border-t border-[#E8E5E0]">
            <MapPin size={14} className="text-[#6B6B6B] shrink-0 mt-0.5" />
            <span>{c.address}</span>
          </div>
        )}
        <p className="text-xs text-[#6B6B6B] mt-3">
          วิธีรับสินค้า: <span className="font-medium text-[#1A1A1A]">{order.delivery_method === "delivery" ? "จัดส่ง" : "รับที่โชว์รูม"}</span>
        </p>
        {order.notes && (
          <p className="text-xs text-[#6B6B6B] mt-2">หมายเหตุ: <span className="text-[#1A1A1A]">{order.notes}</span></p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">รายการสินค้า</p>
        <div className="divide-y divide-[#E8E5E0]">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#FAF7F2] border border-[#E8E5E0] shrink-0">
                {images[item.sku] ? (
                  <Image src={images[item.sku]} alt={item.name_snapshot} fill sizes="48px" className="object-contain p-1" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-[#C8C5BE]">ไม่มีรูป</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1A1A1A] line-clamp-1">{item.name_snapshot}</p>
                <p className="text-xs font-mono text-[#6B6B6B]">{item.sku} × {item.quantity}</p>
              </div>
              <p className="text-[#1A1A1A] shrink-0">
                {item.price_snapshot != null ? `฿${(item.price_snapshot * item.quantity).toLocaleString()}` : "ตามใบเสนอราคา"}
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-3 mt-2 border-t border-[#E8E5E0] font-semibold text-[#1A1A1A]">
          <span>ยอดรวม</span>
          <span>{order.total != null ? `฿${order.total.toLocaleString()}` : "ตามใบเสนอราคา"}</span>
        </div>
      </div>
    </div>
  );
}
