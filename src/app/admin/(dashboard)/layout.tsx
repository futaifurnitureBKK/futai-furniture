"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  FileText,
  Settings,
  ChevronRight,
  LogOut,
  MonitorPlay,
  ImagePlus,
  LayoutGrid,
  Target,
  Receipt,
  Truck,
  Menu,
  X,
} from "lucide-react";
import { useLanguage } from "@/store/language";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV = [
  { href: "/admin",                   labelTh: "Dashboard",    labelEn: "Dashboard",    labelZh: "仪表盘",     icon: LayoutDashboard },
  { href: "/admin/pos",               labelTh: "POS",          labelEn: "POS",          labelZh: "收银台",     icon: MonitorPlay },
  { href: "/admin/orders",            labelTh: "คำสั่งซื้อ",   labelEn: "Orders",       labelZh: "订单",       icon: ShoppingBag },
  { href: "/admin/quotes",            labelTh: "ใบเสนอราคา",  labelEn: "Quotes",       labelZh: "报价单",     icon: FileText },
  { href: "/admin/quote-builder",     labelTh: "สร้างใบเสนอราคา", labelEn: "Quote Builder", labelZh: "生成报价单", icon: Receipt },
  { href: "/admin/shipping",          labelTh: "จัดส่งสินค้า",  labelEn: "Shipping",     labelZh: "发货",       icon: Truck },
  { href: "/admin/kpi",               labelTh: "KPI ติดตามลูกค้า", labelEn: "Lead Tracker", labelZh: "客户跟进",   icon: Target },
  { href: "/admin/products",          labelTh: "สินค้า",       labelEn: "Products",     labelZh: "产品",       icon: Package },
  { href: "/admin/products/images",   labelTh: "รูปสินค้า",    labelEn: "Product Images", labelZh: "产品图片", icon: ImagePlus },
  { href: "/admin/categories",        labelTh: "รูปหมวดหมู่",  labelEn: "Category Images", labelZh: "分类图片", icon: LayoutGrid },
  { href: "/admin/customers",         labelTh: "ลูกค้า",       labelEn: "Customers",    labelZh: "客户",       icon: Users },
  { href: "/admin/settings",          labelTh: "ตั้งค่า",      labelEn: "Settings",     labelZh: "设置",       icon: Settings },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { t } = useLanguage();
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(({ href, labelTh, labelEn, labelZh, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-[#C8102E] text-white font-medium"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={16} />
            {t(labelTh, labelEn, labelZh)}
          </Link>
        );
      })}
    </nav>
  );
}

function NavBottom({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="p-4 border-t border-white/10 space-y-2">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
      >
        <LogOut size={13} />
        {t("กลับไปหน้าเว็บ", "Back to website", "返回网站")}
      </Link>
      <button
        onClick={async () => {
          await fetch("/api/admin/auth", { method: "DELETE" });
          window.location.href = "/admin/login";
        }}
        className="flex items-center gap-2 text-xs text-white/20 hover:text-red-400 transition-colors w-full"
      >
        <LogOut size={13} />
        {t("ออกจากระบบ", "Log out", "退出登录")}
      </button>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const dateLocale = lang === "th" ? "th-TH" : lang === "zh" ? "zh-CN" : "en-US";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Sidebar (desktop) */}
      <aside className="w-56 bg-[#1A1A1A] text-white flex flex-col shrink-0 hidden md:flex">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="block">
            <p className="font-bold text-lg tracking-wide text-white">FUTAI</p>
            <p className="text-xs text-white/40 mt-0.5">Admin Dashboard</p>
          </Link>
        </div>
        <NavLinks pathname={pathname} />
        <NavBottom />
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
            <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
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
