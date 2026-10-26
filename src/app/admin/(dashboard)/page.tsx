"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Users,
  AlertCircle,
  Eye,
  Wallet,
  ImageOff,
  ArrowUpRight,
  Banknote,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/browser";
import { useLanguage } from "@/store/language";
import { computeGrandTotal } from "@/lib/saved-quote-options";
import type { Order, Customer, QuoteRequest, Product, Category, SavedQuoteItem } from "@/types";

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

interface DailySalesRow {
  id: number;
  sale_date: string;
  sku: string;
  unit_price: number;
  qty: number;
  customer_name: string;
}

interface DailyShippingRow {
  id: number;
  ship_date: string;
  sku: string;
  qty: number;
  customer_name: string;
  consignee: string;
}

interface SavedQuoteListItem {
  doc_type: string;
  doc_date: string;
  salesperson: string | null;
  items: SavedQuoteItem[];
  discount_pct: number;
  vat_pct: number;
  archived: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const WEEKDAY_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function money(n: number) {
  return "฿" + Math.round(n).toLocaleString("th-TH");
}

function moneyCompact(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(Math.round(n));
}

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const [weekSales, setWeekSales] = useState<DailySalesRow[]>([]);
  const [todayShipping, setTodayShipping] = useState<DailyShippingRow[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuoteListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const weekStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toLocalDateStr(d);
  }, []);
  const monthPrefix = todayStr.slice(0, 7); // "YYYY-MM"

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        ordersRes,
        customersRes,
        quotesRes,
        productsRes,
        categoriesRes,
        visitsRes,
        unpaidRes,
        weekSalesRes,
        shippingRes,
        savedQuotesRes,
      ] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/admin/customers"),
        fetch("/api/admin/quotes"),
        supabase.from("products").select("*"),
        supabase.from("categories").select("*"),
        fetch("/api/admin/visits"),
        fetch("/api/admin/saved-quotes/unpaid"),
        fetch(`/api/admin/daily-sales?from=${weekStartStr}&to=${todayStr}`),
        fetch(`/api/admin/daily-shipping?date=${todayStr}`),
        fetch("/api/admin/saved-quotes?archived=false"),
      ]);
      const ordersData = await ordersRes.json();
      const customersData = await customersRes.json();
      const quotesData = await quotesRes.json();
      const visitsData = await visitsRes.json();
      const unpaidData = await unpaidRes.json();
      const weekSalesData = await weekSalesRes.json();
      const shippingData = await shippingRes.json();
      const savedQuotesData = await savedQuotesRes.json();
      if (!cancelled) {
        setOrders(ordersRes.ok ? ordersData.orders : []);
        setCustomers(customersRes.ok ? customersData.customers : []);
        setQuotes(quotesRes.ok ? quotesData.quotes : []);
        setProducts((productsRes.data as Product[]) ?? []);
        setCategories((categoriesRes.data as Category[]) ?? []);
        setVisits(visitsRes.ok ? visitsData : null);
        setUnpaidQuotes(unpaidRes.ok ? unpaidData.quotes : []);
        setWeekSales(weekSalesRes.ok ? weekSalesData.rows : []);
        setTodayShipping(shippingRes.ok ? shippingData.rows : []);
        setSavedQuotes(savedQuotesRes.ok ? savedQuotesData.quotes : []);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [todayStr, weekStartStr]);

  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
  const pendingQuotesCount = quotes.filter((q) => q.status === "pending").length;
  const unpaidTotal = unpaidQuotes.reduce((sum, q) => sum + q.remaining, 0);
  const topProducts = [...products].sort((a, b) => b.view_count - a.view_count).slice(0, 5);
  const hasAnyViews = topProducts.some((p) => p.view_count > 0);
  const needsAttention = pendingOrdersCount > 0 || pendingQuotesCount > 0 || unpaidQuotes.length > 0;

  // Last 7 days of real sales, bucketed by date.
  const last7Days = useMemo(() => {
    const days: { date: string; total: number; label: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateStr(d);
      const total = weekSales
        .filter((r) => r.sale_date === dateStr)
        .reduce((sum, r) => sum + r.unit_price * r.qty, 0);
      days.push({ date: dateStr, total, label: WEEKDAY_TH[d.getDay()], isToday: dateStr === todayStr });
    }
    return days;
  }, [weekSales, todayStr]);
  const todaySalesTotal = last7Days.find((d) => d.isToday)?.total ?? 0;
  const weekSalesTotal = last7Days.reduce((sum, d) => sum + d.total, 0);
  const maxDaySales = Math.max(1, ...last7Days.map((d) => d.total));

  // Real quote activity per salesperson this month — count + value, no
  // fabricated call-tracking or sales targets (we don't track those).
  const salespersonActivity = useMemo(() => {
    const byPerson = new Map<string, { count: number; total: number }>();
    for (const q of savedQuotes) {
      if (q.doc_type !== "quotation" || q.archived) continue;
      if (!q.doc_date?.startsWith(monthPrefix)) continue;
      const name = q.salesperson?.trim();
      if (!name) continue;
      const cur = byPerson.get(name) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += computeGrandTotal(q.items || [], q.discount_pct, q.vat_pct);
      byPerson.set(name, cur);
    }
    return [...byPerson.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [savedQuotes, monthPrefix]);

  const KPI = [
    {
      title: t("ยอดขายวันนี้", "Sales Today", "今日销售额"),
      value: money(todaySalesTotal),
      icon: Banknote,
      tone: "positive" as const,
      href: "/admin/daily-sales",
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
      title: t("คิวจัดส่งวันนี้", "Shipments Today", "今日出货"),
      value: todayShipping.length,
      icon: Truck,
      tone: "info" as const,
      href: "/admin/daily-exports",
    },
    {
      title: t("ออเดอร์รอดำเนินการ", "Pending Orders", "待处理订单"),
      value: pendingOrdersCount,
      icon: AlertCircle,
      tone: "alert" as const,
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
  ];

  const toneChip: Record<string, string> = {
    positive: "bg-emerald-50 text-emerald-600",
    alert: "bg-[#C8102E] text-white",
    info: "bg-blue-50 text-blue-600",
    neutral: "bg-[#F5F3EF] text-[#1A1A1A]",
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ภาพรวมปฏิบัติการ ฟูไท่ เฟอร์นิเจอร์", "Futai Furniture Operations Overview", "富泰家具运营概览")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t("มอนิเตอร์ยอดขายรายวัน คิวจัดส่งสินค้า ใบเสนอราคา และสินค้าในระบบ", "Monitor daily sales, shipping queue, quotes, and your product catalog", "监控每日销售、发货队列、报价单及产品目录")}
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
                kpi.tone === "alert" && Number(kpi.value) > 0
                  ? "ring-[#C8102E]/20 bg-[#FFF8F8]"
                  : "ring-[#E8E5E0] bg-white"
              )}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg", toneChip[kpi.tone])}>
                    <kpi.icon size={16} />
                  </div>
                  <ArrowUpRight size={14} className="text-[#C8C5BE] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A] leading-none font-mono">{kpi.value}</p>
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

      {/* Weekly sales chart */}
      <Card className="ring-[#E8E5E0]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">{t("ยอดขายรายวัน 7 วันล่าสุด", "Daily Sales, Last 7 Days", "近7日每日销售额")}</CardTitle>
            <span className="text-xs text-[#6B6B6B]">
              {t("รวมสัปดาห์นี้", "Week total", "本周合计")}: <strong className="text-[#1A1A1A] font-mono">{money(weekSalesTotal)}</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {!loaded ? null : weekSalesTotal === 0 ? (
            <p className="text-sm text-[#6B6B6B] py-6 text-center">
              {t("ยังไม่มีข้อมูลยอดขายรายวันในช่วง 7 วันนี้", "No daily sales logged for the last 7 days yet", "近7日暂无每日销售数据")}
            </p>
          ) : (
            <div className="grid grid-cols-7 gap-2 md:gap-3 items-end h-40 pt-4">
              {last7Days.map((d) => (
                <div key={d.date} className="flex flex-col items-center h-full justify-end group">
                  <span
                    className={cn(
                      "text-[10px] mb-1 font-mono",
                      d.isToday ? "font-bold text-[#C8102E]" : "text-[#9B9B9B] opacity-0 group-hover:opacity-100 transition-opacity"
                    )}
                  >
                    {moneyCompact(d.total)}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-[40px] rounded-t-md transition-all",
                      d.isToday ? "bg-[#C8102E]" : "bg-[#F0EDE8] group-hover:bg-[#C8102E]/40"
                    )}
                    style={{ height: `${Math.max(3, (d.total / maxDaySales) * 100)}%` }}
                  />
                  <span className={cn("text-[11px] mt-2", d.isToday ? "font-bold text-[#C8102E]" : "text-[#9B9B9B]")}>
                    {d.isToday ? t("วันนี้", "Today", "今天") : d.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's shipping queue */}
        <Card className="ring-[#E8E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("คิวจัดส่งวันนี้", "Today's Shipping Queue", "今日发货队列")}</CardTitle>
              <Link href="/admin/daily-exports" className="text-xs text-[#C8102E] hover:underline">
                {t("จัดการการส่งออกรายวัน", "Manage Daily Export", "管理每日出库")} →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayShipping.length === 0 ? (
                <p className="text-sm text-[#6B6B6B] py-4 text-center">
                  {t("ไม่มีคิวจัดส่งวันนี้", "No shipments queued for today", "今日暂无发货安排")}
                </p>
              ) : (
                todayShipping.slice(0, 6).map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-2 border-b border-[#F0EDE8] last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] font-mono truncate">{row.sku || "—"}</p>
                      <p className="text-xs text-[#9B9B9B] truncate">{row.consignee || row.customer_name || "—"}</p>
                    </div>
                    <span className="text-xs text-[#6B6B6B] shrink-0 ml-3">× {row.qty}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Salesperson activity this month — real quote counts/value, no
            fabricated call-tracking or targets since we don't track those. */}
        <Card className="ring-[#E8E5E0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("ใบเสนอราคาเดือนนี้ตามพนักงานขาย", "Quotes This Month by Salesperson", "本月各销售员报价单")}</CardTitle>
              <Link href="/admin/kpi" className="text-xs text-[#C8102E] hover:underline">
                {t("ดู KPI ทีมขาย", "View Sales KPI", "查看销售KPI")} →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {salespersonActivity.length === 0 ? (
              <p className="text-sm text-[#6B6B6B] py-4 text-center">
                {t("ยังไม่มีใบเสนอราคาที่ระบุพนักงานขายในเดือนนี้", "No quotes with a salesperson assigned this month yet", "本月暂无已指定销售员的报价单")}
              </p>
            ) : (
              <div className="space-y-3">
                {salespersonActivity.map((s) => (
                  <div key={s.name} className="flex items-center justify-between py-2 border-b border-[#F0EDE8] last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{s.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-[#1A1A1A]">{s.count} {t("ใบ", "quotes", "单")}</p>
                      <p className="text-xs text-[#9B9B9B] font-mono">{money(s.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              { label: t("คนเข้าชมวันนี้", "Visitors Today", "今日访客"), value: visits?.todayVisitors ?? 0 },
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
