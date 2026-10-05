"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, FileDown, Search, Loader2, Boxes, ListChecks, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/store/language";
import { SALESPEOPLE } from "@/lib/saved-quote-options";
import type { DailyExportRow } from "@/types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
}

interface FlatVariant {
  variantId: number;
  code: string;
  size_text: string;
  image_url: string | null;
  available: number;
}

// Searches live Stock (not a static price list) and always hands back one
// exact variant — this is the whole point of this page: never guess which
// size was taken out from a typed SKU, always pick it.
function StockVariantPicker({ onPick, autoFocus }: { onPick: (v: FlatVariant) => void; autoFocus?: boolean }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<FlatVariant[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/stock?archived=false");
      const data = await res.json();
      if (cancelled || !res.ok) return;
      const flat: FlatVariant[] = [];
      for (const p of data.products as { id: number; code: string; image_url: string | null; stock_variants: { id: number; size_text: string; available: number; archived: boolean; image_urls?: string[] }[] }[]) {
        for (const v of p.stock_variants) {
          if (v.archived) continue;
          flat.push({
            variantId: v.id,
            code: p.code,
            size_text: v.size_text,
            image_url: v.image_urls?.[0] || p.image_url,
            available: v.available,
          });
        }
      }
      setVariants(flat);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return variants.filter((v) => v.code.toLowerCase().includes(q) || v.size_text.toLowerCase().includes(q)).slice(0, 20);
  }, [variants, query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <Input
          autoFocus={autoFocus}
          className="h-8 pl-7 text-xs"
          placeholder={t("ค้นหารหัสสินค้าหรือขนาดในสต็อก...", "Search stock by code or size...", "搜索库存编号或规格...")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white border border-[#E8E5E0] rounded-lg shadow-lg">
          {matches.map((m) => (
            <button
              key={m.variantId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(m);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-[#FAF7F2] border-b border-[#F0EDE7] last:border-0"
            >
              <div className="relative w-12 h-9 shrink-0 rounded bg-[#F5F3EF] overflow-hidden">
                {m.image_url && <Image src={m.image_url} alt="" fill sizes="48px" className="object-contain" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono font-semibold text-[#1A1A1A]">{m.code}</p>
                <p className="text-[11px] text-[#6B6B6B] truncate">{m.size_text || "-"}</p>
              </div>
              <p className={`text-[11px] font-semibold shrink-0 ${m.available > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {t("พร้อมขาย", "Avail.", "可售")} {fmt(m.available)}
              </p>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && matches.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[#E8E5E0] rounded-lg shadow-lg px-3 py-3 text-xs text-[#9CA3AF] text-center">
          {t("ไม่พบในสต็อก", "Not found in Stock", "库存中未找到")}
        </div>
      )}
    </div>
  );
}

export default function DailyExportsPage() {
  const { t } = useLanguage();
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<DailyExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/daily-exports?date=${date}`);
    const data = await res.json();
    if (res.ok) setRows(data.rows);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/daily-exports?date=${date}`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setRows(data.rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function addRow(v: FlatVariant) {
    setAdding(true);
    const res = await fetch("/api/admin/daily-exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        export_date: date,
        stock_variant_id: v.variantId,
        sku: v.code,
        size_text: v.size_text,
        image_url: v.image_url,
        qty: 1,
      }),
    });
    const data = await res.json();
    setAdding(false);
    if (res.ok) {
      setRows((prev) => [...prev, data.row]);
      toast.success(t(`ตัด ${v.code} แล้ว 1 ชิ้น`, `Deducted 1 of ${v.code}`, `已扣除 ${v.code} 1 件`));
    } else {
      toast.error(data.error || t("เพิ่มไม่สำเร็จ", "Could not add", "添加失败"));
    }
  }

  function patchLocal(id: number, change: Partial<DailyExportRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  async function saveRow(id: number, change: Partial<DailyExportRow>) {
    patchLocal(id, change);
    const res = await fetch(`/api/admin/daily-exports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.row) patchLocal(id, data.row);
    } else {
      toast.error(t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
      load();
    }
  }

  async function deleteRow(id: number) {
    const prev = rows;
    setRows((list) => list.filter((r) => r.id !== id));
    const res = await fetch(`/api/admin/daily-exports/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRows(prev);
      toast.error(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
    } else {
      toast.success(t("ลบแล้ว — คืนจำนวนกลับเข้าสต็อกแล้ว", "Deleted — returned to Stock", "已删除 — 已退回库存"));
    }
  }

  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);

  async function exportExcel() {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Daily Export");
      ws.columns = [
        { header: "ลำดับ\nNo.", key: "no", width: 6 },
        { header: "รหัสสินค้า\nSKU", key: "sku", width: 16 },
        { header: "ขนาด\nSize", key: "size", width: 20 },
        { header: "จำนวนที่ตัด\nQty", key: "qty", width: 10 },
        { header: "หมายเหตุ\nRemark", key: "remark", width: 24 },
        { header: "ลูกค้า\nCustomer", key: "customer", width: 20 },
        { header: "ผู้ดำเนินการ\nStaff", key: "staff", width: 16 },
        { header: "เลขที่ใบสั่งซื้อ\nPO No.", key: "po", width: 16 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { wrapText: true, vertical: "middle" };
      rows.forEach((r, i) => {
        ws.addRow({
          no: i + 1,
          sku: r.sku,
          size: r.size_text,
          qty: r.qty,
          remark: r.remark,
          customer: r.customer_name,
          staff: r.salesperson || "",
          po: r.po_no,
        });
      });
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
      });
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-export-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("การส่งออกรายวัน", "Daily Export", "每日出库")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t(
              "เอกสารสำหรับตัดสต็อกโดยเฉพาะ — เลือกสินค้าจากสต็อกจริงทุกครั้ง ไม่พิมพ์ SKU เอง กันตัดผิดขนาด",
              "A document built specifically to deduct Stock — always pick the item from real Stock, never type a SKU by hand, so the wrong size never gets deducted",
              "专门用于扣减库存的单据 — 每次都从真实库存中选择商品，不手动输入SKU，避免扣错规格"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw size={14} className="mr-1.5" /> {t("โหลดใหม่", "Refresh", "刷新")}
          </Button>
          <Button size="sm" onClick={exportExcel} disabled={!rows.length || exporting}>
            {exporting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileDown size={14} className="mr-1.5" />}
            {t("Export Excel", "Export Excel", "导出Excel")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-[#E8E5E0] p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FAF7F2] flex items-center justify-center shrink-0">
            <ListChecks size={16} className="text-[#C8102E]" />
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF]">{t("จำนวนรายการ", "Rows", "记录数")}</p>
            <p className="text-base font-bold text-[#1A1A1A]">{rows.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E8E5E0] p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FAF7F2] flex items-center justify-center shrink-0">
            <Boxes size={16} className="text-[#C8102E]" />
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF]">{t("จำนวนชิ้นที่ตัดรวม", "Total qty deducted", "总扣减数量")}</p>
            <p className="text-base font-bold text-[#1A1A1A]">{fmt(totalQty)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="text-xs font-semibold text-[#1A1A1A] mb-2 flex items-center gap-1.5">
          <Plus size={14} /> {t("เพิ่มรายการ — เลือกสินค้าจากสต็อก", "Add item — pick from Stock", "添加项目 — 从库存中选择")}
        </p>
        <div className="max-w-md">
          <StockVariantPicker onPick={addRow} />
        </div>
        {adding && <p className="text-xs text-[#9CA3AF] mt-2"><Loader2 size={12} className="inline animate-spin mr-1" /> {t("กำลังเพิ่ม...", "Adding...", "添加中...")}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#6B6B6B]">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            {t("กำลังโหลด...", "Loading...", "加载中...")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAF7F2]">
                <TableHead className="text-xs w-10">{t("ที่", "No.", "序号")}</TableHead>
                <TableHead className="text-xs w-48">{t("สินค้า", "Item", "商品")}</TableHead>
                <TableHead className="text-xs w-20">{t("จำนวน", "Qty", "数量")}</TableHead>
                <TableHead className="text-xs">{t("หมายเหตุ", "Remark", "备注")}</TableHead>
                <TableHead className="text-xs">{t("ลูกค้า", "Customer", "客户")}</TableHead>
                <TableHead className="text-xs w-32">{t("ผู้ดำเนินการ", "Staff", "经手人")}</TableHead>
                <TableHead className="text-xs">{t("เลขที่ใบสั่งซื้อ", "PO No.", "订单号")}</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-sm text-[#9CA3AF]">
                    {t('ยังไม่มีรายการของวันนี้ — ค้นหาสินค้าด้านบนเพื่อเริ่มตัดสต็อก', 'No rows for this date yet — search for an item above to start deducting Stock', '该日期暂无记录 — 在上方搜索商品以开始扣减库存')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="text-sm text-[#6B6B6B] pt-3">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative w-11 h-11 shrink-0 rounded bg-[#F5F3EF] overflow-hidden border border-[#E8E5E0]">
                          {r.image_url && <Image src={r.image_url} alt="" fill sizes="44px" className="object-contain" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-semibold text-[#1A1A1A] truncate">{r.sku}</p>
                          <p className="text-[11px] text-[#6B6B6B] truncate">{r.size_text || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 text-xs w-16"
                        value={r.qty}
                        onChange={(e) => patchLocal(r.id, { qty: Number(e.target.value) || 0 })}
                        onBlur={(e) => saveRow(r.id, { qty: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs w-36"
                        value={r.remark}
                        onChange={(e) => patchLocal(r.id, { remark: e.target.value })}
                        onBlur={(e) => saveRow(r.id, { remark: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs w-36"
                        value={r.customer_name}
                        onChange={(e) => patchLocal(r.id, { customer_name: e.target.value })}
                        onBlur={(e) => saveRow(r.id, { customer_name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.salesperson || "__none"}
                        onValueChange={(v) => saveRow(r.id, { salesperson: !v || v === "__none" ? null : v })}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue>{(v: string) => (v === "__none" ? t("ยังไม่ระบุ", "Not set", "未设置") : v)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">{t("ยังไม่ระบุ", "Not set", "未设置")}</SelectItem>
                          {SALESPEOPLE.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs w-28 font-mono"
                        value={r.po_no}
                        onChange={(e) => patchLocal(r.id, { po_no: e.target.value })}
                        onBlur={(e) => saveRow(r.id, { po_no: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon-sm" variant="ghost" onClick={() => deleteRow(r.id)} aria-label={t("ลบ", "Delete", "删除")}>
                        <Trash2 size={13} className="text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
