"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MOCK_QUOTES, PRODUCTS } from "@/data/mock";
import type { QuoteStatus } from "@/types";

const STATUSES: { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all",       label: "ทั้งหมด" },
  { value: "pending",   label: "รอตอบกลับ" },
  { value: "quoted",    label: "ส่งราคาแล้ว" },
  { value: "converted", label: "เปลี่ยนเป็นออเดอร์" },
  { value: "archived",  label: "เก็บถาวร" },
];

const STATUS_COLOR: Record<QuoteStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  quoted:    "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  archived:  "bg-[#E8E5E0] text-[#6B6B6B]",
};

export default function QuotesPage() {
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");

  const quotes = MOCK_QUOTES.filter(
    (q) => filter === "all" || q.status === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">คำขอใบเสนอราคา</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s.value
                ? "bg-[#C8102E] text-white"
                : "bg-[#E8E5E0] text-[#1A1A1A] hover:bg-[#d0cdc8]"
            }`}
          >
            {s.label}
            {s.value !== "all" && (
              <span className="ml-1.5 opacity-70">
                ({MOCK_QUOTES.filter((q) => q.status === s.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAF7F2]">
              <TableHead className="text-xs">วันที่</TableHead>
              <TableHead className="text-xs">สินค้า</TableHead>
              <TableHead className="text-xs">ลูกค้า</TableHead>
              <TableHead className="text-xs">บริษัท</TableHead>
              <TableHead className="text-xs">จำนวน</TableHead>
              <TableHead className="text-xs">สถานะ</TableHead>
              <TableHead className="text-xs">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  ไม่พบคำขอใบเสนอราคา
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => {
                const product = PRODUCTS.find((p) => p.id === quote.product_id);
                return (
                  <TableRow key={quote.id} className="hover:bg-[#FAF7F2]/50">
                    <TableCell className="text-xs text-[#6B6B6B]">
                      {new Date(quote.created_at).toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium line-clamp-1">{product?.name_th ?? "-"}</p>
                      <p className="text-xs font-mono text-[#6B6B6B]">{product?.sku}</p>
                    </TableCell>
                    <TableCell className="text-sm">{quote.customer_info.name}</TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">{quote.customer_info.company}</TableCell>
                    <TableCell className="text-sm text-center">{quote.quantity}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLOR[quote.status]}`}>
                        {STATUSES.find((s) => s.value === quote.status)?.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          ดู
                        </Button>
                        {quote.status === "pending" && (
                          <Button size="sm" className="h-7 text-xs bg-[#C8102E] hover:bg-[#a30d25] text-white">
                            ตอบกลับ
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
