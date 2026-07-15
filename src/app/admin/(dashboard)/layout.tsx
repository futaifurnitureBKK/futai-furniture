"use client";
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
} from "lucide-react";
import { useLanguage } from "@/store/language";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV = [
  { href: "/admin",                   labelTh: "Dashboard",    labelEn: "Dashboard",    labelZh: "仪表盘",     icon: LayoutDashboard },
  { href: "/admin/pos",               labelTh: "POS",          labelEn: "POS",          labelZh: "收银台",     icon: MonitorPlay },
  { href: "/admin/orders",            labelTh: "คำสั่งซื้อ",   labelEn: "Orders",       labelZh: "订单",       icon: ShoppingBag },
  { href: "/admin/quotes",            labelTh: "ใบเสนอราคา",  labelEn: "Quotes",       labelZh: "报价单",     icon: FileText },
  { href: "/admin/products",          labelTh: "สินค้า",       labelEn: "Products",     labelZh: "产品",       icon: Package },
  { href: "/admin/products/images",   labelTh: "รูปสินค้า",    labelEn: "Product Images", labelZh: "产品图片", icon: ImagePlus },
  { href: "/admin/categories",        labelTh: "รูปหมวดหมู่",  labelEn: "Category Images", labelZh: "分类图片", icon: LayoutGrid },
  { href: "/admin/customers",         labelTh: "ลูกค้า",       labelEn: "Customers",    labelZh: "客户",       icon: Users },
  { href: "/admin/settings",          labelTh: "ตั้งค่า",      labelEn: "Settings",     labelZh: "设置",       icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const dateLocale = lang === "th" ? "th-TH" : lang === "zh" ? "zh-CN" : "en-US";

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1A1A1A] text-white flex flex-col shrink-0 hidden md:flex">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="block">
            <p className="font-bold text-lg tracking-wide text-white">FUTAI</p>
            <p className="text-xs text-white/40 mt-0.5">Admin Dashboard</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, labelTh, labelEn, labelZh, icon: Icon }) => {
            const active =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
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

        {/* Bottom */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
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
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E8E5E0] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
            <Link href="/admin" className="hover:text-[#C8102E]">Admin</Link>
            {pathname !== "/admin" && (
              <>
                <ChevronRight size={14} />
                <span className="text-[#1A1A1A] font-medium capitalize">
                  {pathname.split("/").pop()?.replace(/-/g, " ")}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#6B6B6B]">
              {new Date().toLocaleDateString(dateLocale)}
            </span>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
