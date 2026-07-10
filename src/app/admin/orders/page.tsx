"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MOCK_ORDERS, MOCK_CUSTOMERS } from "@/data/mock";
import type { OrderStatus } from "@/types";

const STATUSES: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all",       label: "ทั้งหมด" },
  { value: "pending",   label: "รอดำเนินการ" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "preparing", label: "กำลังเตรียม" },
  { value: "shipped",   label: "จัดส่งแล้ว" },
  { value: "delivered", label: "ส่งแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped:   "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  const orders = MOCK_ORDERS.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search) {
      const customer = MOCK_CUSTOMERS.find((c) => c.id === o.customer_id);
      return (
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        customer?.name.includes(search) ||
        customer?.company?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">คำสั่งซื้อ</h1>
        <Button size="sm" variant="outline">Export CSV</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="ค้นหา หมายเลข / ลูกค้า..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 h-9 text-sm"
        />
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
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAF7F2]">
              <TableHead className="text-xs">หมายเลขออเดอร์</TableHead>
              <TableHead className="text-xs">ลูกค้า</TableHead>
              <TableHead className="text-xs">วันที่</TableHead>
              <TableHead className="text-xs">วิธีรับ</TableHead>
              <TableHead className="text-xs">ยอดเงิน</TableHead>
              <TableHead className="text-xs">สถานะ</TableHead>
              <TableHead className="text-xs">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  ไม่พบออเดอร์
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const customer = MOCK_CUSTOMERS.find((c) => c.id === order.customer_id);
                return (
                  <TableRow key={order.id} className="hover:bg-[#FAF7F2]/50">
                    <TableCell className="font-mono text-sm font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{customer?.name ?? "-"}</p>
                      <p className="text-xs text-[#6B6B6B]">{customer?.company}</p>
                    </TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">
                      {new Date(order.created_at).toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {order.delivery_method === "delivery" ? "จัดส่ง" : "รับเอง"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.total ? `฿${order.total.toLocaleString()}` : (
                        <span className="text-[#C8102E]">ตามใบเสนอราคา</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUSES.find((s) => s.value === order.status)?.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        ดูรายละเอียด
                      </Button>
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
