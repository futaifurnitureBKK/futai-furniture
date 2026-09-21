"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUS_META, STATUS_ORDER, CHANNEL_META, DOC_LABELS } from "@/lib/saved-quote-options";
import type { SavedQuote, SavedQuoteStatus } from "@/types";

// This page exists to answer "what needs shipping" — lead with that
// column and give it more room than the rest.
const DISPLAY_ORDER: SavedQuoteStatus[] = [
  "awaiting_shipment",
  "confirmed",
  "in_progress",
  "pending",
  "completed",
];

type Row = Pick<
  SavedQuote,
  "id" | "doc_type" | "doc_no" | "customer_name" | "doc_date" | "status" | "channel" | "shipping_date" | "shipping_address" | "updated_at"
>;

export default function ShippingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setLoading(true);
      const res = await fetch("/api/admin/saved-quotes");
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setRows(data.quotes);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateStatus(id: number, status: SavedQuoteStatus) {
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await fetch(`/api/admin/saved-quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setRows(prev);
  }

  const columns = useMemo(
    () =>
      DISPLAY_ORDER.map((s) => {
        const colRows = rows.filter((r) => r.status === s);
        if (s === "awaiting_shipment") {
          colRows.sort((a, b) => (a.shipping_date || "9999").localeCompare(b.shipping_date || "9999"));
        }
        return { key: s, rows: colRows };
      }),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">จัดส่งสินค้า</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          ติดตามสถานะใบเสนอราคา/ใบแจ้งหนี้/ใบส่งของ ตั้งแต่รอตอบกลับจนถึงจัดส่งเสร็จ
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">กำลังโหลด...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12 text-center text-sm text-[#6B6B6B]">
          ยังไม่มีเอกสาร — สร้างได้ที่หน้า &quot;สร้างใบเสนอราคา&quot;
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-start">
          {columns.map((col) => {
            const meta = STATUS_META[col.key];
            const isMain = col.key === "awaiting_shipment";
            return (
              <div
                key={col.key}
                className={`rounded-xl border overflow-hidden bg-white ${
                  isMain ? "xl:col-span-2 ring-2 ring-purple-300" : ""
                }`}
              >
                <div className={`px-4 py-3 flex items-center justify-between ${meta.color}`}>
                  <p className={isMain ? "text-base font-bold" : "text-sm font-semibold"}>{meta.th}</p>
                  <span className="text-xs font-bold bg-black/10 rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                    {col.rows.length}
                  </span>
                </div>

                <div
                  className={`p-2.5 gap-2.5 max-h-[70vh] overflow-y-auto ${
                    isMain ? "grid grid-cols-1 sm:grid-cols-2 content-start" : "space-y-2.5"
                  }`}
                >
                  {col.rows.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF] text-center py-6 col-span-full">ไม่มีรายการ</p>
                  ) : (
                    col.rows.map((r) => (
                      <div key={r.id} className="bg-[#FAF7F2] rounded-lg p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{r.customer_name || "-"}</p>
                            <p className="text-[10px] text-[#9CA3AF] font-mono">{r.doc_no}</p>
                          </div>
                          <Link
                            href={`/admin/quote-builder?open=${r.id}`}
                            className={buttonVariants({ size: "sm", variant: "outline" })}
                          >
                            เปิด
                          </Link>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#6B6B6B]">
                          <span className="bg-white rounded px-1.5 py-0.5">{DOC_LABELS[r.doc_type].th}</span>
                          <span className="bg-white rounded px-1.5 py-0.5">{CHANNEL_META[r.channel].th}</span>
                          <span className="bg-white rounded px-1.5 py-0.5">{r.doc_date}</span>
                        </div>

                        {r.shipping_date && <p className="text-[10px] text-[#6B6B6B]">กำหนดส่ง: {r.shipping_date}</p>}
                        {r.shipping_address && (
                          <p className="text-xs text-[#6B6B6B] line-clamp-2">{r.shipping_address}</p>
                        )}

                        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as SavedQuoteStatus)}>
                          <SelectTrigger
                            size="sm"
                            className={`w-full h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${STATUS_META[r.status].color}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_ORDER.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_META[s].th}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
