"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Plus, Trash2, FileDown, FileSearch, Search, Loader2, Boxes, ListChecks, Wallet, RefreshCw, ImageOff, X } from "lucide-react";
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

interface OutstandingQuote {
  id: number;
  doc_no: string;
  customer_name: string;
  doc_date: string;
  total: number;
  orderedUnits: number;
  shippedUnits: number;
  status: "not_shipped" | "partial";
}

interface FulfillmentCandidate {
  variantId: number;
  size_text: string;
  available: number;
  image_url: string | null;
}
interface FulfillmentItem {
  item_id: string;
  name: string;
  sku: string;
  size: string;
  qty: number;
  unitPrice: number;
  image: string | null;
  shipped: number;
  remaining: number;
  suggestedVariantId: number | null;
  candidates: FulfillmentCandidate[];
}
interface FulfillmentDetail {
  quote: { id: number; doc_no: string; customer_name: string; discount_pct: number };
  items: FulfillmentItem[];
}

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

// Autocompletes against the Customers page's own data (and can add a brand
// new customer right from this field), plus quotations that still have
// something outstanding to ship — picking one of those opens the
// "pull from quotation" dialog instead of just filling in a name.
function CustomerPicker({
  value, onSave, onPickQuote,
}: {
  value: string;
  onSave: (name: string) => void;
  onPickQuote: (quoteId: number) => void;
}) {
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
  const [quotes, setQuotes] = useState<OutstandingQuote[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  // The table this field lives in scrolls/clips its own overflow, which cut
  // the dropdown off — rendering it into a portal at a fixed, measured
  // position (instead of a plain absolutely-positioned child) escapes that.
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/saved-quotes/outstanding?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!cancelled && res.ok) setQuotes(data.quotes);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  function updatePosition() {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estHeight = 288;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estHeight && rect.top > spaceBelow;
    setPos({
      left: rect.left,
      width: Math.max(rect.width, 256),
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      maxHeight: Math.max(120, (openUp ? rect.top : spaceBelow) - 16),
    });
  }

  // Recomputed on open and kept in sync with scroll/resize while open —
  // flips to open upward when there isn't enough room below.
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    handler();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  function openDropdown() {
    updatePosition();
    setHighlightedIndex(-1);
    setOpen(true);
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)).slice(0, 8);
  }, [customers, query]);

  const exactMatch = customers.some(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase() || c.company.toLowerCase() === query.trim().toLowerCase()
  );
  const showAddNew = !exactMatch && query.trim().length > 0;
  const hasAnyResults = quotes.length > 0 || matches.length > 0 || showAddNew;

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

  function pickQuoteAt(i: number) {
    onPickQuote(quotes[i].id);
    setOpen(false);
  }
  function pickCustomerAt(i: number) {
    const c = matches[i];
    onSave(c.name);
    setQuery(c.name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    const total = quotes.length + matches.length + (showAddNew ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (total > 0) setHighlightedIndex((i) => Math.min(total - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (total > 0) setHighlightedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex < 0) return;
      e.preventDefault();
      if (highlightedIndex < quotes.length) {
        pickQuoteAt(highlightedIndex);
      } else if (highlightedIndex < quotes.length + matches.length) {
        pickCustomerAt(highlightedIndex - quotes.length);
      } else {
        addNewCustomer();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        className="h-8 text-xs w-36"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          openDropdown();
        }}
        onFocus={() => {
          setQuery(value);
          setFocused(true);
          openDropdown();
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          setFocused(false);
          if (query !== value) onSave(query);
        }, 150)}
      />
      {open && pos &&
        createPortal(
          <div
            style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight, zIndex: 9999 }}
            className="overflow-auto bg-white border border-[#E8E5E0] rounded-lg shadow-lg"
          >
            {quotes.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#9CA3AF] uppercase">
                  {t("ใบเสนอราคาค้างส่ง", "Outstanding quotations", "待发货报价单")}
                </p>
                {quotes.map((qt, i) => (
                  <button
                    key={qt.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickQuoteAt(i)}
                    className={`w-full text-left px-3 py-2 border-b border-[#F0EDE7] ${highlightedIndex === i ? "bg-[#FAF7F2]" : "hover:bg-[#FAF7F2]"}`}
                  >
                    <p className="text-xs font-medium text-[#1A1A1A] truncate">
                      {qt.doc_no} — {qt.customer_name}
                    </p>
                    <p className="text-[11px] text-[#6B6B6B] truncate">
                      ฿{fmtMoney(qt.total)} · {t(`ส่งแล้ว ${fmt(qt.shippedUnits)}/${fmt(qt.orderedUnits)} ชิ้น`, `Shipped ${qt.shippedUnits}/${qt.orderedUnits}`, `已发 ${qt.shippedUnits}/${qt.orderedUnits}`)}
                    </p>
                  </button>
                ))}
              </>
            )}
            {matches.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#9CA3AF] uppercase">
                  {t("ลูกค้า", "Customers", "客户")}
                </p>
                {matches.map((c, i) => {
                  const idx = quotes.length + i;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickCustomerAt(i)}
                      className={`w-full text-left px-3 py-2 border-b border-[#F0EDE7] last:border-0 ${highlightedIndex === idx ? "bg-[#FAF7F2]" : "hover:bg-[#FAF7F2]"}`}
                    >
                      <p className="text-xs font-medium text-[#1A1A1A] truncate">{c.name}</p>
                      {c.company && <p className="text-[11px] text-[#6B6B6B] truncate">{c.company}</p>}
                    </button>
                  );
                })}
              </>
            )}
            {showAddNew && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={addNewCustomer}
                disabled={creating}
                className={`w-full text-left px-3 py-2 text-xs text-[#C8102E] flex items-center gap-1.5 ${
                  highlightedIndex === quotes.length + matches.length ? "bg-[#FAF7F2]" : "hover:bg-[#FAF7F2]"
                }`}
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {t(`เพิ่ม "${query.trim()}" เป็นลูกค้าใหม่`, `Add "${query.trim()}" as a new customer`, `添加 "${query.trim()}" 为新客户`)}
              </button>
            )}
            {!hasAnyResults && (
              <p className="px-3 py-3 text-xs text-[#9CA3AF] text-center">
                {t("ไม่พบใบเสนอราคาหรือลูกค้า", "No quotations or customers found", "未找到报价单或客户")}
              </p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

interface SelectionState {
  [itemId: string]: { checked: boolean; qty: number; variantId: number | null };
}

// "Pull from quotation" — either opened straight onto one quote (from a
// row's customer field) or in search mode first (from the top-level
// button). Quote lines are free-text, never tied to a stock_variants row,
// so each one here only gets a *suggested* match; staff still confirm (or
// pick a different size of the same code) before anything is deducted.
function QuoteFulfillDialog({
  open, onOpenChange, initialQuoteId, exportDate, salesperson, availableByVariant, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialQuoteId: number | null;
  exportDate: string;
  salesperson: string | null;
  availableByVariant: Map<number, number>;
  onCreated: (rows: DailyExportRow[], deltas: { variantId: number; qty: number }[], quoteCustomerName: string) => void;
}) {
  const { t } = useLanguage();
  const [pickedQuoteId, setPickedQuoteId] = useState<number | null>(null);
  const effectiveQuoteId = pickedQuoteId ?? initialQuoteId;
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OutstandingQuote[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState<FulfillmentDetail | null>(null);
  const [selection, setSelection] = useState<SelectionState>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || effectiveQuoteId) return;
    let cancelled = false;
    (async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/saved-quotes/outstanding?q=${encodeURIComponent(search.trim())}`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setSearchResults(data.quotes);
        setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, effectiveQuoteId, search]);

  useEffect(() => {
    if (!open || !effectiveQuoteId) return;
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      const res = await fetch(`/api/admin/saved-quotes/${effectiveQuoteId}/fulfillment`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) {
          setDetail(data);
          const init: SelectionState = {};
          for (const it of data.items as FulfillmentItem[]) {
            if (it.remaining > 0) init[it.item_id] = { checked: false, qty: it.remaining, variantId: it.suggestedVariantId };
          }
          setSelection(init);
        } else {
          toast.error(data.error || t("โหลดไม่สำเร็จ", "Failed to load", "加载失败"));
        }
        setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, effectiveQuoteId, t]);

  function updateSelection(itemId: string, patch: Partial<SelectionState[string]>) {
    setSelection((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  async function handleConfirm() {
    if (!detail) return;
    const picks = Object.entries(selection).filter(([, s]) => s.checked && s.qty > 0 && s.variantId);
    if (!picks.length) {
      toast.error(t("เลือกรายการและยืนยันสินค้าในสต็อกก่อน", "Pick at least one item and confirm its stock match", "请先选择项目并确认库存商品"));
      return;
    }
    setSubmitting(true);
    const createdRows: DailyExportRow[] = [];
    // Tracked separately from createdRows: a pulled item may merge into a
    // row this same session already created, so the row's own qty is its
    // new *total*, not the amount newly deducted by this one pick.
    const deltas: { variantId: number; qty: number }[] = [];
    for (const [itemId, sel] of picks) {
      const item = detail.items.find((it) => it.item_id === itemId);
      if (!item) continue;
      const res = await fetch("/api/admin/daily-exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          export_date: exportDate,
          stock_variant_id: sel.variantId,
          sku: item.sku,
          size_text: item.size,
          image_url: item.image,
          qty: sel.qty,
          unit_price: item.unitPrice,
          discount_pct: detail.quote.discount_pct,
          customer_name: detail.quote.customer_name,
          po_no: detail.quote.doc_no,
          salesperson,
          quotation_id: detail.quote.id,
          quotation_item_id: itemId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`${item.sku}: ${data.error || t("เพิ่มไม่สำเร็จ", "Could not add", "添加失败")}`);
        continue;
      }
      createdRows.push(data.row);
      deltas.push({ variantId: sel.variantId as number, qty: sel.qty });
    }
    setSubmitting(false);
    if (createdRows.length) {
      onCreated(createdRows, deltas, detail.quote.customer_name);
      toast.success(
        t(`ดึงจากใบเสนอราคาแล้ว ${createdRows.length} รายการ`, `Pulled ${createdRows.length} item(s) from the quotation`, `已从报价单拉取 ${createdRows.length} 项`)
      );
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {detail
              ? `${detail.quote.doc_no} — ${detail.quote.customer_name}`
              : t("ดึงจากใบเสนอราคา", "Pull from Quotation", "从报价单拉取")}
          </DialogTitle>
        </DialogHeader>

        {!effectiveQuoteId && (
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <Input
              autoFocus
              placeholder={t("ค้นหาด้วยเลขใบเสนอราคาหรือชื่อลูกค้า...", "Search by quote no. or customer...", "按报价单号或客户搜索...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {searching ? (
                <div className="py-10 text-center text-sm text-[#9CA3AF]">
                  <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
                  {t("กำลังค้นหา...", "Searching...", "搜索中...")}
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#9CA3AF]">
                  {t("ไม่พบใบเสนอราคาที่ค้างส่ง", "No outstanding quotations found", "未找到待发货报价单")}
                </p>
              ) : (
                searchResults.map((qt) => (
                  <button
                    key={qt.id}
                    type="button"
                    onClick={() => setPickedQuoteId(qt.id)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-[#E8E5E0] hover:border-[#C8102E] hover:bg-[#FAF7F2]"
                  >
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {qt.doc_no} — {qt.customer_name}
                    </p>
                    <p className="text-xs text-[#6B6B6B]">
                      ฿{fmtMoney(qt.total)} ·{" "}
                      {t(`ส่งแล้ว ${fmt(qt.shippedUnits)}/${fmt(qt.orderedUnits)} ชิ้น`, `Shipped ${qt.shippedUnits}/${qt.orderedUnits}`, `已发 ${qt.shippedUnits}/${qt.orderedUnits}`)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {effectiveQuoteId && (
          <div className="flex-1 min-h-0 flex flex-col">
            {loadingDetail || !detail ? (
              <div className="py-10 text-center text-sm text-[#9CA3AF]">
                <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
                {t("กำลังโหลด...", "Loading...", "加载中...")}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {detail.items.filter((it) => it.remaining > 0).length === 0 ? (
                  <p className="py-10 text-center text-sm text-[#9CA3AF]">
                    {t("ใบนี้ส่งครบแล้วทุกรายการ", "Every line on this quote has shipped in full", "此单所有项目均已发货完毕")}
                  </p>
                ) : (
                  detail.items
                    .filter((it) => it.remaining > 0)
                    .map((it) => {
                      const sel = selection[it.item_id] ?? { checked: false, qty: it.remaining, variantId: it.suggestedVariantId };
                      const ceiling = sel.variantId
                        ? Math.min(it.remaining, availableByVariant.get(sel.variantId) ?? it.remaining)
                        : it.remaining;
                      return (
                        <div key={it.item_id} className="flex items-start gap-2 p-2 border border-[#E8E5E0] rounded-lg">
                          <input
                            type="checkbox"
                            className="mt-1.5"
                            checked={sel.checked}
                            disabled={!sel.variantId}
                            onChange={(e) => updateSelection(it.item_id, { checked: e.target.checked })}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono font-semibold text-[#1A1A1A] truncate">{it.sku || it.name}</p>
                            <p className="text-[11px] text-[#6B6B6B]">
                              {it.size} · {t(`ค้างส่ง ${fmt(it.remaining)}/${fmt(it.qty)} ชิ้น`, `${it.remaining}/${it.qty} left`, `剩余 ${it.remaining}/${it.qty}`)}
                            </p>
                            {it.candidates.length === 0 ? (
                              <p className="text-[11px] text-red-500 mt-1">{t("ไม่พบสินค้านี้ในสต็อก", "Not found in Stock", "库存中未找到")}</p>
                            ) : it.candidates.length === 1 ? (
                              <p className="text-[11px] text-[#6B6B6B] mt-1">
                                {it.candidates[0].size_text || "-"} ({fmt(availableByVariant.get(it.candidates[0].variantId) ?? it.candidates[0].available)})
                              </p>
                            ) : (
                              <Select
                                value={sel.variantId ? String(sel.variantId) : "__none"}
                                onValueChange={(v) => updateSelection(it.item_id, { variantId: v === "__none" ? null : Number(v) })}
                              >
                                <SelectTrigger size="sm" className="h-7 text-xs w-full mt-1">
                                  <SelectValue>
                                    {(v: string) => {
                                      const c = it.candidates.find((c) => String(c.variantId) === v);
                                      return c ? `${c.size_text || "-"} (${fmt(availableByVariant.get(c.variantId) ?? c.available)})` : t("เลือกขนาด", "Pick size", "选择尺寸");
                                    }}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none">{t("เลือกขนาด", "Pick size", "选择尺寸")}</SelectItem>
                                  {it.candidates.map((c) => (
                                    <SelectItem key={c.variantId} value={String(c.variantId)}>
                                      {c.size_text || "-"} ({fmt(availableByVariant.get(c.variantId) ?? c.available)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <Input
                            type="number"
                            min={1}
                            max={ceiling}
                            disabled={!sel.checked}
                            className="h-7 text-xs w-16"
                            value={sel.qty}
                            onChange={(e) => updateSelection(it.item_id, { qty: Number(e.target.value) || 0 })}
                          />
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X size={13} className="mr-1" /> {t("ปิด", "Close", "关闭")}
          </Button>
          {effectiveQuoteId && (
            <Button size="sm" onClick={handleConfirm} disabled={submitting || loadingDetail}>
              {submitting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              {t("ยืนยันตัดสต็อก", "Confirm & deduct Stock", "确认并扣减库存")}
            </Button>
          )}
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
  const [products, setProducts] = useState<GroupedProduct[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillQuoteId, setFulfillQuoteId] = useState<number | null>(null);
  const [fulfillOriginRowId, setFulfillOriginRowId] = useState<number | null>(null);
  // Stock is fetched once; this ledger tracks every unit deducted/returned
  // by actions taken in this session since then, so the picker's remaining
  // counts stay correct without re-fetching the whole catalog on every pick.
  const [sessionDelta, setSessionDelta] = useState<Record<number, number>>({});

  const liveProducts = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        variants: p.variants.map((v) => ({ ...v, available: v.available - (sessionDelta[v.variantId] || 0) })),
      })),
    [products, sessionDelta]
  );
  const liveAvailableByVariant = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of liveProducts) for (const v of p.variants) m.set(v.variantId, v.available);
    return m;
  }, [liveProducts]);

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
      // Picking a size that's already a row for today tops that row up
      // instead of creating a duplicate — the server returns that same row.
      setRows((prev) => (prev.some((r) => r.id === data.row.id) ? prev.map((r) => (r.id === data.row.id ? data.row : r)) : [...prev, data.row]));
      setSessionDelta((prev) => ({ ...prev, [v.variantId]: (prev[v.variantId] || 0) + 1 }));
      toast.success(t(`ตัด ${v.code} แล้ว 1 ชิ้น`, `Deducted 1 of ${v.code}`, `已扣除 ${v.code} 1 件`));
    } else {
      toast.error(data.error || t("เพิ่มไม่สำเร็จ", "Could not add", "添加失败"));
    }
  }

  function patchLocal(id: number, change: Partial<DailyExportRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  async function saveRow(id: number, change: Partial<DailyExportRow>) {
    const prevRow = rows.find((r) => r.id === id);
    patchLocal(id, change);
    const res = await fetch(`/api/admin/daily-exports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      if (data?.row) patchLocal(id, data.row);
      // Only move the stock ledger once the server has confirmed the
      // change actually went through.
      if (change.qty !== undefined && prevRow) {
        const delta = change.qty - prevRow.qty;
        setSessionDelta((prev) => ({ ...prev, [prevRow.stock_variant_id]: (prev[prevRow.stock_variant_id] || 0) + delta }));
      }
    } else {
      toast.error(data?.error || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
      load();
    }
  }

  async function deleteRow(id: number) {
    const row = rows.find((r) => r.id === id);
    const prev = rows;
    setRows((list) => list.filter((r) => r.id !== id));
    const res = await fetch(`/api/admin/daily-exports/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRows(prev);
      toast.error(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
    } else {
      if (row) setSessionDelta((prevD) => ({ ...prevD, [row.stock_variant_id]: (prevD[row.stock_variant_id] || 0) - row.qty }));
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

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-2">
        <Button onClick={() => setPickerOpen(true)} disabled={adding}>
          {adding ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Plus size={16} className="mr-1.5" />}
          {t("เพิ่มรายการ — เลือกสินค้าจากสต็อก", "Add item — pick from Stock", "添加项目 — 从库存中选择")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFulfillQuoteId(null);
            setFulfillOriginRowId(null);
            setFulfillOpen(true);
          }}
        >
          <FileSearch size={16} className="mr-1.5" />
          {t("ดึงจากใบเสนอราคา", "Pull from Quotation", "从报价单拉取")}
        </Button>
      </div>

      <StockGridPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} products={liveProducts} onPick={addRow} />

      <QuoteFulfillDialog
        open={fulfillOpen}
        onOpenChange={setFulfillOpen}
        initialQuoteId={fulfillQuoteId}
        exportDate={date}
        salesperson={currentUser}
        availableByVariant={liveAvailableByVariant}
        onCreated={(createdRows, deltas, quoteCustomerName) => {
          // A pulled item may have merged into a row this session already
          // created (pulling the same line twice) rather than being brand
          // new — update it in place then instead of appending a duplicate.
          setRows((prev) => {
            let next = prev;
            for (const row of createdRows) {
              next = next.some((r) => r.id === row.id) ? next.map((r) => (r.id === row.id ? row : r)) : [...next, row];
            }
            return next;
          });
          setSessionDelta((prev) => {
            const next = { ...prev };
            for (const d of deltas) next[d.variantId] = (next[d.variantId] || 0) + d.qty;
            return next;
          });
          if (fulfillOriginRowId) saveRow(fulfillOriginRowId, { customer_name: quoteCustomerName });
        }}
      />

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
                        min={0}
                        max={(liveAvailableByVariant.get(r.stock_variant_id) ?? 0) + r.qty}
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
                      <CustomerPicker
                        value={r.customer_name}
                        onSave={(name) => saveRow(r.id, { customer_name: name })}
                        onPickQuote={(quoteId) => {
                          setFulfillQuoteId(quoteId);
                          setFulfillOriginRowId(r.id);
                          setFulfillOpen(true);
                        }}
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
