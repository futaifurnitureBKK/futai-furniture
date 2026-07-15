"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Order, OrderStatus } from "@/types";

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
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (!cancelled) {
        setAllOrders(res.ok ? data.orders : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const orders = allOrders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search) {
      return (
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.name.includes(search) ||
        o.customer?.company?.toLowerCase().includes(search.toLowerCase())
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  ไม่พบออเดอร์
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-[#FAF7F2]/50">
                  <TableCell className="font-mono text-sm font-medium">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{order.customer?.name ?? "-"}</p>
                    <p className="text-xs text-[#6B6B6B]">{order.customer?.company}</p>
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
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        ดูรายละเอียด
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
