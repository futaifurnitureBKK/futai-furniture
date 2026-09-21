"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/store/language";
import type { QuoteRequest, QuoteStatus } from "@/types";

const STATUSES: { value: QuoteStatus | "all"; th: string; en: string; zh: string }[] = [
  { value: "all",       th: "ทั้งหมด",           en: "All",             zh: "全部" },
  { value: "pending",   th: "รอตอบกลับ",         en: "Pending",         zh: "待回复" },
  { value: "quoted",    th: "ส่งราคาแล้ว",       en: "Quoted",          zh: "已报价" },
  { value: "converted", th: "เปลี่ยนเป็นออเดอร์", en: "Converted",       zh: "已转为订单" },
  { value: "archived",  th: "เก็บถาวร",           en: "Archived",        zh: "已归档" },
];

const STATUS_COLOR: Record<QuoteStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  quoted:    "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  archived:  "bg-[#E8E5E0] text-[#6B6B6B]",
};

export default function QuotesPage() {
  const { t } = useLanguage();
  const [allQuotes, setAllQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/quotes");
      const data = await res.json();
      if (!cancelled) {
        setAllQuotes(res.ok ? data.quotes : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(id: string, status: QuoteStatus) {
    setAllQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    await fetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteQuote(id: string) {
    if (!confirm(t("ลบคำขอใบเสนอราคานี้ใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)", "Delete this quote request? (This cannot be undone)", "确定要删除此报价请求吗？（删除后无法恢复）"))) return;
    const prev = allQuotes;
    setAllQuotes((p) => p.filter((q) => q.id !== id));
    const res = await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setAllQuotes(prev);
      alert(t("ลบไม่สำเร็จ กรุณาลองใหม่", "Delete failed, please try again", "删除失败，请重试"));
    }
  }

  const quotes = allQuotes.filter((q) => filter === "all" || q.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("คำขอใบเสนอราคา", "Quote Requests", "报价请求")}</h1>
      </div>

      {/* Filter tabs */}
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
            {t(s.th, s.en, s.zh)}
            {s.value !== "all" && (
              <span className="ml-1.5 opacity-70">
                ({allQuotes.filter((q) => q.status === s.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAF7F2]">
              <TableHead className="text-xs">{t("วันที่", "Date", "日期")}</TableHead>
              <TableHead className="text-xs">{t("สินค้า", "Product", "产品")}</TableHead>
              <TableHead className="text-xs">{t("ลูกค้า", "Customer", "客户")}</TableHead>
              <TableHead className="text-xs">{t("บริษัท", "Company", "公司")}</TableHead>
              <TableHead className="text-xs">{t("จำนวน", "Qty", "数量")}</TableHead>
              <TableHead className="text-xs">{t("สถานะ", "Status", "状态")}</TableHead>
              <TableHead className="text-xs">{t("จัดการ", "Actions", "操作")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  {t("กำลังโหลด...", "Loading...", "加载中...")}
                </TableCell>
              </TableRow>
            ) : quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  {t("ไม่พบคำขอใบเสนอราคา", "No quote requests found", "未找到报价请求")}
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id} className="hover:bg-[#FAF7F2]/50">
                  <TableCell className="text-xs text-[#6B6B6B]">
                    {new Date(quote.created_at).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium line-clamp-1">{quote.product_name_snapshot || "-"}</p>
                    <p className="text-xs font-mono text-[#6B6B6B]">{quote.product_sku}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{quote.name}</p>
                    <p className="text-xs text-[#6B6B6B]">{quote.phone}</p>
                  </TableCell>
                  <TableCell className="text-xs text-[#6B6B6B]">{quote.company}</TableCell>
                  <TableCell className="text-sm text-center">{quote.quantity}</TableCell>
                  <TableCell>
                    <Select
                      value={quote.status}
                      onValueChange={(value) => setStatus(quote.id, value as QuoteStatus)}
                    >
                      <SelectTrigger
                        size="sm"
                        className={`h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${STATUS_COLOR[quote.status]}`}
                      >
                        <SelectValue>
                          {(v: QuoteStatus) => {
                            const s = STATUSES.find((s) => s.value === v);
                            return s ? t(s.th, s.en, s.zh) : v;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.filter((s) => s.value !== "all").map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {t(s.th, s.en, s.zh)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/quotes/${quote.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          {t("ดู", "View", "查看")}
                        </Button>
                      </Link>
                      {quote.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => setStatus(quote.id, "quoted")}
                          className="h-7 text-xs bg-[#C8102E] hover:bg-[#a30d25] text-white"
                        >
                          {t("ตอบกลับแล้ว", "Marked Replied", "已回复")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteQuote(quote.id)}
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
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
