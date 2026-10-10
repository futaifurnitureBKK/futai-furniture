"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Package,
  ShieldCheck,
  Users,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  LogOut,
  MonitorPlay,
  ImagePlus,
  LayoutGrid,
  Target,
  Receipt,
  Truck,
  Warehouse,
  ClipboardList,
  PackageCheck,
  PackageMinus,
  Menu,
  X,
  Camera,
  FileOutput,
  Wallet,
  BarChart3,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
} from "lucide-react";
import { useLanguage } from "@/store/language";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface NavItem {
  href: string;
  labelTh: string;
  labelEn: string;
  labelZh: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hidden?: boolean;
}
interface NavGroup {
  key: string;
  labelTh: string;
  labelEn: string;
  labelZh: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: NavItem[];
}

// Standalone — always visible at the top, not part of any collapsible group.
const DASHBOARD_ITEM: NavItem = {
  href: "/admin", labelTh: "Dashboard", labelEn: "Dashboard", labelZh: "仪表盘", icon: LayoutDashboard,
};

// Every other page, grouped by function. Hrefs/labels/icons are unchanged
// from the old flat list — this only changes how they're grouped and
// displayed. Hidden items stay hidden (filtered out at render time) but
// still live in a sensible group so the data stays in one place.
const NAV_GROUPS: NavGroup[] = [
  {
    key: "sales",
    labelTh: "งานขายและคำสั่งซื้อ", labelEn: "Sales & Orders", labelZh: "销售与订单",
    icon: ShoppingCart,
    items: [
      { href: "/admin/quotes",        labelTh: "ใบเสนอราคา",        labelEn: "Quotes",         labelZh: "报价单",       icon: FileText },
      { href: "/admin/quote-builder", labelTh: "สร้างใบเสนอราคา",   labelEn: "Quote Builder",  labelZh: "生成报价单",   icon: Receipt },
      { href: "/admin/unpaid-quotes", labelTh: "ใบเสนอราคาค้างชำระ", labelEn: "Unpaid Quotes",  labelZh: "待收款报价单", icon: Wallet },
      { href: "/admin/delivery-note", labelTh: "ใบส่งของ",          labelEn: "Delivery Note",  labelZh: "送货单",       icon: FileOutput },
      { href: "/admin/shipping",      labelTh: "จัดส่งสินค้า",      labelEn: "Shipping",       labelZh: "发货",         icon: Truck },
      { href: "/admin/pos",           labelTh: "POS",               labelEn: "POS",            labelZh: "收银台",       icon: MonitorPlay, hidden: true },
      { href: "/admin/orders",        labelTh: "คำสั่งซื้อ",        labelEn: "Orders",         labelZh: "订单",         icon: ShoppingBag, hidden: true },
    ],
  },
  {
    key: "products",
    labelTh: "สินค้าและข้อมูลลูกค้า", labelEn: "Products & Customer Data", labelZh: "产品与客户数据",
    icon: Package,
    items: [
      { href: "/admin/products",        labelTh: "สินค้า",      labelEn: "Products",       labelZh: "产品",      icon: Package },
      { href: "/admin/categories",      labelTh: "รูปหมวดหมู่", labelEn: "Category Images", labelZh: "分类图片", icon: LayoutGrid },
      { href: "/admin/customers",       labelTh: "ลูกค้า",      labelEn: "Customers",      labelZh: "客户",      icon: Users },
      { href: "/admin/products/images", labelTh: "รูปสินค้า",   labelEn: "Product Images", labelZh: "产品图片", icon: ImagePlus, hidden: true },
    ],
  },
  {
    key: "reports",
    labelTh: "รายงานและยอดขาย", labelEn: "Reports & Sales", labelZh: "报表与销售额",
    icon: BarChart3,
    items: [
      { href: "/admin/daily-sales",    labelTh: "ยอดขายรายวัน",     labelEn: "Daily Sales",   labelZh: "每日销售", icon: ClipboardList },
      { href: "/admin/daily-exports",  labelTh: "การส่งออกรายวัน",  labelEn: "Daily Export",  labelZh: "每日出库", icon: PackageMinus },
      { href: "/admin/kpi",            labelTh: "KPI ติดตามลูกค้า", labelEn: "Lead Tracker",  labelZh: "客户跟进", icon: Target },
      { href: "/admin/daily-shipping", labelTh: "จัดส่งสินค้ารายวัน", labelEn: "Daily Shipping", labelZh: "每日出货", icon: PackageCheck, hidden: true },
    ],
  },
  {
    key: "marketing",
    labelTh: "การตลาดและพนักงาน", labelEn: "Marketing & Staff", labelZh: "营销与员工",
    icon: Megaphone,
    items: [
      { href: "/admin/content-tracking", labelTh: "ติดตามโพสต์พนักงาน", labelEn: "Content Tracker", labelZh: "员工发帖跟踪", icon: Camera },
      { href: "/admin/StockDEMO",        labelTh: "สต็อก DEMO",        labelEn: "Stock DEMO",     labelZh: "库存 DEMO",   icon: Warehouse },
    ],
  },
  {
    key: "settings",
    labelTh: "ตั้งค่าระบบ", labelEn: "System Settings", labelZh: "系统设置",
    icon: Settings,
    items: [
      { href: "/admin/settings", labelTh: "ตั้งค่า", labelEn: "Settings", labelZh: "设置", icon: Settings },
      { href: "/admin/AdminFutai", labelTh: "ระบบแอดมิน", labelEn: "Admin System", labelZh: "管理系统", icon: ShieldCheck },
    ],
  },
];

const EXPANDED_KEY = "futai-admin-sidebar-expanded";
const COLLAPSED_KEY = "futai-admin-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function groupContainingPath(pathname: string): string | null {
  return NAV_GROUPS.find((g) => g.items.some((it) => isActive(pathname, it.href)))?.key ?? null;
}

// Only the "ใบเสนอราคา" (incoming quote requests) item ever gets a badge —
// it's the one place a new customer submission needs catching the admin's
// eye without them having to go check the page.
const QUOTE_REQUESTS_HREF = "/admin/quotes";

function NavItemLink({
  item, active, collapsed, onNavigate, pendingQuoteCount,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  pendingQuoteCount?: number;
}) {
  const { t } = useLanguage();
  const Icon = item.icon;
  const label = t(item.labelTh, item.labelEn, item.labelZh);
  const badge = item.href === QUOTE_REQUESTS_HREF && pendingQuoteCount ? pendingQuoteCount : 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? (badge ? `${label} (${badge})` : label) : undefined}
      className={`group/item relative flex items-center gap-3 rounded-lg text-sm transition-colors duration-150 ${
        collapsed ? "justify-center px-2.5 py-2.5" : "px-3 py-2 ml-1"
      } ${active ? "bg-[#C8102E] text-white font-medium" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
    >
      <span className="relative shrink-0">
        <Icon size={16} />
        {collapsed && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#C8102E] text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className="flex items-center gap-1 shrink-0 rounded-full bg-[#C8102E] text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
          <Bell size={10} />
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[#1A1A1A] px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover/item:opacity-100 z-50">
          {badge ? `${label} (${badge})` : label}
        </span>
      )}
    </Link>
  );
}

function NavGroupSection({
  group, pathname, collapsed, expanded, onToggle, onNavigate, pendingQuoteCount,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  pendingQuoteCount?: number;
}) {
  const { t } = useLanguage();
  const visibleItems = group.items.filter((it) => !it.hidden);
  if (!visibleItems.length) return null;
  const GroupIcon = group.icon;
  const label = t(group.labelTh, group.labelEn, group.labelZh);

  // Collapsed rail: no room for a group header or accordion, just icons
  // with a thin divider between sections.
  if (collapsed) {
    return (
      <div className="pt-2 mt-2 border-t border-white/10 first:border-t-0 first:mt-0 first:pt-0 space-y-1">
        {visibleItems.map((item) => (
          <NavItemLink key={item.href} item={item} active={isActive(pathname, item.href)} collapsed onNavigate={onNavigate} pendingQuoteCount={pendingQuoteCount} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/35 hover:text-white/60 transition-colors"
      >
        <GroupIcon size={13} className="shrink-0" />
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-200 ease-in-out" style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}>
        <div className="overflow-hidden min-h-0">
          <div className="space-y-0.5 pb-1">
            {visibleItems.map((item) => (
              <NavItemLink key={item.href} item={item} active={isActive(pathname, item.href)} collapsed={false} onNavigate={onNavigate} pendingQuoteCount={pendingQuoteCount} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLinks({
  pathname, collapsed = false, onNavigate, pendingQuoteCount,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  pendingQuoteCount?: number;
}) {
  // All sections start open by default — keeps every page one glance away
  // instead of needing to hunt for which group it's hiding in.
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => NAV_GROUPS.map((g) => g.key));

  // Re-seed from localStorage after mount (not during SSR, to avoid a
  // hydration mismatch) — keeps whatever the person had open/closed last
  // time, always including the group the current page lives in.
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(EXPANDED_KEY);
        const stored = raw ? (JSON.parse(raw) as string[]) : NAV_GROUPS.map((g) => g.key);
        const active = groupContainingPath(pathname);
        const merged = [...new Set([...stored, ...(active ? [active] : [])])];
        setExpandedKeys(merged);
      } catch {
        // ignore — just falls back to the all-expanded default
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleGroup(key: string) {
    setExpandedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(EXPANDED_KEY, JSON.stringify(next));
      } catch {
        // private mode / storage blocked — toggle still works for this session
      }
      return next;
    });
  }

  return (
    <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
      <NavItemLink item={DASHBOARD_ITEM} active={isActive(pathname, DASHBOARD_ITEM.href)} collapsed={collapsed} onNavigate={onNavigate} />
      <div className={collapsed ? "" : "pt-2 space-y-3"}>
        {NAV_GROUPS.map((group) => (
          <NavGroupSection
            key={group.key}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
            expanded={expandedKeys.includes(group.key)}
            onToggle={() => toggleGroup(group.key)}
            onNavigate={onNavigate}
            pendingQuoteCount={pendingQuoteCount}
          />
        ))}
      </div>
    </nav>
  );
}

function NavBottom({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className={`border-t border-white/10 space-y-2 ${collapsed ? "p-2" : "p-4"}`}>
      <Link
        href="/"
        onClick={onNavigate}
        title={collapsed ? t("กลับไปหน้าเว็บ", "Back to website", "返回网站") : undefined}
        className={`flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors ${collapsed ? "justify-center py-1.5" : ""}`}
      >
        <LogOut size={13} className="shrink-0" />
        {!collapsed && t("กลับไปหน้าเว็บ", "Back to website", "返回网站")}
      </Link>
      <button
        onClick={async () => {
          await fetch("/api/admin/auth", { method: "DELETE" });
          window.location.href = "/admin/login";
        }}
        title={collapsed ? t("ออกจากระบบ", "Log out", "退出登录") : undefined}
        className={`flex items-center gap-2 text-xs text-white/20 hover:text-red-400 transition-colors w-full ${collapsed ? "justify-center py-1.5" : ""}`}
      >
        <LogOut size={13} className="shrink-0" />
        {!collapsed && t("ออกจากระบบ", "Log out", "退出登录")}
      </button>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const dateLocale = lang === "th" ? "th-TH" : lang === "zh" ? "zh-CN" : "en-US";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingQuoteCount, setPendingQuoteCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
      } catch {
        // ignore — defaults to expanded
      }
    })();
  }, []);

  // Polls how many customer quote requests ("ใบเสนอราคา") are still
  // "รอตอบกลับ" (pending) so the nav item can show a bell + count without
  // needing to be on that page — the LINE push already covers "the instant
  // it happens"; this covers "still outstanding right now, at a glance".
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/quotes");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const quotes = (data.quotes ?? []) as { status: string }[];
        setPendingQuoteCount(quotes.filter((q) => q.status === "pending").length);
      } catch {
        // ignore — badge just stays at its last known count
      }
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore — toggle still works for this session
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Sidebar (desktop) */}
      <aside
        className={`bg-[#1A1A1A] text-white flex flex-col shrink-0 hidden md:flex transition-[width] duration-200 ease-in-out ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo */}
        <div className={`border-b border-white/10 flex items-center justify-between gap-2 ${collapsed ? "p-3 justify-center" : "p-6"}`}>
          <Link href="/" className="block min-w-0">
            {collapsed ? (
              <p className="font-bold text-lg tracking-wide text-white text-center">F</p>
            ) : (
              <>
                <p className="font-bold text-lg tracking-wide text-white">FUTAI</p>
                <p className="text-xs text-white/40 mt-0.5">Admin Dashboard</p>
              </>
            )}
          </Link>
        </div>
        <NavLinks pathname={pathname} collapsed={collapsed} pendingQuoteCount={pendingQuoteCount} />
        <NavBottom collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          title={t(collapsed ? "ขยายเมนู" : "ย่อเมนู", collapsed ? "Expand sidebar" : "Collapse sidebar", collapsed ? "展开侧边栏" : "收起侧边栏")}
          className="flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white hover:bg-white/5 border-t border-white/10 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </aside>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#1A1A1A] text-white flex flex-col shadow-xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <Link href="/" className="block" onClick={() => setMobileNavOpen(false)}>
                <p className="font-bold text-lg tracking-wide text-white">FUTAI</p>
                <p className="text-xs text-white/40 mt-0.5">Admin Dashboard</p>
              </Link>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label={t("ปิดเมนู", "Close menu", "关闭菜单")}
                className="text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} pendingQuoteCount={pendingQuoteCount} />
            <NavBottom onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E8E5E0] px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label={t("เปิดเมนู", "Open menu", "打开菜单")}
              className="md:hidden shrink-0 text-[#1A1A1A]"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#6B6B6B] min-w-0 overflow-hidden">
              <Link href="/admin" className="hover:text-[#C8102E] shrink-0">Admin</Link>
              {pathname !== "/admin" && (
                <>
                  <ChevronRight size={14} className="shrink-0" />
                  <span className="text-[#1A1A1A] font-medium capitalize truncate">
                    {pathname.split("/").pop()?.replace(/-/g, " ")}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs text-[#6B6B6B] hidden sm:inline">
              {new Date().toLocaleDateString(dateLocale)}
            </span>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
