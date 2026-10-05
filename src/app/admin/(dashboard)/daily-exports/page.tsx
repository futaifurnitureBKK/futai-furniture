"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, FileDown, Search, Loader2, Boxes, ListChecks, Wallet, RefreshCw, ImageOff, X } from "lucide-react";
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
import rawStock from "@/data/stock-demo.json";
import type { DailyExportRow, DailyExportChannel } from "@/types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
}
function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

const EXPORT_HEADERS = [
  "序号\nNo. (เลขที่)",
  "型号\nModel (แบบอย่าง)",
  "图片\nPicture (รูปภาพ)",
  "规格\n(mm) (ขนาด)",
  "单价\nUnit Price (ราคาต่อหน่วย)",
  "数量\nQuantity (ปริมาณ)",
  "折扣%\nDiscount % (ส่วนลด)",
  "总金额\nTotal (จำนวนเงินทั้งหมด)",
  "渠道\nChannel (ช่องทาง)",
  "备注\nRemark (หมายเหตุ)",
  "客户\nCustomer (ชื่อลูกค้า)",
  "经手人\nStaff (ผู้ดำเนินการ)",
  "订单号\nPO No. (เลขที่ใบสั่งซื้อ)",
];

const CHANNEL_META: Record<DailyExportChannel, { th: string; en: string; zh: string; color: string }> = {
  shopee: { th: "Shopee", en: "Shopee", zh: "Shopee", color: "bg-orange-100 text-orange-700" },
  tiktok: { th: "TikTok Shop", en: "TikTok Shop", zh: "TikTok Shop", color: "bg-[#1A1A1A]/10 text-[#1A1A1A]" },
  storefront: { th: "หน้าร้าน", en: "Storefront", zh: "门店", color: "bg-blue-100 text-blue-700" },
  b2b: { th: "โครงการ/B2B", en: "Project / B2B", zh: "项目/B2B", color: "bg-emerald-100 text-emerald-700" },
};
const CHANNEL_ORDER: DailyExportChannel[] = ["shopee", "tiktok", "storefront", "b2b"];

interface Cat {
  key: string;
  th: string;
  en: string;
  zh: string;
}
const CATEGORIES = rawStock.categories as Cat[];

interface VariantOption {
  variantId: number;
  size_text: string;
  available: number;
}
interface GroupedProduct {
  productId: number;
  code: string;
  category: string;
  image_url: string | null;
  variants: VariantOption[];
}
interface PickedVariant {
  variantId: number;
  code: string;
  size_text: string;
  image_url: string | null;
  available: number;
}

// A wall of big photos — one card per MODEL (not per size, which used to
// repeat the same photo once per size and made it easy to tap the wrong
// one) — tap a size chip on the card to pick that exact variant.
function StockGridPickerDialog({
  open, onOpenChange, products, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: GroupedProduct[];
  onPick: (v: PickedVariant) => void;
}) {
  const { t, lang } = useLanguage();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [visibleCount, setVisibleCount] = useState(60);

  function updateQ(v: string) {
    setQ(v);
    setVisibleCount(60);
  }
  function updateCat(v: string) {
    setCat(v);
    setVisibleCount(60);
  }
  function toggleOnlyInStock() {
    setOnlyInStock((v) => !v);
    setVisibleCount(60);
  }

  const catLabel = (key: string) => {
    const c = CATEGORIES.find((c) => c.key === key);
    return c ? t(c.th, c.en, c.zh) : key;
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (onlyInStock && !p.variants.some((v) => v.available > 0)) return false;
      if (!query) return true;
      return (
        p.code.toLowerCase().includes(query) ||
        catLabel(p.category).toLowerCase().includes(query) ||
        p.variants.some((v) => v.size_text.toLowerCase().includes(query))
      );
    });
  }, [products, q, cat, onlyInStock, lang]);

  const matches = filtered.slice(0, visibleCount);

  const categoriesInUse = useMemo(() => {
    const keys = new Set(products.map((p) => p.category));
    return CATEGORIES.filter((c) => keys.has(c.key));
  }, [products]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("เลือกสินค้าจากสต็อก", "Pick from Stock", "从库存选择")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              autoFocus
              className="pl-8"
              placeholder={t("พิมพ์เพื่อค้นหา (ไม่พิมพ์ก็เลือกจากรูปได้เลย)...", "Type to narrow down (or just tap a photo)...", "输入以筛选（也可直接点击图片）...")}
              value={q}
              onChange={(e) => updateQ(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={toggleOnlyInStock}
            className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${onlyInStock ? "bg-[#1A1A1A] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"}`}
          >
            {t("เฉพาะที่มีของ", "In stock only", "仅限有货")}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 -mt-1">
          <button
            type="button"
            onClick={() => updateCat("all")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${cat === "all" ? "bg-[#C8102E] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"}`}
          >
            {t("ทั้งหมด", "All", "全部")}
          </button>
          {categoriesInUse.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => updateCat(c.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${cat === c.key ? "bg-[#C8102E] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"}`}
            >
              {t(c.th, c.en, c.zh)}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pb-2">
            {matches.map((p) => (
              <div key={p.productId} className="bg-white border border-[#E8E5E0] rounded-lg overflow-hidden">
                <div className="flex gap-2 p-2">
                  <div className="relative w-16 h-16 shrink-0 rounded bg-[#F5F3EF] overflow-hidden">
                    {p.image_url ? (
                      <Image src={p.image_url} alt="" fill sizes="64px" className="object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C8C5BE]">
                        <ImageOff size={16} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#1A1A1A] truncate">{p.code}</p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">{catLabel(p.category)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 px-2 pb-2">
                  {p.variants.map((v) => (
                    <button
                      key={v.variantId}
                      type="button"
                      disabled={v.available <= 0}
                      onClick={() => onPick({ variantId: v.variantId, code: p.code, size_text: v.size_text, image_url: p.image_url, available: v.available })}
                      title={v.available <= 0 ? t("หมด", "Out of stock", "缺货") : undefined}
                      className={`text-[10px] px-1.5 py-1 rounded border font-mono transition-colors ${
                        v.available > 0
                          ? "border-[#E8E5E0] bg-[#FAF7F2] text-[#1A1A1A] hover:border-[#C8102E] hover:bg-white"
                          : "border-[#F0EDE6] bg-[#F5F3EF] text-[#C8C5BE] line-through cursor-not-allowed"
                      }`}
                    >
                      {v.size_text || "-"} ({fmt(v.available)})
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {matches.length === 0 && (
              <div className="col-span-full text-center py-10 text-sm text-[#9CA3AF]">{t("ไม่พบสินค้า", "No products found", "未找到商品")}</div>
            )}
          </div>
          {filtered.length > visibleCount && (
            <div className="text-center pb-2">
              <Button size="sm" variant="outline" onClick={() => setVisibleCount((n) => n + 60)}>
                {t(`แสดงเพิ่ม (เหลืออีก ${filtered.length - visibleCount})`, `Show more (${filtered.length - visibleCount} left)`, `显示更多（还有 ${filtered.length - visibleCount}）`)}
              </Button>
            </div>
          )}
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

interface CustomerLite {
  id: string;
  name: string;
  company: string;
}

// Autocompletes against the Customers page's own data, and can add a brand
// new customer (so it shows up there too) right from this field.
function CustomerPicker({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(value);
  // While not focused, the field just mirrors `value` straight from props
  // (no effect needed to keep it in sync with server-saved changes) — a
  // local draft in `query` only takes over once editing starts.
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? query : value;
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (!cancelled && res.ok) setCustomers(data.customers);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)).slice(0, 8);
  }, [customers, query]);

  const exactMatch = customers.some(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase() || c.company.toLowerCase() === query.trim().toLowerCase()
  );

  async function addNewCustomer() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setCustomers((prev) => [data.customer, ...prev]);
      onSave(data.customer.name);
      setQuery(data.customer.name);
      setOpen(false);
      toast.success(t(`เพิ่มลูกค้า "${name}" แล้ว`, `Added customer "${name}"`, `已添加客户 "${name}"`));
    } else {
      toast.error(data.error || t("เพิ่มลูกค้าไม่สำเร็จ", "Could not add customer", "添加失败"));
    }
  }

  return (
    <div className="relative">
      <Input
        className="h-8 text-xs w-36"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery(value);
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          setFocused(false);
          if (query !== value) onSave(query);
        }, 150)}
      />
      {open && (matches.length > 0 || query.trim()) && (
        <div className="absolute z-20 mt-1 w-56 max-h-56 overflow-auto bg-white border border-[#E8E5E0] rounded-lg shadow-lg">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSave(c.name);
                setQuery(c.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FAF7F2] border-b border-[#F0EDE7] last:border-0"
            >
              <p className="text-xs font-medium text-[#1A1A1A] truncate">{c.name}</p>
              {c.company && <p className="text-[11px] text-[#6B6B6B] truncate">{c.company}</p>}
            </button>
          ))}
          {!exactMatch && query.trim() && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addNewCustomer}
              disabled={creating}
              className="w-full text-left px-3 py-2 text-xs text-[#C8102E] hover:bg-[#FAF7F2] flex items-center gap-1.5"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {t(`เพิ่ม "${query.trim()}" เป็นลูกค้าใหม่`, `Add "${query.trim()}" as a new customer`, `添加 "${query.trim()}" 为新客户`)}
            </button>
          )}
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [products, setProducts] = useState<GroupedProduct[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

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
      const grouped: GroupedProduct[] = [];
      for (const p of data.products as { id: number; code: string; category: string; image_url: string | null; stock_variants: { id: number; size_text: string; available: number; archived: boolean }[] }[]) {
        const variants = p.stock_variants.filter((v) => !v.archived).map((v) => ({ variantId: v.id, size_text: v.size_text, available: v.available }));
        if (!variants.length) continue;
        grouped.push({ productId: p.id, code: p.code, category: p.category, image_url: p.image_url, variants });
      }
      setProducts(grouped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-fills "ผู้ดำเนินการ" with whoever is logged in — still changeable
  // per row from the dropdown if someone is entering on another's behalf.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      if (!cancelled && res.ok) setCurrentUser(data.name);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addRow(v: PickedVariant) {
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
        salesperson: currentUser,
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

  function rowTotal(r: DailyExportRow) {
    return r.qty * r.unit_price * (1 - r.discount_pct / 100);
  }

  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);
  const totalValue = rows.reduce((sum, r) => sum + rowTotal(r), 0);

  // Styled the same way as the Daily Sales / Daily Shipping export — title
  // bar, bordered + centered cells, embedded 1:1 product photos.
  async function exportExcel() {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Daily Export");
      ws.columns = [
        { width: 6 }, { width: 16 }, { width: PICTURE_COL_WIDTH }, { width: 16 }, { width: 12 },
        { width: 8 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 22 }, { width: 16 }, { width: 16 },
      ];
      ws.mergeCells("A1:M1");
      const title = ws.getCell("A1");
      title.value = "单日出库表格\nDaily Export (แบบฟอร์มการส่งออกสินค้ารายวัน) " + date;
      title.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      title.font = { bold: true, size: 13 };
      ws.getRow(1).height = TITLE_ROW_HEIGHT;

      styleHeaderRow(ws.addRow(EXPORT_HEADERS));

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const row = ws.addRow([
          i + 1, r.sku, "", r.size_text, r.unit_price, r.qty, r.discount_pct, rowTotal(r),
          r.channel ? t(CHANNEL_META[r.channel].th, CHANNEL_META[r.channel].en, CHANNEL_META[r.channel].zh) : "",
          r.remark, r.customer_name, r.salesperson || "", r.po_no,
        ]);
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

      <div className="grid grid-cols-3 gap-3">
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
        <div className="bg-white rounded-xl border border-[#E8E5E0] p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FAF7F2] flex items-center justify-center shrink-0">
            <Wallet size={16} className="text-[#C8102E]" />
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF]">{t("มูลค่ารวม (อ้างอิง)", "Total value (reference)", "总价值（参考）")}</p>
            <p className="text-base font-bold text-[#1A1A1A]">฿{fmtMoney(totalValue)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <Button onClick={() => setPickerOpen(true)} disabled={adding}>
          {adding ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Plus size={16} className="mr-1.5" />}
          {t("เพิ่มรายการ — เลือกสินค้าจากสต็อก", "Add item — pick from Stock", "添加项目 — 从库存中选择")}
        </Button>
      </div>

      <StockGridPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} products={products} onPick={addRow} />

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
                <TableHead className="text-xs w-44">{t("สินค้า", "Item", "商品")}</TableHead>
                <TableHead className="text-xs w-16">{t("จำนวน", "Qty", "数量")}</TableHead>
                <TableHead className="text-xs w-24">{t("ราคา/หน่วย", "Unit price", "单价")}</TableHead>
                <TableHead className="text-xs w-20">{t("ส่วนลด%", "Disc. %", "折扣%")}</TableHead>
                <TableHead className="text-xs w-24">{t("ยอดรวม", "Total", "总额")}</TableHead>
                <TableHead className="text-xs w-32">{t("ช่องทาง", "Channel", "渠道")}</TableHead>
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
                  <TableCell colSpan={12} className="text-center py-12 text-sm text-[#9CA3AF]">
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
                        min={0}
                        max={100}
                        className="h-8 text-xs w-16"
                        value={r.discount_pct}
                        onChange={(e) => patchLocal(r.id, { discount_pct: Number(e.target.value) || 0 })}
                        onBlur={(e) => saveRow(r.id, { discount_pct: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-[#1A1A1A] pt-3">฿{fmtMoney(rowTotal(r))}</TableCell>
                    <TableCell>
                      <Select
                        value={r.channel || "__none"}
                        onValueChange={(v) => saveRow(r.id, { channel: (!v || v === "__none" ? null : v) as DailyExportChannel | null })}
                      >
                        <SelectTrigger
                          size="sm"
                          className={`h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${r.channel ? CHANNEL_META[r.channel].color : "bg-[#F0EDE6] text-[#9CA3AF]"}`}
                        >
                          <SelectValue>
                            {(v: string) => (v === "__none" ? t("ยังไม่ระบุ", "Not set", "未设置") : t(CHANNEL_META[v as DailyExportChannel].th, CHANNEL_META[v as DailyExportChannel].en, CHANNEL_META[v as DailyExportChannel].zh))}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">{t("ยังไม่ระบุ", "Not set", "未设置")}</SelectItem>
                          {CHANNEL_ORDER.map((c) => (
                            <SelectItem key={c} value={c}>{t(CHANNEL_META[c].th, CHANNEL_META[c].en, CHANNEL_META[c].zh)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <CustomerPicker value={r.customer_name} onSave={(name) => saveRow(r.id, { customer_name: name })} />
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
