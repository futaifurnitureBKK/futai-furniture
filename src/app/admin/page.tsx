import Link from "next/link";
import { ShoppingBag, Package, Users, AlertCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_ORDERS, MOCK_CUSTOMERS, PRODUCTS, MOCK_QUOTES } from "@/data/mock";

const STATUS_LABEL: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังเตรียม",
  shipped: "จัดส่งแล้ว",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const KPI = [
  {
    title: "ออเดอร์รอดำเนินการ",
    value: MOCK_ORDERS.filter((o) => o.status === "pending").length,
    icon: AlertCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    href: "/admin/orders",
  },
  {
    title: "ออเดอร์ทั้งหมด",
    value: MOCK_ORDERS.length,
    icon: ShoppingBag,
    color: "text-blue-600",
    bg: "bg-blue-50",
    href: "/admin/orders",
  },
  {
    title: "สินค้าทั้งหมด",
    value: PRODUCTS.length,
    icon: Package,
    color: "text-[#C8102E]",
    bg: "bg-red-50",
    href: "/admin/products",
  },
  {
    title: "ลูกค้าทั้งหมด",
    value: MOCK_CUSTOMERS.length,
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-50",
    href: "/admin/customers",
  },
];

const TOP_PRODUCTS = [...PRODUCTS]
  .sort((a, b) => b.view_count - a.view_count)
  .slice(0, 5);

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">ภาพรวมธุรกิจ ฟู่ไท เฟอร์นิเจอร์</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/products"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            + เพิ่มสินค้า
          </Link>
          <Link
            href="/admin/orders"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-[#C8102E] hover:bg-[#a30d25] text-white"
            )}
          >
            ดูออเดอร์
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[#6B6B6B] mb-2">{kpi.title}</p>
                    <p className="text-3xl font-bold text-[#1A1A1A]">{kpi.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${kpi.bg}`}>
                    <kpi.icon size={20} className={kpi.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quote requests alert */}
      {MOCK_QUOTES.filter((q) => q.status === "pending").length > 0 && (
        <Card className="border-[#C8102E]/30 bg-[#C8102E]/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-[#C8102E] shrink-0" />
              <p className="text-sm text-[#1A1A1A]">
                มีคำขอใบเสนอราคา{" "}
                <strong>{MOCK_QUOTES.filter((q) => q.status === "pending").length}</strong>{" "}
                รายการรอตอบกลับ
              </p>
            </div>
            <Link
              href="/admin/quotes"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-[#C8102E] text-[#C8102E] shrink-0"
              )}
            >
              ดูทั้งหมด
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">คำสั่งซื้อล่าสุด</CardTitle>
              <Link href="/admin/orders" className="text-xs text-[#C8102E] hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_ORDERS.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-[#E8E5E0] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{order.order_number}</p>
                    <p className="text-xs text-[#6B6B6B]">
                      {new Date(order.created_at).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLOR[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">สินค้าดูมากที่สุด</CardTitle>
              <Link href="/admin/products" className="text-xs text-[#C8102E] hover:underline">
                จัดการสินค้า →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TOP_PRODUCTS.map((p, i) => (
                <div
                  key={p.sku}
                  className="flex items-center gap-3 py-2 border-b border-[#E8E5E0] last:border-0"
                >
                  <span className="text-xs text-[#6B6B6B] w-5 text-center font-mono">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{p.name_th}</p>
                    <p className="text-xs text-[#6B6B6B] font-mono">{p.sku}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                    <Eye size={12} />
                    {p.view_count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label: "สินค้าทั้งหมด", value: PRODUCTS.length },
              { label: "หมวดหมู่", value: 15 },
              { label: "สินค้ามีสต็อก", value: PRODUCTS.filter((p) => p.stock_status === "in_stock").length },
              { label: "สินค้า Featured", value: PRODUCTS.filter((p) => p.is_featured).length },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-[#1A1A1A]">{s.value}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
