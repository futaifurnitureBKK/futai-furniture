"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, FileDown, FolderOpen, ClipboardList, Search, Loader2, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { buildDailySheetsWorkbook, downloadWorkbook, salesRowsToShippingRows } from "@/lib/daily-sheets-excel";
import type { DailySalesRow, DailyShippingRow, SavedQuoteStatus } from "@/types";

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
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DailyShippingPage() {
  const { t } = useLanguage();
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<DailyShippingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedListRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerStatus, setPickerStatus] = useState<SavedQuoteStatus | "all">("all");
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importingFromSales, setImportingFromSales] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/daily-shipping?date=${date}`);
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
    const res = await fetch("/api/admin/daily-shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ship_date: date, qty: 1 }),
    });
    const data = await res.json();
    if (res.ok) setRows((prev) => [...prev, data.row]);
    else toast.error(data.error || t("เพิ่มแถวไม่สำเร็จ", "Could not add row", "添加失败"));
  }

  function patchLocal(id: number, change: Partial<DailyShippingRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  async function saveRow(id: number, change: Partial<DailyShippingRow>) {
    patchLocal(id, change);
    const res = await fetch(`/api/admin/daily-shipping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });
    if (!res.ok) toast.error(t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
  }

  function pickProduct(id: number, entry: PriceCatalogEntry) {
    saveRow(id, { sku: entry.sku, size_text: entry.size, image_url: entry.image });
  }

  async function uploadRowImage(id: number, file: File) {
    setUploadingImageId(id);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/daily-shipping/upload-photo", { method: "POST", body });
      const data = await res.json();
      if (res.ok) {
        await saveRow(id, { image_url: data.url });
      } else {
        toast.error(data.error || t("อัปโหลดรูปไม่สำเร็จ", "Upload failed", "上传失败"));
      }
    } finally {
      setUploadingImageId(null);
    }
  }

  async function deleteRow(id: number) {
    const prev = rows;
    setRows((list) => list.filter((r) => r.id !== id));
    const res = await fetch(`/api/admin/daily-shipping/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRows(prev);
      toast.error(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
    }
  }

  async function importQuote(quoteId: number) {
    setImportingId(quoteId);
    const res = await fetch("/api/admin/daily-shipping/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ship_date: date, quote_id: quoteId }),
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

  // The usual flow is "record it in Daily Sales, then ship it" — this pulls
  // that day's sales rows straight in, no need to re-find the quotation.
  // Remark / consignee / tel. aren't tracked in Daily Sales, so those stay
  // blank here for the shipper to fill in by hand.
  async function importFromSales() {
    setImportingFromSales(true);
    const res = await fetch("/api/admin/daily-shipping/import-from-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ship_date: date }),
    });
    const data = await res.json();
    setImportingFromSales(false);
    if (res.ok) {
      setRows((prev) => [...prev, ...data.rows]);
      toast.success(t(`ดึงมาแล้ว ${data.rows.length} รายการ`, `Imported ${data.rows.length} item(s)`, `已导入 ${data.rows.length} 项`));
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

  // Simple text filter — matches by SKU, customer name, or consignee.
  const searchQuery = search.trim().toLowerCase();
  const displayRows = searchQuery
    ? rows.filter(
        (r) =>
          r.sku.toLowerCase().includes(searchQuery) ||
          r.customer_name.toLowerCase().includes(searchQuery) ||
          r.consignee.toLowerCase().includes(searchQuery)
      )
    : rows;

  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);

  async function exportExcel() {
    setExporting(true);
    try {
      // The export is always the full two-sheet workbook (Daily Sales + Daily
      // Shipping) for the selected date, so it matches the original template
      // regardless of which page you export from. If nobody has entered or
      // imported anything into this page for this date yet, fall back to
      // deriving the shipping sheet straight from that day's sales rows
      // rather than exporting it blank.
      let salesRows: DailySalesRow[] = [];
      try {
        const res = await fetch(`/api/admin/daily-sales?date=${date}`);
        const data = await res.json();
        if (res.ok) salesRows = data.rows;
      } catch {
        // if the sales sheet can't be loaded, still export the shipping sheet alone
      }
      const wb = await buildDailySheetsWorkbook(date, salesRows, rows.length ? rows : salesRowsToShippingRows(salesRows));
      await downloadWorkbook(wb, `daily-sheets-${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("จัดส่งสินค้ารายวัน", "Daily Shipping", "每日出货")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t(
              "ดึงรายการจากใบเสนอราคาที่บันทึกไว้ หรือเพิ่มเองก็ได้ — ตรงกับฟอร์ม 单日出货表格 เดิม (ชีต 2 ของไฟล์เดียวกับยอดขายรายวัน)",
              "Pull rows in from a saved quotation, or add them by hand — matches the original 单日出货表格 form (sheet 2 of the same file as Daily Sales)",
              "从已保存的报价单中导入，或手动添加——与原 单日出货表格 表单格式一致（与每日销售同一文件的第二个工作表）"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button size="sm" onClick={importFromSales} disabled={importingFromSales} title={t("ดึงรายการที่บันทึกไว้ใน Daily Sales ของวันนี้เข้ามาทั้งหมด", "Pulls in everything already logged in Daily Sales for this date", "导入当天Daily Sales中已记录的全部项目")}>
            {importingFromSales ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <ClipboardList size={14} className="mr-1.5" />}
            {t("ดึงจาก Daily Sales", "Import from Daily Sales", "从每日销售导入")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <FolderOpen size={14} className="mr-1.5" /> {t("ดึงจากใบเสนอราคา", "Import from quotation", "从报价单导入")}
          </Button>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus size={14} className="mr-1.5" /> {t("เพิ่มแถวเอง", "Add row", "手动添加")}
          </Button>
          <Button size="sm" onClick={exportExcel} disabled={exporting}>
            {exporting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileDown size={14} className="mr-1.5" />}
            {exporting ? t("กำลังสร้างไฟล์...", "Generating...", "生成中...") : t("Export Excel", "Export Excel", "导出Excel")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            className="pl-8"
            placeholder={t("ค้นหา SKU, ลูกค้า หรือผู้รับสินค้า...", "Search SKU, customer, or consignee...", "搜索SKU、客户或收货人...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-xs text-[#9CA3AF]">
          {t(`${rows.length} รายการ · รวม ${fmt(totalQty)} ชิ้น`, `${rows.length} rows · ${fmt(totalQty)} pcs total`, `${rows.length} 项 · 共 ${fmt(totalQty)} 件`)}
        </p>
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
                <TableHead className="text-xs w-32">{t("รูป / รหัสรุ่น", "Photo / Model", "图片/型号")}</TableHead>
                <TableHead className="text-xs">{t("ขนาด (มม.)", "Size (mm)", "规格")}</TableHead>
                <TableHead className="text-xs w-20">{t("จำนวน", "Qty", "数量")}</TableHead>
                <TableHead className="text-xs">{t("หมายเหตุ", "Remark", "备注")}</TableHead>
                <TableHead className="text-xs">{t("ลูกค้า", "Customer", "客户")}</TableHead>
                <TableHead className="text-xs w-32">{t("ผู้ขาย", "Saler", "业务员")}</TableHead>
                <TableHead className="text-xs">{t("เลขที่ใบสั่งซื้อ", "PO No.", "订单号")}</TableHead>
                <TableHead className="text-xs">{t("ผู้รับสินค้า", "Consignee", "收货人")}</TableHead>
                <TableHead className="text-xs w-32">{t("เบอร์ติดต่อ", "Tel.", "联系电话")}</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-sm text-[#9CA3AF]">
                    {rows.length > 0
                      ? t("ไม่พบรายการที่ตรงกับคำค้นหา", "No rows match your search", "未找到匹配的记录")
                      : t('ยังไม่มีรายการของวันนี้ — กด "ดึงจาก Daily Sales" "ดึงจากใบเสนอราคา" หรือ "เพิ่มแถวเอง"', 'No rows for this date yet — click "Import from Daily Sales", "Import from quotation", or "Add row"', '该日期暂无数据 — 点击"从每日销售导入"、"从报价单导入"或"手动添加"')}
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((r, i) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="text-sm text-[#6B6B6B] pt-3">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative w-11 h-11 shrink-0 rounded bg-[#F5F3EF] overflow-hidden border border-[#E8E5E0] group">
                          {r.image_url && <Image src={r.image_url} alt="" fill sizes="44px" className="object-contain" />}
                          <label
                            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer"
                            title={t("อัปโหลดรูป", "Upload photo", "上传图片")}
                          >
                            {uploadingImageId === r.id ? (
                              <Loader2 size={13} className="text-white animate-spin" />
                            ) : (
                              <Camera size={13} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingImageId === r.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadRowImage(r.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
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
                        className="h-8 text-xs w-16"
                        value={r.qty}
                        onChange={(e) => patchLocal(r.id, { qty: Number(e.target.value) || 0 })}
                        onBlur={(e) => saveRow(r.id, { qty: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs w-32"
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
                      <Input
                        className="h-8 text-xs w-32"
                        value={r.consignee}
                        onChange={(e) => patchLocal(r.id, { consignee: e.target.value })}
                        onBlur={(e) => saveRow(r.id, { consignee: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs w-28 font-mono"
                        value={r.phone}
                        onChange={(e) => patchLocal(r.id, { phone: e.target.value })}
                        onBlur={(e) => saveRow(r.id, { phone: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="pt-3">
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
