"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Wallet, Search, X, ExternalLink } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/store/language";
import { fmtMoney } from "@/lib/saved-quote-options";

interface UnpaidQuote {
  id: number;
  doc_no: string;
  customer_name: string;
  doc_date: string;
  salesperson: string | null;
  total: number;
  totalPaid: number;
  remaining: number;
  paidPct: number;
  lastPaidDate: string | null;
}

export default function UnpaidQuotesPage() {
  const { t } = useLanguage();
  const [quotes, setQuotes] = useState<UnpaidQuote[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/saved-quotes/unpaid");
      const data = await res.json();
      if (!cancelled && res.ok) setQuotes(data.quotes);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!quotes) return [];
    if (!q) return quotes;
    return quotes.filter((r) => `${r.doc_no} ${r.customer_name}`.toLowerCase().includes(q));
  }, [quotes, search]);

  const totalRemaining = useMemo(() => filtered.reduce((sum, r) => sum + r.remaining, 0), [filtered]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ใบเสนอราคาค้างชำระ", "Unpaid Quotes", "待收款报价单")}</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          {t(
            "ใบเสนอราคาที่มีสลิปโอนเงินแล้วอย่างน้อย 1 ครั้ง แต่ยังจ่ายไม่ครบยอด (ดึงอัตโนมัติจากสลิปที่อัปโหลดในหน้าสร้างใบเสนอราคา)",
            "Quotes with at least one payment slip logged, but not yet paid in full (derived automatically from slips uploaded on the Quote Builder page)",
            "已上传至少一次付款凭证但尚未付清的报价单（根据生成报价单页面上传的凭证自动统计）"
          )}
        </p>
      </div>

      {quotes && quotes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
            <Wallet size={16} />
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF]">{t("ยอดค้างชำระรวม", "Total outstanding", "待收款总额")}</p>
            <p className="text-lg font-bold text-[#1A1A1A]">฿{fmtMoney(totalRemaining)}</p>
          </div>
          <div className="ml-auto text-sm text-[#6B6B6B]">
            {t(`${filtered.length} ใบ`, `${filtered.length} quotes`, `${filtered.length} 份`)}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E8E5E0]">
          <div className="relative w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ค้นหาเลขที่/ลูกค้า", "Search doc no. / customer", "搜索单号/客户")}
              className="h-8 w-full rounded-lg border border-[#E8E5E0] bg-white pl-7 pr-7 text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("ล้าง", "Clear", "清除")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A]"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {quotes === null ? (
          <div className="py-16 text-center text-sm text-[#6B6B6B]">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            {t("กำลังโหลด...", "Loading...", "加载中...")}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-16">
            {t("ไม่มีใบเสนอราคาค้างชำระ", "No unpaid quotes", "没有待收款的报价单")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAF7F2]">
                <TableHead className="text-xs">{t("เลขที่", "Doc No.", "单号")}</TableHead>
                <TableHead className="text-xs">{t("ลูกค้า", "Customer", "客户")}</TableHead>
                <TableHead className="text-xs">{t("ผู้ดูแล", "Salesperson", "负责人")}</TableHead>
                <TableHead className="text-xs text-right">{t("ยอดเต็ม ฿", "Total ฿", "总额 ฿")}</TableHead>
                <TableHead className="text-xs text-right">{t("จ่ายแล้ว ฿", "Paid ฿", "已付 ฿")}</TableHead>
                <TableHead className="text-xs">{t("ความคืบหน้า", "Progress", "进度")}</TableHead>
                <TableHead className="text-xs text-right">{t("ค้างชำระ ฿", "Remaining ฿", "待收 ฿")}</TableHead>
                <TableHead className="text-xs">{t("ชำระล่าสุด", "Last paid", "最近付款")}</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-[#FAF7F2]/50">
                  <TableCell className="text-sm font-medium text-[#1A1A1A]">{r.doc_no}</TableCell>
                  <TableCell className="text-sm">{r.customer_name || "-"}</TableCell>
                  <TableCell className="text-sm text-[#6B6B6B]">{r.salesperson || "-"}</TableCell>
                  <TableCell className="text-sm text-right">฿{fmtMoney(r.total)}</TableCell>
                  <TableCell className="text-sm text-right">฿{fmtMoney(r.totalPaid)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <div className="flex-1 h-1.5 rounded-full bg-[#F0EDE6] overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${Math.min(100, Math.max(0, r.paidPct))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] tabular-nums">{r.paidPct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-right font-semibold text-[#C8102E]">฿{fmtMoney(r.remaining)}</TableCell>
                  <TableCell className="text-xs text-[#6B6B6B]">{r.lastPaidDate || "-"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/quote-builder?open=${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#C8102E] hover:underline"
                    >
                      {t("เปิด", "Open", "打开")} <ExternalLink size={12} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
