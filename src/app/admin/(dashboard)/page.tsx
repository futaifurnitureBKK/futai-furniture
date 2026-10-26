"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Package,
  Users,
  AlertCircle,
  Eye,
  BarChart3,
  Wallet,
  ImageOff,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/browser";
import { useLanguage } from "@/store/language";
import type { Order, Customer, QuoteRequest, Product, Category } from "@/types";

interface VisitStats {
  totalViews: number;
  totalVisitors: number;
  todayViews: number;
  todayVisitors: number;
}

interface UnpaidQuote {
  id: number;
  doc_no: string;
  customer_name: string;
  doc_date: string;
  salesperson: string;
  total: number;
  totalPaid: number;
  remaining: number;
  paidPct: number;
  lastPaidDate: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function money(n: number) {
  return "฿" + Math.round(n).toLocaleString("th-TH");
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const STATUS_LABEL: Record<string, string> = {
    pending: t("รอดำเนินการ", "Pending", "待处理"),
    confirmed: t("ยืนยันแล้ว", "Confirmed", "已确认"),
    preparing: t("กำลังเตรียม", "Preparing", "备货中"),
    shipped: t("จัดส่งแล้ว", "Shipped", "已发货"),
    delivered: t("ส่งแล้ว", "Delivered", "已送达"),
    cancelled: t("ยกเลิก", "Cancelled", "已取消"),
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [unpaidQuotes, setUnpaidQuotes] = useState<UnpaidQuote[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ordersRes, customersRes, quotesRes, productsRes, categoriesRes, visitsRes, unpaidRes] =
        await Promise.all([
          fetch("/api/admin/orders"),
          fetch("/api/admin/customers"),
          fetch("/api/admin/quotes"),
          supabase.from("products").select("*"),
          supabase.from("categories").select("*"),
          fetch("/api/admin/visits"),
          fetch("/api/admin/saved-quotes/unpaid"),
        ]);
      const ordersData = await ordersRes.json();
      const customersData = await customersRes.json();
      const quotesData = await quotesRes.json();
      const visitsData = await visitsRes.json();
      const unpaidData = await unpaidRes.json();
      if (!cancelled) {
        setOrders(ordersRes.ok ? ordersData.orders : []);
        setCustomers(customersRes.ok ? customersData.customers : []);
        setQuotes(quotesRes.ok ? quotesData.quotes : []);
        setProducts((productsRes.data as Product[]) ?? []);
        setCategories((categoriesRes.data as Category[]) ?? []);
        setVisits(visitsRes.ok ? visitsData : null);
        setUnpaidQuotes(unpaidRes.ok ? unpaidData.quotes : []);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
  const pendingQuotesCount = quotes.filter((q) => q.status === "pending").length;
  const unpaidTotal = unpaidQuotes.reduce((sum, q) => sum + q.remaining, 0);
  const topProducts = [...products].sort((a, b) => b.view_count - a.view_count).slice(0, 5);
  const hasAnyViews = topProducts.some((p) => p.view_count > 0);
  const needsAttention = pendingOrdersCount > 0 || pendingQuotesCount > 0 || unpaidQuotes.length > 0;

  const KPI = [
    {
      title: t("ออเดอร์รอดำเนินการ", "Pending Orders", "待处理订单"),
      value: pendingOrdersCount,
      icon: AlertCircle,
      tone: "alert" as const,
      href: "/admin/orders",
    },
    {
      title: t("ใบเสนอราคาค้างชำระ", "Unpaid Quotes", "待收款报价单"),
      value: unpaidQuotes.length,
      sub: unpaidQuotes.length > 0 ? money(unpaidTotal) : undefined,
      icon: Wallet,
      tone: "alert" as const,
      href: "/admin/unpaid-quotes",
    },
    {
      title: t("ออเดอร์ทั้งหมด", "Total Orders", "订单总数"),
      value: orders.length,
      icon: ShoppingBag,
      tone: "neutral" as const,
      href: "/admin/orders",
    },
    {
      title: t("สินค้าทั้งหมด", "Total Products", "产品总数"),
      value: products.length,
      icon: Package,
      tone: "neutral" as const,
      href: "/admin/products",
    },
    {
      title: t("ลูกค้าทั้งหมด", "Total Customers", "客户总数"),
      value: customers.length,
      icon: Users,
      tone: "neutral" as const,
      href: "/admin/customers",
    },
    {
      title: t("คนเข้าชมวันนี้", "Visitors Today", "今日访客"),
      value: visits?.todayVisitors ?? 0,
      icon: BarChart3,
      tone: "neutral" as const,
      href: "/admin",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t("ภาพรวมธุรกิจ ฟูไท่ เฟอร์นิเจอร์", "Futai Furniture business overview", "富泰家具业务概览")}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            + {t("เพิ่มสินค้า", "Add Product", "添加产品")}
          </Link>
          <Link
            href="/admin/orders"
            className={cn(buttonVariants({ size: "sm" }), "bg-[#C8102E] hover:bg-[#a30d25] text-white")}
          >
            {t("ดูออเดอร์", "View Orders", "查看订单")}
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {KPI.map((kpi) => (
          <Link key={kpi.title} href={kpi.href} className="group">
            <Card
              className={cn(
                "transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full ring-1",
                kpi.tone === "alert" && kpi.value > 0
                  ? "ring-[#C8102E]/20 bg-[#FFF8F8]"
                  : "ring-[#E8E5E0] bg-white"
              )}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg",
                      kpi.tone === "alert" && kpi.value > 0
                        ? "bg-[#C8102E] text-white"
                        : "bg-[#F5F3EF] text-[#1A1A1A]"
                    )}
                  >
                    <kpi.icon size={16} />
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-[#C8C5BE] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A] leading-none">{kpi.value}</p>
                  <p className="text-[11px] text-[#9B9B9B] mt-2 leading-tight">{kpi.title}</p>
                  {kpi.sub && <p className="text-[11px] font-semibold text-[#C8102E] mt-0.5">{kpi.sub}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Needs-attention strip */}
      {needsAttention && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#C8102E]/25 bg-[#FFF8F8] px-5 py-3.5">
          <AlertCircle size={17} className="text-[#C8102E] shrink-0" />
          <p className="text-sm text-[#1A1A1A] flex-1 min-w-[200px]">
            {pendingOrdersCount > 0 && (
              <>
                <strong>{pendingOrdersCount}</strong> {t("ออเดอร์รอดำเนินการ", "orders pending", "个待处理订单")}
                {(pendingQuotesCount > 0 || unpaidQuotes.length > 0) && " · "}
              </>
            )}
            {pendingQuotesCount > 0 && (
              <>
                <strong>{pendingQuotesCount}</strong> {t("คำขอใบเสนอราคารอตอบกลับ", "quote requests awaiting reply", "个报价请求待回复")}
                {unpaidQuotes.length > 0 && " · "}
              </>
            )}
            {unpaidQuotes.length > 0 && (
              <>
                <strong>{unpaidQuotes.length}</strong> {t("ใบเสนอราคาค้างชำระ", "unpaid quotes", "个待收款报价单")} ({money(unpaidTotal)})
              </>
            )}
          </p>
          <div className="flex gap-2">
            {pendingQuotesCount > 0 && (
              <Link href="/admin/quotes" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-[#C8102E] text-[#C8102E]")}>
                {t("ดูคำขอ", "View Requests", "查看请求")}
              </Link>
            )}
            {unpaidQuotes.length > 0 && (
              <Link href="/admin/unpaid-quotes" className={cn(buttonVariants({ size: "sm" }), "bg-[#C8102E] hover:bg-[#a30d25] text-white")}>
                {t("ดูค้างชำระ", "View Unpaid", "查看待收款")}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="ring-[#E8E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("คำสั่งซื้อล่าสุด", "Recent Orders", "最近订单")}</CardTitle>
              <Link href="/admin/orders" className="text-xs text-[#C8102E] hover:underline">
                {t("ดูทั้งหมด", "View All", "查看全部")} →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-sm text-[#6B6B6B] py-4 text-center">{t("ยังไม่มีคำสั่งซื้อ", "No orders yet", "暂无订单")}</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b border-[#F0EDE8] last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{order.order_number}</p>
                      <p className="text-xs text-[#9B9B9B]">{new Date(order.created_at).toLocaleDateString("th-TH")}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLOR[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unpaid quotes */}
        <Card className="ring-[#E8E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("ใบเสนอราคาค้างชำระ", "Unpaid Quotes", "待收款报价单")}</CardTitle>
              <Link href="/admin/unpaid-quotes" className="text-xs text-[#C8102E] hover:underline">
                {t("ดูทั้งหมด", "View All", "查看全部")} →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unpaidQuotes.length === 0 ? (
                <p className="text-sm text-[#6B6B6B] py-4 text-center">
                  {t("ไม่มีรายการค้างชำระ", "No outstanding balances", "暂无待收款报价单")}
                </p>
              ) : (
                unpaidQuotes.slice(0, 5).map((q) => (
                  <div key={q.id} className="py-2 border-b border-[#F0EDE8] last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{q.customer_name || q.doc_no}</p>
                        <p className="text-xs text-[#9B9B9B]">{q.doc_no}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#C8102E] shrink-0 ml-3">{money(q.remaining)}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F0EDE8] overflow-hidden">
                      <div
                        className="h-full bg-[#C8102E]/70 rounded-full"
                        style={{ width: `${Math.min(100, q.paidPct)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="ring-[#E8E5E0]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("สินค้าดูมากที่สุด", "Most Viewed Products", "浏览最多的产品")}</CardTitle>
            <Link href="/admin/products" className="text-xs text-[#C8102E] hover:underline">
              {t("จัดการสินค้า", "Manage Products", "管理产品")} →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loaded && topProducts.length === 0 ? (
            <p className="text-sm text-[#6B6B6B] py-4 text-center">{t("ยังไม่มีสินค้า", "No products yet", "暂无产品")}</p>
          ) : (
            <>
              {loaded && !hasAnyViews && (
                <p className="text-xs text-[#9B9B9B] mb-3">
                  {t("ยังไม่มีข้อมูลยอดเข้าชม — แสดงสินค้าที่เพิ่มล่าสุด", "No view data yet — showing recently added products", "暂无浏览数据 — 显示最近添加的产品")}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {topProducts.map((p, i) => (
                  <Link
                    key={p.sku}
                    href="/admin/products"
                    className="group flex flex-col gap-2 rounded-lg border border-[#E8E5E0] p-2.5 hover:border-[#C8102E]/40 hover:shadow-sm transition-all"
                  >
                    <div className="relative aspect-square rounded-md overflow-hidden bg-[#F5F3EF]">
                      {p.images?.[0] ? (
                        <Image src={p.images[0]} alt={p.name_th} fill sizes="160px" className="object-contain p-1.5" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#C8C5BE]">
                          <ImageOff size={22} />
                        </div>
                      )}
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-mono flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1A1A1A] truncate" title={p.name_th}>
                        {p.name_th}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-[#9B9B9B] font-mono truncate">{p.sku}</p>
                        <div className="flex items-center gap-0.5 text-[10px] text-[#9B9B9B] shrink-0">
                          <Eye size={10} />
                          {p.view_count}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      <Card className="ring-[#E8E5E0]">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            {[
              { label: t("สินค้าทั้งหมด", "Total Products", "产品总数"), value: products.length },
              { label: t("หมวดหมู่", "Categories", "分类"), value: categories.length },
              { label: t("สินค้ามีสต็อก", "In Stock", "有库存"), value: products.filter((p) => p.stock_status === "in_stock").length },
              { label: t("สินค้า Featured", "Featured Products", "推荐产品"), value: products.filter((p) => p.is_featured).length },
              { label: t("คนเข้าชมทั้งหมด", "Total Visitors", "访客总数"), value: visits?.totalVisitors ?? 0 },
              { label: t("ยอดเข้าชมทั้งหมด", "Total Views", "浏览总数"), value: visits?.totalViews ?? 0 },
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
