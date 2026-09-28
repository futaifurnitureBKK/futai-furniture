"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, FileDown, FolderOpen, Search, Loader2, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/store/language";
import { PRICE_CATALOG, type PriceCatalogEntry } from "@/data/price-catalog";
import { SALESPEOPLE, STATUS_META, STATUS_ORDER, DOC_LABELS } from "@/lib/saved-quote-options";
import type { DailySalesRow, SavedQuoteStatus } from "@/types";

type SavedListRow = {
  id: number;
  doc_type: keyof typeof DOC_LABELS;
  doc_no: string;
  customer_name: string;
  doc_date: string;
  status: SavedQuoteStatus;
  items: unknown[];
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

type RangeKey = "1d" | "7d" | "30d" | "month";

function computeRange(anchor: string, key: RangeKey): { from: string; to: string } {
  const end = new Date(anchor);
  if (key === "1d") return { from: anchor, to: anchor };
  if (key === "7d") {
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { from: start.toISOString().slice(0, 10), to: anchor };
  }
  if (key === "30d") {
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { from: start.toISOString().slice(0, 10), to: anchor };
  }
  const first = new Date(end.getFullYear(), end.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth() + 1, 0);
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

type SortKey = "sale_date" | "sku" | "size_text" | "unit_price" | "qty" | "total" | "customer_name" | "salesperson" | "po_no";

function SortableHead({
  label, active, dir, onClick, className,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={`text-xs cursor-pointer select-none whitespace-nowrap ${className || ""}`} onClick={onClick}>
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon size={11} className={active ? "text-[#1A1A1A]" : "text-[#C8C5BE]"} />
      </span>
    </TableHead>
  );
}

function ProductPicker({ onPick }: { onPick: (entry: PriceCatalogEntry) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return PRICE_CATALOG.filter((e) => e.sku.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <Input
          className="h-8 pl-7 text-xs"
          placeholder={t("ค้นหา SKU หรือชื่อสินค้า...", "Search SKU or product name...", "搜索SKU或产品名称...")}
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
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-[#E8E5E0] rounded-lg shadow-lg">
          {matches.map((m, i) => (
            <button
              key={`${m.sku}-${i}`}
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
                {m.image && <Image src={m.image} alt="" fill sizes="48px" className="object-contain" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-mono font-semibold text-[#1A1A1A]">{m.sku}</p>
                <p className="text-[11px] text-[#6B6B6B] truncate">{m.category} · {m.size}</p>
                <p className="text-[11px] text-[#C8102E] font-medium">{m.priceLabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DailySalesPage() {
  const { t } = useLanguage();
  const [date, setDate] = useState(todayStr());
  const [rangeKey, setRangeKey] = useState<RangeKey>("1d");
  const [rows, setRows] = useState<DailySalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedListRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerStatus, setPickerStatus] = useState<SavedQuoteStatus | "all">("all");
  const [importingId, setImportingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const { from, to } = useMemo(() => computeRange(date, rangeKey), [date, rangeKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/daily-sales?from=${from}&to=${to}`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setRows(data.rows);
        setSelected(new Set());
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      const res = await fetch("/api/admin/saved-quotes?archived=false");
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setSavedList(data.quotes);
        setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen]);

  async function addRow() {
    const res = await fetch("/api/admin/daily-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sale_date: date, qty: 1 }),
    });
    const data = await res.json();
    if (res.ok) setRows((prev) => [...prev, data.row]);
    else toast.error(data.error || t("เพิ่มแถวไม่สำเร็จ", "Could not add row", "添加失败"));
  }

  function patchLocal(id: number, change: Partial<DailySalesRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  async function saveRow(id: number, change: Partial<DailySalesRow>) {
    patchLocal(id, change);
    const res = await fetch(`/api/admin/daily-sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });
    if (!res.ok) toast.error(t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
  }

  function pickProduct(id: number, entry: PriceCatalogEntry) {
    saveRow(id, { sku: entry.sku, size_text: entry.size, unit_price: entry.price ?? 0, image_url: entry.image });
  }

  async function deleteRow(id: number) {
    const prev = rows;
    setRows((list) => list.filter((r) => r.id !== id));
    setSelected((s) => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    const res = await fetch(`/api/admin/daily-sales/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRows(prev);
      toast.error(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
    }
  }

  function toggleRow(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((s) => {
      if (s.size === rows.length && rows.length > 0) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkDeleting(true);
    const results = await Promise.all(
      ids.map((id) => fetch(`/api/admin/daily-sales/${id}`, { method: "DELETE" }).then((r) => ({ id, ok: r.ok })))
    );
    const okIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    setRows((prev) => prev.filter((r) => !okIds.has(r.id)));
    setSelected(new Set());
    setBulkDeleting(false);
    const failed = results.filter((r) => !r.ok).length;
    if (failed) toast.error(t(`ลบไม่สำเร็จ ${failed} รายการ`, `${failed} item(s) failed to delete`, `${failed} 项删除失败`));
    else toast.success(t(`ลบแล้ว ${okIds.size} รายการ`, `Deleted ${okIds.size} item(s)`, `已删除 ${okIds.size} 项`));
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function importQuote(quoteId: number) {
    setImportingId(quoteId);
    const res = await fetch("/api/admin/daily-sales/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sale_date: date, quote_id: quoteId }),
    });
    const data = await res.json();
    setImportingId(null);
    if (res.ok) {
      setRows((prev) => [...prev, ...data.rows]);
      toast.success(t(`ดึงมาแล้ว ${data.rows.length} รายการ`, `Imported ${data.rows.length} item(s)`, `已导入 ${data.rows.length} 项`));
      setPickerOpen(false);
    } else {
      toast.error(data.error || t("ดึงข้อมูลไม่สำเร็จ", "Import failed", "导入失败"));
    }
  }

  const filteredSaved = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return savedList.filter((s) => {
      if (pickerStatus !== "all" && s.status !== pickerStatus) return false;
      if (!q) return true;
      return s.customer_name.toLowerCase().includes(q) || s.doc_no.toLowerCase().includes(q);
    });
  }, [savedList, pickerQuery, pickerStatus]);

  const displayRows = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "total") {
        av = a.qty * a.unit_price;
        bv = b.qty * b.unit_price;
      } else {
        av = a[sortKey] ?? "";
        bv = b[sortKey] ?? "";
      }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const grandTotal = rows.reduce((sum, r) => sum + r.qty * r.unit_price, 0);
  const showDateColumn = rangeKey !== "1d";
  // The Excel template is a single-day form — export always scopes to the
  // anchor date, even when viewing a wider range in the page.
  const exportRows = useMemo(() => rows.filter((r) => r.sale_date === date), [rows, date]);

  async function exportExcel() {
    setExporting(true);
    try {
      await buildAndDownloadExcel();
    } finally {
      setExporting(false);
    }
  }

  async function buildAndDownloadExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Daily Sales");
    const PICTURE_COL_WIDTH = 12;
    const DATA_ROW_HEIGHT = 56;
    // Excel's "column width" unit and points-per-row don't map 1:1 to pixels;
    // these are the standard approximations (Calibri 11 default font) so the
    // embedded image sizes exactly to the actual cell instead of guessing.
    const pictureColPx = Math.round(PICTURE_COL_WIDTH * 7 + 5);
    const dataRowPx = Math.round((DATA_ROW_HEIGHT * 4) / 3);
    ws.columns = [
      { width: 6 }, { width: 16 }, { width: PICTURE_COL_WIDTH }, { width: 16 }, { width: 12 },
      { width: 8 }, { width: 14 }, { width: 22 }, { width: 14 }, { width: 16 },
    ];
    ws.mergeCells("A1:J1");
    const title = ws.getCell("A1");
    title.value = "单日销售表格\nDaily Sales (แบบฟอร์มการขายประจำวัน ) " + date;
    title.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    title.font = { bold: true, size: 13 };
    ws.getRow(1).height = 28;

    const headers = [
      "序号\nNo. (เลขที่)",
      "型号\nModel (แบบอย่าง)",
      "图片\nPicture (รูปภาพ)",
      "规格\n(mm) (ขนาด)",
      "单价\nUnit Price (ราคาต่อหน่วย)",
      "数量\nQuantity (ปริมาณ)",
      "总金额\nTotal (จำนวนเงินทั้งหมด)",
      "客户\nCustomer (ชื่อลูกค้า)",
      "业务员\nSaler (ผู้ขาย)",
      "订单号\nPO No. (เลขที่ใบสั่งซื้อ)",
    ];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((c) => {
      c.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      c.font = { bold: true, size: 9 };
      c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    });

    for (let i = 0; i < exportRows.length; i++) {
      const r = exportRows[i];
      const row = ws.addRow([
        i + 1,
        r.sku,
        "",
        r.size_text,
        r.unit_price,
        r.qty,
        r.qty * r.unit_price,
        r.customer_name,
        r.salesperson || "",
        r.po_no,
      ]);
      row.eachCell((c) => {
        c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
      row.height = DATA_ROW_HEIGHT;

      if (r.image_url) {
        try {
          const imgRes = await fetch(r.image_url);
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            const ct = imgRes.headers.get("content-type") || "";
            const extension = ct.includes("png") ? "png" : ct.includes("gif") ? "gif" : "jpeg";
            const imageId = wb.addImage({ buffer: buf, extension });
            // Sized to the Picture column's actual pixel width/height so it
            // fills the cell exactly instead of spilling over or leaving gaps.
            ws.addImage(imageId, {
              tl: { col: 2, row: row.number - 1 },
              ext: { width: pictureColPx, height: dataRowPx },
              editAs: "oneCell",
            });
          }
        } catch {
          // image failed to load — leave the cell blank rather than fail the export
        }
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-sales-${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ยอดขายรายวัน", "Daily Sales", "每日销售")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t(
              "ดึงรายการจากใบเสนอราคาที่บันทึกไว้ หรือเพิ่มเองก็ได้ — ตรงกับฟอร์ม 单日销售表格 เดิม",
              "Pull rows in from a saved quotation, or add them by hand — matches the original 单日销售表格 form",
              "从已保存的报价单中导入，或手动添加——与原 单日销售表格 表单格式一致"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="flex items-center rounded-lg border border-[#E8E5E0] bg-white p-0.5 gap-0.5">
            {([
              ["1d", t("วันนี้", "Today", "今天")],
              ["7d", t("7 วัน", "7 days", "7天")],
              ["30d", t("30 วัน", "30 days", "30天")],
              ["month", t("เดือนนี้", "This month", "本月")],
            ] as [RangeKey, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRangeKey(key)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  rangeKey === key ? "bg-[#C8102E] text-white font-medium" : "text-[#6B6B6B] hover:bg-[#FAF7F2]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <FolderOpen size={14} className="mr-1.5" /> {t("ดึงจากใบเสนอราคา", "Import from quotation", "从报价单导入")}
          </Button>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus size={14} className="mr-1.5" /> {t("เพิ่มแถวเอง", "Add row", "手动添加")}
          </Button>
          {selected.size > 0 && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={deleteSelected} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}
              {t(`ลบที่เลือก (${selected.size})`, `Delete selected (${selected.size})`, `删除已选 (${selected.size})`)}
            </Button>
          )}
          <Button size="sm" onClick={exportExcel} disabled={!exportRows.length || exporting} title={showDateColumn ? t("ส่งออกเฉพาะวันที่เลือกในช่องวันที่", "Exports only the date selected above", "仅导出上方选择的日期") : undefined}>
            {exporting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileDown size={14} className="mr-1.5" />}
            {exporting ? t("กำลังสร้างไฟล์...", "Generating...", "生成中...") : t("Export Excel", "Export Excel", "导出Excel")}
          </Button>
        </div>
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
                <TableHead className="text-xs w-8">
                  <Checkbox
                    checked={rows.length > 0 && selected.size === rows.length}
                    onCheckedChange={() => toggleSelectAll()}
                    aria-label={t("เลือกทั้งหมด", "Select all", "全选")}
                  />
                </TableHead>
                <TableHead className="text-xs w-10">{t("ที่", "No.", "序号")}</TableHead>
                <TableHead className="text-xs w-32">{t("รูป / รหัสรุ่น", "Photo / Model", "图片/型号")}</TableHead>
                <SortableHead label={t("ขนาด (มม.)", "Size (mm)", "规格")} active={sortKey === "size_text"} dir={sortDir} onClick={() => toggleSort("size_text")} />
                <SortableHead className="w-24" label={t("ราคาต่อหน่วย", "Unit Price", "单价")} active={sortKey === "unit_price"} dir={sortDir} onClick={() => toggleSort("unit_price")} />
                <SortableHead className="w-20" label={t("จำนวน", "Qty", "数量")} active={sortKey === "qty"} dir={sortDir} onClick={() => toggleSort("qty")} />
                <SortableHead className="w-24" label={t("ยอดรวม", "Total", "总金额")} active={sortKey === "total"} dir={sortDir} onClick={() => toggleSort("total")} />
                <SortableHead label={t("ลูกค้า", "Customer", "客户")} active={sortKey === "customer_name"} dir={sortDir} onClick={() => toggleSort("customer_name")} />
                <SortableHead className="w-32" label={t("ผู้ขาย", "Saler", "业务员")} active={sortKey === "salesperson"} dir={sortDir} onClick={() => toggleSort("salesperson")} />
                <SortableHead label={t("เลขที่ใบสั่งซื้อ", "PO No.", "订单号")} active={sortKey === "po_no"} dir={sortDir} onClick={() => toggleSort("po_no")} />
                {showDateColumn && (
                  <SortableHead className="w-24" label={t("วันที่", "Date", "日期")} active={sortKey === "sale_date"} dir={sortDir} onClick={() => toggleSort("sale_date")} />
                )}
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showDateColumn ? 12 : 11} className="text-center py-12 text-sm text-[#9CA3AF]">
                    {t('ยังไม่มีรายการของวันนี้ — กด "ดึงจากใบเสนอราคา" หรือ "เพิ่มแถวเอง"', 'No rows for this date yet — click "Import from quotation" or "Add row"', '该日期暂无数据 — 点击"从报价单导入"或"手动添加"')}
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((r, i) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="pt-3">
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleRow(r.id)}
                        aria-label={t("เลือกแถว", "Select row", "选择行")}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-[#6B6B6B] pt-3">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative w-11 h-11 shrink-0 rounded bg-[#F5F3EF] overflow-hidden border border-[#E8E5E0]">
                          {r.image_url && <Image src={r.image_url} alt="" fill sizes="44px" className="object-contain" />}
                        </div>
                        <div className="min-w-[7rem]">
                          <Input
                            className="h-7 text-xs font-mono"
                            value={r.sku}
                            onChange={(e) => patchLocal(r.id, { sku: e.target.value })}
                            onBlur={(e) => saveRow(r.id, { sku: e.target.value })}
                          />
                          <div className="mt-1">
                            <ProductPicker onPick={(entry) => pickProduct(r.id, entry)} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs w-28"
                        value={r.size_text}
                        onChange={(e) => patchLocal(r.id, { size_text: e.target.value })}
                        onBlur={(e) => saveRow(r.id, { size_text: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 text-xs w-20"
                        value={r.unit_price}
                        onChange={(e) => patchLocal(r.id, { unit_price: Number(e.target.value) || 0 })}
                        onBlur={(e) => saveRow(r.id, { unit_price: Number(e.target.value) || 0 })}
                      />
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
                    <TableCell className="text-sm font-semibold text-[#1A1A1A] pt-3">฿{fmt(r.qty * r.unit_price)}</TableCell>
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
                    {showDateColumn && (
                      <TableCell className="text-xs text-[#6B6B6B] pt-3 whitespace-nowrap">{r.sale_date}</TableCell>
                    )}
                    <TableCell className="pt-3">
                      <Button size="icon-sm" variant="ghost" onClick={() => deleteRow(r.id)} aria-label={t("ลบ", "Delete", "删除")}>
                        <Trash2 size={13} className="text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {rows.length > 0 && (
              <tfoot>
                <TableRow className="bg-[#FAF7F2]">
                  <TableCell colSpan={6} className="text-right text-xs font-semibold text-[#6B6B6B]">
                    {rangeKey === "1d" ? t("ยอดรวมทั้งวัน", "Day total", "当日总计") : t("ยอดรวมช่วงที่เลือก", "Total for period", "所选期间总计")}
                  </TableCell>
                  <TableCell className="text-sm font-bold text-[#C8102E]">฿{fmt(grandTotal)}</TableCell>
                  <TableCell colSpan={showDateColumn ? 5 : 4} />
                </TableRow>
              </tfoot>
            )}
          </Table>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("ดึงรายการจากใบเสนอราคา", "Import from a saved quotation", "从报价单导入")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                className="pl-8"
                placeholder={t("ค้นหาชื่อบริษัท หรือเลขที่เอกสาร...", "Search company or doc no...", "搜索公司名或单号...")}
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
              />
            </div>
            <Select value={pickerStatus} onValueChange={(v) => setPickerStatus((v ?? "all") as SavedQuoteStatus | "all")}>
              <SelectTrigger className="w-44">
                <SelectValue>
                  {(v: SavedQuoteStatus | "all") => (v === "all" ? t("ทุกสถานะ", "All statuses", "全部状态") : t(STATUS_META[v].th, STATUS_META[v].en, STATUS_META[v].zh))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ทุกสถานะ", "All statuses", "全部状态")}</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{t(STATUS_META[s].th, STATUS_META[s].en, STATUS_META[s].zh)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {loadingSaved ? (
              <p className="text-sm text-[#9CA3AF] text-center py-10">
                <Loader2 size={16} className="inline animate-spin mr-2" /> {t("กำลังโหลด...", "Loading...", "加载中...")}
              </p>
            ) : filteredSaved.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-10">{t("ไม่พบเอกสาร", "No documents found", "未找到文件")}</p>
            ) : (
              <div className="space-y-1.5">
                {filteredSaved.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 border border-[#E8E5E0] rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{s.customer_name || "-"}</p>
                      <p className="text-xs text-[#9CA3AF] font-mono">
                        {s.doc_no} · {t(DOC_LABELS[s.doc_type].th, DOC_LABELS[s.doc_type].en, DOC_LABELS[s.doc_type].zh)} · {s.doc_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${STATUS_META[s.status].color}`}>
                        {t(STATUS_META[s.status].th, STATUS_META[s.status].en, STATUS_META[s.status].zh)}
                      </span>
                      <Button size="sm" onClick={() => importQuote(s.id)} disabled={importingId === s.id}>
                        {importingId === s.id ? <Loader2 size={13} className="animate-spin" /> : t("นำเข้า", "Import", "导入")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(false)}>
              <X size={13} className="mr-1" /> {t("ปิด", "Close", "关闭")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
