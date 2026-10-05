"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, FileDown, Search, Loader2, Boxes, ListChecks, RefreshCw, ImageOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/store/language";
import { SALESPEOPLE } from "@/lib/saved-quote-options";
import {
  PICTURE_COL_WIDTH, DATA_ROW_HEIGHT, TITLE_ROW_HEIGHT, THIN_BORDER, DATA_CELL_ALIGNMENT,
  styleHeaderRow, embedRowImage, downloadWorkbook,
} from "@/lib/daily-sheets-excel";
import type { DailyExportRow } from "@/types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
}

const EXPORT_HEADERS = [
  "序号\nNo. (เลขที่)",
  "型号\nModel (แบบอย่าง)",
  "图片\nPicture (รูปภาพ)",
  "规格\n(mm) (ขนาด)",
  "数量\nQuantity (ปริมาณ)",
  "备注\nRemark (หมายเหตุ)",
  "客户\nCustomer (ชื่อลูกค้า)",
  "经手人\nStaff (ผู้ดำเนินการ)",
  "订单号\nPO No. (เลขที่ใบสั่งซื้อ)",
];

interface FlatVariant {
  variantId: number;
  code: string;
  size_text: string;
  image_url: string | null;
  available: number;
}

// A wall of big photos + the live available qty, so an item is picked by
// recognizing it at a glance instead of typing a search query first. Always
// hands back one exact variant — the whole point of this page is to never
// guess which size was taken out.
function StockGridPickerDialog({
  open, onOpenChange, variants, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  variants: FlatVariant[];
  onPick: (v: FlatVariant) => void;
}) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return variants.slice(0, 90);
    return variants.filter((v) => v.code.toLowerCase().includes(query) || v.size_text.toLowerCase().includes(query)).slice(0, 90);
  }, [variants, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("เลือกสินค้าจากสต็อก", "Pick from Stock", "从库存选择")}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            autoFocus
            className="pl-8"
            placeholder={t("พิมพ์เพื่อค้นหา (ไม่พิมพ์ก็เลือกจากรูปได้เลย)...", "Type to narrow down (or just tap a photo)...", "输入以筛选（也可直接点击图片）...")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pb-2">
            {matches.map((m) => (
              <button
                key={m.variantId}
                type="button"
                onClick={() => onPick(m)}
                className="text-left bg-white border border-[#E8E5E0] rounded-lg overflow-hidden hover:border-[#C8102E]/50 hover:shadow-sm transition-all"
              >
                <div className="relative aspect-square bg-[#F5F3EF]">
                  {m.image_url ? (
                    <Image src={m.image_url} alt="" fill sizes="220px" className="object-contain p-2" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C8C5BE]">
                      <ImageOff size={24} />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-mono font-semibold text-[#1A1A1A] truncate">{m.code}</p>
                  <p className="text-[11px] text-[#6B6B6B] truncate">{m.size_text || "-"}</p>
                  <p className={`text-[11px] font-semibold ${m.available > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {t("พร้อมขาย", "Available", "可售")} {fmt(m.available)}
                  </p>
                </div>
              </button>
            ))}
            {matches.length === 0 && (
              <div className="col-span-full text-center py-10 text-sm text-[#9CA3AF]">{t("ไม่พบสินค้า", "No products found", "未找到商品")}</div>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X size={13} className="mr-1" /> {t("ปิด", "Close", "关闭")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DailyExportsPage() {
  const { t } = useLanguage();
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<DailyExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [variants, setVariants] = useState<FlatVariant[]>([]);

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

  // Fetched once — the grid picker reuses this same list every time it opens.
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
      setPickerOpen(false);
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

  // Styled the same way as the Daily Sales / Daily Shipping export — title
  // bar, bordered + centered cells, embedded 1:1 product photos — just with
  // this document's own columns (no price, since it isn't a sales record).
  async function exportExcel() {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Daily Export");
      ws.columns = [
        { width: 6 }, { width: 16 }, { width: PICTURE_COL_WIDTH }, { width: 16 },
        { width: 10 }, { width: 18 }, { width: 22 }, { width: 16 }, { width: 16 },
      ];
      ws.mergeCells("A1:I1");
      const title = ws.getCell("A1");
      title.value = "单日出库表格\nDaily Export (แบบฟอร์มการส่งออกสินค้ารายวัน) " + date;
      title.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      title.font = { bold: true, size: 13 };
      ws.getRow(1).height = TITLE_ROW_HEIGHT;

      styleHeaderRow(ws.addRow(EXPORT_HEADERS));

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const row = ws.addRow([i + 1, r.sku, "", r.size_text, r.qty, r.remark, r.customer_name, r.salesperson || "", r.po_no]);
        row.eachCell((c) => { c.border = THIN_BORDER; c.alignment = DATA_CELL_ALIGNMENT; });
        row.height = DATA_ROW_HEIGHT;
        await embedRowImage(wb, ws, row, r.image_url, 2);
      }

      await downloadWorkbook(wb, `daily-export-${date}.xlsx`);
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
        <Button onClick={() => setPickerOpen(true)} disabled={adding}>
          {adding ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Plus size={16} className="mr-1.5" />}
          {t("เพิ่มรายการ — เลือกสินค้าจากสต็อก", "Add item — pick from Stock", "添加项目 — 从库存中选择")}
        </Button>
      </div>

      <StockGridPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} variants={variants} onPick={addRow} />

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
                    {t('ยังไม่มีรายการของวันนี้ — กด "เพิ่มรายการ" เพื่อเริ่มตัดสต็อก', 'No rows for this date yet — click "Add item" to start deducting Stock', '该日期暂无记录 — 点击"添加项目"以开始扣减库存')}
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
