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
} from "lucide-react";

const NAV = [
  { href: "/admin",           label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/orders",    label: "คำสั่งซื้อ",   icon: ShoppingBag },
  { href: "/admin/quotes",    label: "ใบเสนอราคา",  icon: FileText },
  { href: "/admin/products",  label: "สินค้า",       icon: Package },
  { href: "/admin/customers", label: "ลูกค้า",       icon: Users },
  { href: "/admin/settings",  label: "ตั้งค่า",      icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
          {NAV.map(({ href, label, icon: Icon }) => {
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
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
          >
            <LogOut size={13} />
            กลับไปหน้าเว็บ
          </Link>
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
          <div className="text-xs text-[#6B6B6B]">
            วันนี้: {new Date().toLocaleDateString("th-TH")}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
