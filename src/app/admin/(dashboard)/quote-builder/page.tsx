"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Printer, Search, Save, FolderOpen, FilePlus2, Upload, Loader2, X, FileSpreadsheet, Archive, ArchiveRestore, Truck, ImageOff, RefreshCw, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import rawStock from "@/data/stock-demo.json";
import { useLanguage } from "@/store/language";
import type { SavedQuote, SavedQuoteItem, SavedQuoteDocType, SavedQuoteStatus, SavedQuoteChannel, SavedQuotePayment, PaymentMethod, PaymentType } from "@/types";
import { getAvailable, type DraftLine } from "@/lib/shared-stock";
import {
  STATUS_META, STATUS_ORDER, CHANNEL_META, CHANNEL_ORDER,
  SALESPEOPLE, PAYMENT_METHOD_META, PAYMENT_METHOD_ORDER, PAYMENT_TYPE_META, PAYMENT_TYPE_ORDER,
  computeGrandTotal,
} from "@/lib/saved-quote-options";
import type ExcelJS from "exceljs";

type DocType = SavedQuoteDocType;
type LangMode = "th-en-zh" | "th-en" | "th-zh";

interface TriText {
  th: string;
  en: string;
  zh: string;
}

interface LineItem {
  id: string;
  name: string
  sku: string;
  size: string;
  qty: number;
  unitPrice: number;
  remark: string;
  remarkImage: string | null;
  image: string | null;
  seats: number;
  baseUnitPrice: number;
  stock_variant_id: number | null;
  unit: string;
}

const SEAT_OPTIONS = [1, 2, 3, 4, 5, 6];

// Catalog price is the 1-seat price; each seat added on top costs half of
// that base price (shared frame/legs bring the per-seat cost down).
function computeSeatPrice(baseUnitPrice: number, seats: number): number {
  return baseUnitPrice + (seats - 1) * Math.floor(baseUnitPrice / 2);
}

type SavedListRow = Pick<
  SavedQuote,
  "id" | "doc_type" | "doc_no" | "customer_name" | "doc_date" | "updated_at" | "status" | "archived" | "channel" | "items" | "discount_pct" | "vat_pct"
>;

const DOC_LABELS: Record<DocType, TriText & { prefix: string }> = {
  quotation:     { th: "ใบเสนอราคา", en: "QUOTATION",      zh: "报价单", prefix: "QT" },
  invoice:       { th: "ใบแจ้งหนี้", en: "INVOICE",        zh: "发票",   prefix: "IV" },
  delivery_note: { th: "ใบส่งของ",   en: "DELIVERY NOTE",  zh: "送货单", prefix: "DN" },
};

const DOC_NO_LABELS: Record<DocType, TriText> = {
  quotation:     { th: "เลขที่ใบเสนอราคา", en: "Quotation No", zh: "报价单号" },
  invoice:       { th: "เลขที่ใบแจ้งหนี้", en: "Invoice No",   zh: "发票号码" },
  delivery_note: { th: "เลขที่ใบส่งของ",   en: "DN No.",       zh: "送货单号" },
};

const LANG_OPTIONS: { value: LangMode; label: string }[] = [
  { value: "th-en-zh", label: "ไทย / Eng / 中文" },
  { value: "th-en",    label: "ไทย / Eng" },
  { value: "th-zh",    label: "ไทย / 中文" },
];

const COMPANY = {
  nameEn: "FUTAI FURNITURE CO.,LTD.",
  nameZh: "富泰家具有限公司（泰国）",
  nameTh: "บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด",
  taxId: "0135568015065",
  tel: "061 898 0412",
  web: "www.futaifurniture.com",
  email: "futai.furniture@gmail.com",
};

const TXT = {
  address:        { th: "ที่อยู่",           en: "Address",     zh: "地址" },
  tel:            { th: "โทรศัพท์",         en: "Tel",          zh: "电话" },
  web:            { th: "เว็บไซต์",         en: "Website",      zh: "网站" },
  email:          { th: "อีเมล",            en: "Email",        zh: "邮箱" },
  taxId:          { th: "เลขผู้เสียภาษี",   en: "Tax ID",       zh: "纳税人识别号" },
  date:           { th: "วันที่",           en: "Date",         zh: "日期" },
  customer:       { th: "ลูกค้า",           en: "Customer",     zh: "客户" },
  shipAddress:    { th: "ที่อยู่จัดส่ง",     en: "Delivery Address", zh: "发货地址" },
  shipDate:       { th: "วันที่จัดส่ง",     en: "Delivery Date",    zh: "发货日期" },
  shipContact:    { th: "บุคคลที่ติดต่อ",   en: "Contact Person",   zh: "联系人" },
  shipPhone:      { th: "หมายเลขโทรศัพท์", en: "Phone",             zh: "电话" },
  colNo:          { th: "ลำดับ",            en: "No.",          zh: "序号" },
  colItem:        { th: "ชื่อสินค้า",       en: "Item",         zh: "品名" },
  colModel:       { th: "แบบอย่าง",         en: "Model",        zh: "型号" },
  colPhoto:       { th: "ภาพ",              en: "Photo",        zh: "图片" },
  colSize:        { th: "ขนาด (mm)",        en: "Size (mm)",    zh: "规格" },
  colQty:         { th: "ปริมาณ",           en: "Qty",          zh: "数量" },
  colUnit:        { th: "หน่วย",            en: "Unit",         zh: "单位" },
  colUnitPrice:   { th: "ราคาต่อหน่วย",     en: "Unit Price",   zh: "单价" },
  colAmount:      { th: "จำนวนเงินทั้งหมด", en: "Amount",       zh: "总价" },
  colRemark:      { th: "หมายเหตุ",         en: "Remark",       zh: "备注" },
  subtotal:       { th: "รวมเป็นเงิน / รวมราคาสินค้า", en: "Subtotal",     zh: "小计" },
  discount:       { th: "หัก ส่วนลด",           en: "Discount",     zh: "折扣" },
  afterDiscount:  { th: "ราคาหลังหักส่วนลด / ยอดรวมก่อนภาษี", en: "Total after discount (before VAT)", zh: "折扣后金额（税前）" },
  vatAmountLabel: { th: "ภาษีมูลค่าเพิ่ม", en: "VAT",          zh: "增值税" },
  grandTotal:     { th: "ราคารวมทั้งสิ้น / ยอดรวมสุทธิ",  en: "Grand Total",  zh: "总价" },
  depositAmount:  { th: "เงินมัดจำ",        en: "Deposit",      zh: "定金" },
  balance:        { th: "ยอดคงเหลือหลังจัดส่งและติดตั้ง", en: "Balance", zh: "余款" },
  term1: {
    th: "เวลาจัดส่ง: ภายใน 3 วันหลังจากได้รับเงินมัดจำ (สำหรับสินค้าสั่งผลิตต้องใช้เวลา 30 วัน)",
    en: "Delivery time: within 3 days after deposit received (made-to-order items require 30 days)",
    zh: "发货时间：收到定金3天内（定制产品需要30天）",
  },
  term2: {
    th: "เงื่อนไขการชำระเงิน: มัดจำตาม % ที่ระบุ ส่วนที่เหลือชำระหลังจากจัดส่งและติดตั้ง",
    en: "Payment terms: deposit as specified %, balance due after delivery and installation",
    zh: "付款条款：定金，余款在完成运输和安装之后结清。",
  },
  term3: {
    th: "รูปภาพและตัวอย่างสินค้าในเอกสารนี้เป็นเพียงการอ้างอิง สินค้าจริงอาจมีความแตกต่างของสีและรายละเอียดเล็กน้อย",
    en: "Images and samples in this document are for reference only; actual products may vary slightly in color and detail.",
    zh: "本文件中的图片和样品仅供参考，实际产品的颜色及细节可能略有不同。",
  },
  term4: {
    th: "เอกสารนี้มีอายุ 30 วันนับจากวันที่ออก",
    en: "This document is valid for 30 days from the issue date.",
    zh: "报价有效期30天。",
  },
  sellerSign:   { th: "ผู้ขาย (ประทับตราบริษัท)", en: "Seller (Company Stamp)", zh: "销售方（盖章）" },
  buyerSign:    { th: "ผู้ซื้อ (ประทับตราบริษัท)", en: "Buyer (Company Stamp)",  zh: "采购方（盖章）" },
  receiverSign: { th: "ลายเซ็นผู้รับสินค้า",       en: "Received By",            zh: "收货人签名" },
  senderSign:   { th: "ลายเซ็นผู้ส่งของ",          en: "Delivered By",           zh: "送货人签名" },
} satisfies Record<string, TriText>;

function joinLang(langMode: LangMode, t: TriText): string {
  if (langMode === "th-en-zh") return `${t.th} / ${t.en} / ${t.zh}`;
  if (langMode === "th-en") return `${t.th} / ${t.en}`;
  return `${t.th} / ${t.zh}`;
}

// The default "Terms of Sale" text, seeded from TXT.term1-4 in whichever
// language(s) are selected. Once saved, it's just plain editable text per
// document — editing it no longer regenerates from the language toggle.
function defaultTermsText(langMode: LangMode): string {
  return [TXT.term1, TXT.term2, TXT.term3, TXT.term4]
    .map((t, i) => `${i + 1}. ${joinLang(langMode, t)}`)
    .join("\n");
}

function newLine(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    sku: "",
    size: "",
    qty: 1,
    unitPrice: 0,
    remark: "",
    remarkImage: null,
    image: null,
    seats: 1,
    baseUnitPrice: 0,
    stock_variant_id: null,
    unit: "",
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt0(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
}

interface StockCat {
  key: string;
  th: string;
  en: string;
  zh: string;
}
const STOCK_CATEGORIES = rawStock.categories as StockCat[];

interface QBVariantOption {
  variantId: number;
  code: string;
  size_text: string;
  price: number | null;
  available: number;
  reserved: number;
  unitFactor: number;
  imageUrls: string[];
}
interface QBGroupedProduct {
  productId: number;
  code: string;
  category: string;
  image_url: string | null;
  inShowroom: boolean;
  madeToOrder: boolean;
  sharedStock: boolean;
  sharedAvailableModules: number;
  variants: QBVariantOption[];
}
interface PickedStockVariant {
  variantId: number;
  code: string;
  category: string;
  size_text: string;
  price: number | null;
  image_url: string | null;
}

// Same "one card per model, size buttons underneath" picker as Daily
// Export's Stock picker, with one difference on purpose: nothing here is
// ever disabled. A quotation can always offer a size that's out of stock
// or permanently made-to-order — it just labels those cases instead of
// blocking the pick, since quoting is what happens *before* stock exists.
function StockProductPickerDialog({
  open, onOpenChange, products, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: QBGroupedProduct[];
  onPick: (v: PickedStockVariant) => void;
}) {
  const { t, lang } = useLanguage();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(60);

  function updateQ(v: string) {
    setQ(v);
    setVisibleCount(60);
  }
  function updateCat(v: string) {
    setCat(v);
    setVisibleCount(60);
  }

  const catLabel = (key: string) => {
    const c = STOCK_CATEGORIES.find((c) => c.key === key);
    return c ? t(c.th, c.en, c.zh) : key;
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!query) return true;
      return (
        p.code.toLowerCase().includes(query) ||
        catLabel(p.category).toLowerCase().includes(query) ||
        p.variants.some((v) => v.size_text.toLowerCase().includes(query) || v.code.toLowerCase().includes(query))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, cat, lang]);

  const matches = filtered.slice(0, visibleCount);
  const categoriesInUse = useMemo(() => {
    const keys = new Set(products.map((p) => p.category));
    return STOCK_CATEGORIES.filter((c) => keys.has(c.key));
  }, [products]);

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
            placeholder={t("ค้นหารหัสรุ่น / หมวดหมู่...", "Search model code / category...", "搜索型号/类别...")}
            value={q}
            onChange={(e) => updateQ(e.target.value)}
          />
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
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {p.inShowroom && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                          {t("โชว์รูม", "Showroom", "展厅")}
                        </span>
                      )}
                      {p.madeToOrder && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                          {t("สั่งทำ", "Made to order", "定制")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 px-2 pb-2">
                  {p.variants.map((v) => {
                    const stockLabel = p.madeToOrder
                      ? t("สั่งทำ", "Made to order", "定制")
                      : v.available > 0
                        ? t(`พร้อมขาย ${fmt0(v.available)} (จอง ${fmt0(v.reserved)})`, `${v.available} ready (${v.reserved} reserved)`, `现货 ${v.available}（已订 ${v.reserved}）`)
                        : t("สั่งผลิต", "To produce", "待生产");
                    const warn = p.madeToOrder || v.available <= 0;
                    return (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() =>
                          onPick({ variantId: v.variantId, code: v.code || p.code, category: p.category, size_text: v.size_text, price: v.price, image_url: v.imageUrls[0] || p.image_url })
                        }
                        className="text-left text-[10px] px-1.5 py-1 rounded border border-[#E8E5E0] bg-[#FAF7F2] hover:border-[#C8102E] hover:bg-white transition-colors"
                      >
                        <span className="font-mono font-medium text-[#1A1A1A]">{v.size_text || "-"}</span>
                        {v.price != null && <span className="text-[#6B6B6B]"> · ฿{fmtMoney(v.price)}</span>}
                        {v.code && v.code !== p.code && <span className="block font-mono text-[#9CA3AF]">{v.code}</span>}
                        <span className={`block ${warn ? "text-orange-600" : "text-[#6B6B6B]"}`}>{stockLabel}</span>
                      </button>
                    );
                  })}
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

// Single-field version of CompanyPicker — the text IS the customer name
// (not a separate search-only box above a plain name input), so typing
// always shows matching suggestions and picking one fills in the rest.
function CustomerNamePicker({
  value,
  onChange,
  savedList,
  onPickFull,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  savedList: SavedListRow[];
  onPickFull: (id: number) => void;
  placeholder?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 1) return [];
    const seen = new Set<string>();
    const results: SavedListRow[] = [];
    for (const row of savedList) {
      if (!row.customer_name) continue;
      const name = row.customer_name.toLowerCase();
      if (!name.includes(q) || seen.has(name)) continue;
      seen.add(name);
      results.push(row);
      if (results.length >= 8) break;
    }
    return results;
  }, [value, savedList]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <Input
          className="pl-8"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || t("ค้นหาชื่อลูกค้าหรือรหัสลูกค้า...", "Search customer name or code...", "搜索客户名称或编号...")}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-[#E8E5E0] rounded-lg shadow-lg">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPickFull(m.id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FAF7F2] border-b border-[#F0EDE7] last:border-0"
            >
              <p className="text-xs font-medium text-[#1A1A1A] truncate">{m.customer_name}</p>
              <p className="text-[11px] text-[#6B6B6B]">{m.doc_no} · {m.doc_date}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyPicker({
  savedList,
  onPick,
}: {
  savedList: SavedListRow[];
  onPick: (id: number) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const seen = new Set<string>();
    const results: SavedListRow[] = [];
    // savedList is already sorted by updated_at desc, so the first hit per
    // company name is also the most recent one — good enough as "the" match.
    for (const row of savedList) {
      if (!row.customer_name) continue;
      const name = row.customer_name.toLowerCase();
      if (!name.includes(q) || seen.has(name)) continue;
      seen.add(name);
      results.push(row);
      if (results.length >= 8) break;
    }
    return results;
  }, [query, savedList]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <Input
          className="h-8 pl-7 text-xs"
          placeholder={t(
            "ค้นหาชื่อบริษัทที่เคยบันทึกไว้...",
            "Search a previously saved company...",
            "搜索已保存的公司名称..."
          )}
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
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(m.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FAF7F2] border-b border-[#F0EDE7] last:border-0"
            >
              <p className="text-xs font-medium text-[#1A1A1A] truncate">{m.customer_name}</p>
              <p className="text-[11px] text-[#6B6B6B]">{m.doc_no} · {m.doc_date}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageUploadTile({ image, onChange }: { image: string | null; onChange: (url: string | null) => void }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/products/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("อัปโหลดรูปไม่สำเร็จ", "Upload failed", "上传失败"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`relative w-16 h-12 shrink-0 rounded bg-[#F5F3EF] overflow-hidden border cursor-pointer group flex items-center justify-center transition-colors ${
        dragOver ? "border-[#C8102E] border-2 bg-[#C8102E]/5" : "border-[#E8E5E0]"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {image ? (
        <>
          <Image src={image} alt="" fill sizes="64px" className="object-contain" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Upload size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
            }}
            aria-label={t("ลบรูป", "Remove image", "删除图片")}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >
            <X size={10} />
          </button>
        </>
      ) : (
        <Upload size={16} className="text-[#C8C5BE]" />
      )}
      {uploading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-[#C8102E]" />
        </div>
      )}
    </label>
  );
}

function emptyPaymentForm() {
  return {
    paid_date: todayStr(),
    amount: "",
    percent: "",
    payment_type: "deposit" as PaymentType,
    method: "transfer" as PaymentMethod,
    slip_url: null as string | null,
    note: "",
  };
}

// Deposit/payment tracking for a saved quote — attach a slip, log the %,
// method, etc. Only meaningful once the quote has an id, since payments
// belong to a specific saved record.
function PaymentsSection({ quoteId }: { quoteId: number | null }) {
  const { t } = useLanguage();
  const [payments, setPayments] = useState<SavedQuotePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyPaymentForm());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!quoteId) {
        if (!cancelled) setPayments([]);
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/admin/saved-quotes/${quoteId}/payments`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setPayments(data.payments);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  async function addPayment() {
    if (!quoteId) return;
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error(t("กรุณาใส่จำนวนเงิน", "Please enter an amount", "请输入金额"));
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/saved-quotes/${quoteId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paid_date: form.paid_date,
        amount: Number(form.amount) || 0,
        percent: form.percent === "" ? null : Number(form.percent),
        payment_type: form.payment_type,
        method: form.method,
        slip_url: form.slip_url,
        note: form.note,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setPayments((prev) => [...prev, data.payment]);
      setForm(emptyPaymentForm());
      toast.success(t("บันทึกการชำระเงินแล้ว", "Payment saved", "已保存付款记录"));
    } else {
      toast.error(data.error || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
    }
  }

  async function removePayment(id: number) {
    if (!quoteId) return;
    const prev = payments;
    setPayments((list) => list.filter((p) => p.id !== id));
    const res = await fetch(`/api/admin/saved-quotes/${quoteId}/payments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setPayments(prev);
      toast.error(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
    }
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <p className="text-sm font-semibold text-[#1A1A1A]">{t("การชำระเงิน", "Payments", "付款记录")}</p>

      {!quoteId ? (
        <p className="text-xs text-[#9CA3AF]">
          {t("บันทึกใบนี้ก่อน ถึงจะเพิ่มรายการชำระเงินได้", "Save this document first to add payments", "请先保存文件才能添加付款记录")}
        </p>
      ) : (
        <>
          {payments.length > 0 && (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-start gap-2 border border-[#E8E5E0] rounded-lg p-2.5">
                  {p.slip_url && (
                    <a href={p.slip_url} target="_blank" rel="noreferrer" className="relative w-12 h-12 shrink-0 rounded bg-[#F5F3EF] overflow-hidden border border-[#E8E5E0]">
                      <Image src={p.slip_url} alt="" fill sizes="48px" className="object-cover" />
                    </a>
                  )}
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-medium text-[#1A1A1A]">
                      ฿{fmtMoney(p.amount)}
                      {p.percent != null && <span className="text-[#6B6B6B]"> ({p.percent}%)</span>}
                      <span className="text-[#6B6B6B]"> · {t(PAYMENT_TYPE_META[p.payment_type].th, PAYMENT_TYPE_META[p.payment_type].en, PAYMENT_TYPE_META[p.payment_type].zh)}</span>
                    </p>
                    <p className="text-[#6B6B6B]">
                      {p.paid_date} · {t(PAYMENT_METHOD_META[p.method].th, PAYMENT_METHOD_META[p.method].en, PAYMENT_METHOD_META[p.method].zh)}
                    </p>
                    {p.note && <p className="text-[#9CA3AF]">{p.note}</p>}
                  </div>
                  <button type="button" onClick={() => removePayment(p.id)} aria-label={t("ลบ", "Remove", "删除")} className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <p className="text-right text-xs text-[#6B6B6B]">
                {t("ชำระแล้วรวม", "Total paid", "已付合计")}: <span className="font-semibold text-[#1A1A1A]">฿{fmtMoney(totalPaid)}</span>
              </p>
            </div>
          )}
          {loading && <p className="text-xs text-[#9CA3AF]">{t("กำลังโหลด...", "Loading...", "加载中...")}</p>}

          <div className="border border-dashed border-[#E8E5E0] rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <ImageUploadTile image={form.slip_url} onChange={(url) => setForm((f) => ({ ...f, slip_url: url }))} />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input type="date" className="h-8 text-xs" value={form.paid_date} onChange={(e) => setForm((f) => ({ ...f, paid_date: e.target.value }))} />
                <Input type="number" className="h-8 text-xs" placeholder={t("จำนวนเงิน", "Amount", "金额")} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input type="number" className="h-8 text-xs" placeholder="%" value={form.percent} onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))} />
              <Select value={form.payment_type} onValueChange={(v) => setForm((f) => ({ ...f, payment_type: v as PaymentType }))}>
                <SelectTrigger size="sm" className="h-8 text-xs">
                  <SelectValue>{(v: PaymentType) => t(PAYMENT_TYPE_META[v].th, PAYMENT_TYPE_META[v].en, PAYMENT_TYPE_META[v].zh)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPE_ORDER.map((v) => (
                    <SelectItem key={v} value={v}>{t(PAYMENT_TYPE_META[v].th, PAYMENT_TYPE_META[v].en, PAYMENT_TYPE_META[v].zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v as PaymentMethod }))}>
                <SelectTrigger size="sm" className="h-8 text-xs">
                  <SelectValue>{(v: PaymentMethod) => t(PAYMENT_METHOD_META[v].th, PAYMENT_METHOD_META[v].en, PAYMENT_METHOD_META[v].zh)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_ORDER.map((v) => (
                    <SelectItem key={v} value={v}>{t(PAYMENT_METHOD_META[v].th, PAYMENT_METHOD_META[v].en, PAYMENT_METHOD_META[v].zh)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              className="h-8 text-xs"
              placeholder={t("หมายเหตุ (ให้ฝ่ายบัญชีอ่าน)", "Note (for accounting)", "备注（给财务看）")}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
            <Button type="button" size="sm" className="w-full" disabled={saving} onClick={addPayment}>
              <Plus size={13} className="mr-1" /> {saving ? t("กำลังบันทึก...", "Saving...", "保存中...") : t("บันทึก", "Save", "保存")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface FulfillmentLineItem {
  item_id?: string;
  name: string;
  sku: string;
  size: string;
  qty: number;
  shipped: number;
  remaining: number;
}
interface FulfillmentHistoryRow {
  id: number;
  export_date: string;
  sku: string;
  size_text: string;
  qty: number;
  salesperson: string | null;
}

// Read-only — shipped/remaining per line and the actual export history,
// both pulled live from Daily Export's own records (never a separately
// tracked number, so it can't drift). Recording a shipment only ever
// happens from Daily Export itself, never from here.
function ShipmentHistorySection({ quoteId }: { quoteId: number | null }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<FulfillmentLineItem[]>([]);
  const [history, setHistory] = useState<FulfillmentHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/saved-quotes/${quoteId}/fulfillment`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) {
          setItems(data.items);
          setHistory(data.history);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  if (!quoteId || (!loading && !history.length)) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-[#1A1A1A]">
        {t("ประวัติการส่งออก (จากหน้าการส่งออกรายวัน)", "Export History (from Daily Export)", "出库记录（来自每日出库）")}
      </p>
      {loading ? (
        <Loader2 size={16} className="animate-spin text-[#9CA3AF]" />
      ) : (
        <>
          <div className="space-y-1">
            {items.map((it) => (
              <div key={it.item_id || it.sku} className="flex items-center justify-between text-xs gap-2">
                <span className="text-[#6B6B6B] truncate">
                  {it.sku || it.name} · {it.size}
                </span>
                <span className={`font-medium shrink-0 ${it.remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {t(`ส่งแล้ว ${it.shipped}/${it.qty}`, `${it.shipped}/${it.qty} shipped`, `已发 ${it.shipped}/${it.qty}`)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#F0EDE7] pt-2 space-y-1">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-[11px] text-[#9CA3AF] gap-2">
                <span className="truncate">
                  {h.export_date} · {h.sku} {h.size_text}
                </span>
                <span className="shrink-0">
                  {t(`${h.qty} ชิ้น`, `${h.qty} pcs`, `${h.qty} 件`)} · {h.salesperson || "-"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function QuoteBuilderInner({ defaultDocType = "quotation" }: { defaultDocType?: DocType } = {}) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [docType, setDocType] = useState<DocType>(defaultDocType);
  const [langMode, setLangMode] = useState<LangMode>("th-en-zh");
  // Editable per-document — defaults to the company's main number, but a
  // different salesperson's number can be swapped in on the letterhead.
  const [companyTel, setCompanyTel] = useState(COMPANY.tel);
  const [docNo, setDocNo] = useState(`${DOC_LABELS.quotation.prefix}${todayStr().replace(/-/g, "")}-01`);
  // True once the doc number has been hand-edited (or loaded from an
  // existing saved document) — lets saveQuote() warn only when someone is
  // about to save a brand-new document still carrying the generic default
  // number, which they almost always meant to swap for their own.
  const [docNoTouched, setDocNoTouched] = useState(false);
  // Reveals the doc-no warning below, but only once someone has actually
  // tried to save — the first click just shows it (and doesn't save yet);
  // clicking Save again goes ahead regardless, which is the "skip" path.
  const [docNoWarningAcked, setDocNoWarningAcked] = useState(false);
  const [channel, setChannel] = useState<SavedQuoteChannel>("other");
  const [date, setDate] = useState(todayStr());
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingDate, setShippingDate] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [termsText, setTermsText] = useState(() => defaultTermsText("th-en-zh"));
  const [discountPct, setDiscountPct] = useState(0);
  const [vatPct, setVatPct] = useState(7);
  const [depositPct, setDepositPct] = useState(50);
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [stockProducts, setStockProducts] = useState<QBGroupedProduct[]>([]);
  const [stockPickerOpen, setStockPickerOpen] = useState(false);
  const [stockPickerTarget, setStockPickerTarget] = useState<string | null>(null);

  // Fetched once — every line item's "pick from Stock" button reuses this
  // same list rather than each row fetching its own copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/stock?archived=false");
      const data = await res.json();
      if (cancelled || !res.ok) return;
      const grouped: QBGroupedProduct[] = [];
      for (const p of data.products as {
        id: number; code: string; category: string; image_url: string | null; in_showroom: boolean; made_to_order: boolean;
        shared_stock: boolean; shared_available_modules: number;
        stock_variants: { id: number; code: string; size_text: string; price: number | null; available: number; reserved: number; archived: boolean; unit_factor: number; image_urls: string[] | null }[];
      }[]) {
        const variants = p.stock_variants
          .filter((v) => !v.archived)
          .map((v) => ({ variantId: v.id, code: v.code, size_text: v.size_text, price: v.price, available: v.available, reserved: v.reserved, unitFactor: v.unit_factor || 1, imageUrls: v.image_urls || [] }));
        if (!variants.length) continue;
        grouped.push({
          productId: p.id, code: p.code, category: p.category, image_url: p.image_url,
          inShowroom: p.in_showroom, madeToOrder: p.made_to_order,
          sharedStock: !!p.shared_stock, sharedAvailableModules: p.shared_available_modules || 0, variants,
        });
      }
      setStockProducts(grouped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stockVariantMeta = useMemo(() => {
    const m = new Map<number, { productId: number; unitFactor: number; sharedStock: boolean }>();
    for (const p of stockProducts) for (const v of p.variants) m.set(v.variantId, { productId: p.productId, unitFactor: v.unitFactor, sharedStock: p.sharedStock });
    return m;
  }, [stockProducts]);

  // For a shared-stock model, every other line already in this quote that
  // uses the same model eats into what this row's picker can still show —
  // excludes the row the picker is currently open for, so re-picking a
  // different size for that same row isn't counted against itself.
  const liveStockProducts = useMemo(() => {
    const draftRows: DraftLine[] = items
      .filter((it) => it.id !== stockPickerTarget && it.stock_variant_id != null)
      .map((it) => {
        const meta = stockVariantMeta.get(it.stock_variant_id as number);
        return meta ? { productId: meta.productId, unitFactor: meta.unitFactor, qty: it.qty } : null;
      })
      .filter((x): x is DraftLine => x != null);
    return stockProducts.map((p) => ({
      ...p,
      variants: p.variants.map((v) => ({
        ...v,
        available: getAvailable(
          { sharedStock: p.sharedStock, rawAvailable: v.available, productId: p.productId, sharedAvailableModules: p.sharedAvailableModules, unitFactor: v.unitFactor },
          draftRows
        ),
      })),
    }));
  }, [stockProducts, items, stockPickerTarget, stockVariantMeta]);

  const [savedId, setSavedId] = useState<number | null>(null);
  const [savedList, setSavedList] = useState<SavedListRow[]>([]);
  const [listOpen, setListOpen] = useState(false);
  // "saved" = the normal browse/open/archive list; "pull" = picking a
  // quotation to copy into a brand-new document (used by the Delivery
  // Note entry point's "ดึงจากใบเสนอราคา" — never opens the source for
  // editing, so the original quotation is never touched).
  const [listMode, setListMode] = useState<"saved" | "pull">("saved");
  const [showArchived, setShowArchived] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [listDateFrom, setListDateFrom] = useState("");
  const [listDateTo, setListDateTo] = useState("");

  // This entry point's own saved count — on the Delivery Note page, only
  // counts delivery notes (not every saved_quotes row), matching what the
  // "รายการที่บันทึกไว้" button and list actually show.
  // The delivery-note page only ever saves/shows delivery notes; the
  // regular quote-builder page saves/shows quotations and invoices
  // together (it toggles between those two doc types) but never a
  // delivery note, which belongs to its own separate list.
  const ownSavedList = useMemo(
    () =>
      savedList.filter((row) =>
        defaultDocType === "delivery_note" ? row.doc_type === "delivery_note" : row.doc_type !== "delivery_note"
      ),
    [savedList, defaultDocType]
  );

  const filteredSavedList = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return savedList.filter((row) => {
      if (listMode === "pull" && row.doc_type !== "quotation") return false;
      if (listMode === "saved" && defaultDocType === "delivery_note" && row.doc_type !== "delivery_note") return false;
      if (listMode === "saved" && defaultDocType !== "delivery_note" && row.doc_type === "delivery_note") return false;
      if (q && !row.customer_name.toLowerCase().includes(q)) return false;
      if (listDateFrom && row.doc_date < listDateFrom) return false;
      if (listDateTo && row.doc_date > listDateTo) return false;
      return true;
    });
  }, [savedList, listSearch, listDateFrom, listDateTo, listMode, defaultDocType]);

  const L = (t: TriText) => joinLang(langMode, t);

  async function fetchSavedList(archived = showArchived) {
    setLoadingList(true);
    const res = await fetch(`/api/admin/saved-quotes?archived=${archived}`);
    const data = await res.json();
    setLoadingList(false);
    if (res.ok) setSavedList(data.quotes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setLoadingList(true);
      const res = await fetch(`/api/admin/saved-quotes?archived=${showArchived}`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setSavedList(data.quotes);
        setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showArchived]);

  function resetForm() {
    setSavedId(null);
    setDocType(defaultDocType);
    setLangMode("th-en-zh");
    setDocNo(`${DOC_LABELS[defaultDocType].prefix}${todayStr().replace(/-/g, "")}-01`);
    setDocNoTouched(false);
    setDocNoWarningAcked(false);
    setChannel("other");
    setDate(todayStr());
    setCustomerName("");
    setCustomerAddress("");
    setCustomerTaxId("");
    setShippingAddress("");
    setShippingDate("");
    setCustomerContact("");
    setCustomerPhone("");
    setSalesperson("");
    setOrderNotes("");
    setTermsText(defaultTermsText("th-en-zh"));
    setDiscountPct(0);
    setVatPct(7);
    setDepositPct(50);
    setItems([newLine()]);
  }

  async function saveQuote() {
    if (!savedId && !docNoTouched && !docNoWarningAcked) {
      setDocNoWarningAcked(true);
      return;
    }
    setSaving(true);
    const payload = {
      doc_type: docType,
      doc_no: docNo,
      channel,
      lang_mode: langMode,
      doc_date: date,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_tax_id: customerTaxId,
      shipping_address: shippingAddress,
      shipping_date: shippingDate || null,
      contact_person: customerContact,
      contact_phone: customerPhone,
      salesperson: salesperson || null,
      notes: orderNotes,
      terms_text: termsText,
      discount_pct: discountPct,
      vat_pct: vatPct,
      deposit_pct: depositPct,
      items: items.map(
        (it): SavedQuoteItem => ({
          item_id: it.id,
          stock_variant_id: it.stock_variant_id,
          name: it.name,
          sku: it.sku,
          size: it.size,
          qty: it.qty,
          unitPrice: it.unitPrice,
          remark: it.remark,
          remarkImage: it.remarkImage,
          image: it.image,
          seats: it.seats,
          baseUnitPrice: it.baseUnitPrice,
          unit: it.unit,
        })
      ),
    };
    const res = await fetch(savedId ? `/api/admin/saved-quotes/${savedId}` : "/api/admin/saved-quotes", {
      method: savedId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSavedId(data.quote.id);
      toast.success(t("บันทึกแล้ว", "Saved", "已保存"));
      fetchSavedList();
    } else {
      toast.error(data.error || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
    }
  }

  async function loadQuote(id: number) {
    const res = await fetch(`/api/admin/saved-quotes/${id}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(t("โหลดไม่สำเร็จ", "Load failed", "加载失败"));
      return;
    }
    const q = data.quote as SavedQuote;
    setSavedId(q.id);
    setDocType(q.doc_type);
    setLangMode(q.lang_mode);
    setDocNo(q.doc_no);
    setDocNoTouched(true);
    setChannel(q.channel ?? "other");
    setDate(q.doc_date);
    setCustomerName(q.customer_name);
    setCustomerAddress(q.customer_address);
    setCustomerTaxId(q.customer_tax_id);
    setShippingAddress(q.shipping_address);
    setShippingDate(q.shipping_date || "");
    setCustomerContact(q.contact_person);
    setCustomerPhone(q.contact_phone);
    setSalesperson(q.salesperson || "");
    setOrderNotes(q.notes || "");
    setTermsText(q.terms_text || defaultTermsText(q.lang_mode));
    setDiscountPct(q.discount_pct ?? 0);
    setVatPct(q.vat_pct);
    setDepositPct(q.deposit_pct);
    setItems(
      q.items.length
        ? q.items.map((it) => ({
            ...it,
            // Preserved across edits — quotes saved before this field
            // existed get a fresh one here, same as the self-heal on read.
            id: it.item_id || Math.random().toString(36).slice(2),
            seats: it.seats ?? 1,
            baseUnitPrice: it.baseUnitPrice ?? it.unitPrice,
            remarkImage: it.remarkImage ?? null,
            stock_variant_id: it.stock_variant_id ?? null,
            unit: it.unit ?? "",
          }))
        : [newLine()]
    );
    setListOpen(false);
  }

  // Copies a quotation's details into a brand-new, independent document —
  // savedId stays null, so the next Save creates a new row rather than
  // touching the source quotation. Used for making a delivery note that
  // only covers part of what was quoted (some items shipped later), so
  // removing items here must never remove them from the original.
  async function pullFromQuotation(id: number) {
    const res = await fetch(`/api/admin/saved-quotes/${id}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(t("โหลดไม่สำเร็จ", "Load failed", "加载失败"));
      return;
    }
    const q = data.quote as SavedQuote;
    setSavedId(null);
    setDocType(defaultDocType);
    setLangMode(q.lang_mode);
    setDocNo(`${DOC_LABELS[defaultDocType].prefix}${todayStr().replace(/-/g, "")}-01`);
    setDocNoTouched(false);
    setDocNoWarningAcked(false);
    setChannel(q.channel ?? "other");
    setDate(todayStr());
    setCustomerName(q.customer_name);
    setCustomerAddress(q.customer_address);
    setCustomerTaxId(q.customer_tax_id);
    setShippingAddress(q.shipping_address);
    setShippingDate(q.shipping_date || "");
    setCustomerContact(q.contact_person);
    setCustomerPhone(q.contact_phone);
    setSalesperson(q.salesperson || "");
    setOrderNotes(q.notes || "");
    setTermsText(q.terms_text || defaultTermsText(q.lang_mode));
    setDiscountPct(q.discount_pct ?? 0);
    setVatPct(q.vat_pct);
    setDepositPct(q.deposit_pct);
    setItems(
      q.items.length
        ? q.items.map((it) => ({
            ...it,
            id: Math.random().toString(36).slice(2),
            seats: it.seats ?? 1,
            baseUnitPrice: it.baseUnitPrice ?? it.unitPrice,
            remarkImage: it.remarkImage ?? null,
            stock_variant_id: it.stock_variant_id ?? null,
            unit: it.unit ?? "",
          }))
        : [newLine()]
    );
    setListOpen(false);
    toast.success(
      t(
        "ดึงข้อมูลจากใบเสนอราคาแล้ว — นี่คือเอกสารใหม่ ลบ/แก้รายการได้โดยไม่กระทบใบเสนอราคาต้นฉบับ",
        "Pulled from the quotation — this is a new document; removing or editing items here won't affect the original",
        "已从报价单导入 — 这是新文件，删除或编辑项目不会影响原报价单"
      )
    );
  }

  // Reuse a previously saved company's details instead of retyping them —
  // only the customer/shipping-contact fields carry over, not doc-level
  // stuff like status or the items themselves.
  async function pickCompany(id: number) {
    const res = await fetch(`/api/admin/saved-quotes/${id}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(t("โหลดข้อมูลบริษัทไม่สำเร็จ", "Failed to load company details", "加载公司信息失败"));
      return;
    }
    const q = data.quote as SavedQuote;
    setCustomerName(q.customer_name);
    setCustomerAddress(q.customer_address);
    setCustomerTaxId(q.customer_tax_id);
    setShippingAddress(q.shipping_address);
    setCustomerContact(q.contact_person);
    setCustomerPhone(q.contact_phone);
  }

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    (async () => {
      await loadQuote(Number(openId));
      if (searchParams.get("print") === "1") printDeliveryNote();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function updateSavedStatus(id: number, status: SavedQuoteStatus) {
    const prev = savedList;
    setSavedList((list) => list.map((q) => (q.id === id ? { ...q, status } : q)));
    const res = await fetch(`/api/admin/saved-quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setSavedList(prev);
      toast.error(t("อัปเดตสถานะไม่สำเร็จ", "Status update failed", "状态更新失败"));
    }
  }

  async function updateSavedChannel(id: number, newChannel: SavedQuoteChannel) {
    const prev = savedList;
    setSavedList((list) => list.map((q) => (q.id === id ? { ...q, channel: newChannel } : q)));
    const res = await fetch(`/api/admin/saved-quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: newChannel }),
    });
    if (!res.ok) {
      setSavedList(prev);
      toast.error(t("อัปเดตช่องทางไม่สำเร็จ", "Channel update failed", "更新渠道失败"));
    }
  }

  async function archiveQuote(id: number) {
    const res = await fetch(`/api/admin/saved-quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      setSavedList((prev) => prev.filter((q) => q.id !== id));
      if (savedId === id) resetForm();
      toast.success(t("เก็บเข้าคลังแล้ว", "Archived", "已归档"));
    } else {
      toast.error(t("เก็บเข้าคลังไม่สำเร็จ", "Archive failed", "归档失败"));
    }
  }

  async function restoreQuote(id: number) {
    const res = await fetch(`/api/admin/saved-quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      setSavedList((prev) => prev.filter((q) => q.id !== id));
      toast.success(t("กู้คืนแล้ว", "Restored", "已恢复"));
    } else {
      toast.error(t("กู้คืนไม่สำเร็จ", "Restore failed", "恢复失败"));
    }
  }

  async function deleteQuote(id: number, docNo: string) {
    if (
      !confirm(
        t(
          `ลบเอกสาร ${docNo} เลยใช่ไหม? ลบแล้วจะหายไปเลย กู้คืนไม่ได้ ยืนยันใช่ไหม?`,
          `Delete document ${docNo}? This is permanent and cannot be undone. Are you sure?`,
          `确定要删除文件 ${docNo} 吗？删除后将永久消失，无法恢复，确定吗？`
        )
      )
    )
      return;
    const res = await fetch(`/api/admin/saved-quotes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSavedList((prev) => prev.filter((q) => q.id !== id));
      if (savedId === id) resetForm();
      toast.success(t("ลบแล้ว", "Deleted", "已删除"));
    } else {
      toast.error(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
    }
  }

  function setDocTypeAndPrefix(newType: DocType) {
    setDocType(newType);
    setDocNo((prev) => {
      const oldPrefix = DOC_LABELS[docType].prefix;
      const newPrefix = DOC_LABELS[newType].prefix;
      return prev.startsWith(oldPrefix) ? newPrefix + prev.slice(oldPrefix.length) : prev;
    });
  }

  // Print the delivery note in one click without having to switch tabs
  // first. Switching doc type re-renders the preview, so the actual print
  // has to wait a tick until that's done — otherwise it'd print whatever
  // was showing before the switch. A ref (not state) coordinates this since
  // it's an internal signal, not something the UI renders off of.
  const pendingDeliveryPrintRef = useRef(false);
  useEffect(() => {
    if (docType === "delivery_note" && pendingDeliveryPrintRef.current) {
      pendingDeliveryPrintRef.current = false;
      const id = requestAnimationFrame(() => window.print());
      return () => cancelAnimationFrame(id);
    }
  }, [docType]);

  function printDeliveryNote() {
    if (docType === "delivery_note") {
      window.print();
    } else {
      pendingDeliveryPrintRef.current = true;
      setDocTypeAndPrefix("delivery_note");
    }
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  // Main Stock has no per-product display name (never did — the old price
  // catalog used its category label as the "name" too), so the category's
  // own th/en/zh labels become the item name, combined the same way every
  // other multi-language field on this document is.
  function pickStockProduct(id: string, v: PickedStockVariant) {
    const catEntry = STOCK_CATEGORIES.find((c) => c.key === v.category);
    updateItem(id, {
      name: catEntry ? L(catEntry) : v.category,
      sku: v.code,
      size: v.size_text,
      unitPrice: v.price ?? 0,
      seats: 1,
      baseUnitPrice: v.price ?? 0,
      image: v.image_url,
      stock_variant_id: v.variantId,
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vatAmount = subtotalAfterDiscount * (vatPct / 100);
  const grandTotal = subtotalAfterDiscount + vatAmount;
  const depositAmount = grandTotal * (depositPct / 100);
  const balanceAmount = grandTotal - depositAmount;

  const isDeliveryNote = docType === "delivery_note";
  const doc = DOC_LABELS[docType];
  // Second title-bar line: whichever non-Thai language(s) are selected,
  // e.g. "QUOTATION / 报价单" — Thai stands alone on the line above it,
  // matching the real invoice layout (not a single "TH / EN / ZH" line).
  const docSubLine = langMode === "th-en-zh" ? `${doc.en} / ${doc.zh}` : langMode === "th-en" ? doc.en : doc.zh;

  // If the browser's own print header/footer gets left on (Chrome shows it
  // unless "Headers and footers" is unchecked), at least have it show the
  // document number instead of the site's generic page title.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${docNo} - ${doc.en} - Futai Furniture`;
    return () => {
      document.title = prevTitle;
    };
  }, [docNo, doc.en]);

  // Company name lines, in the source template's order (EN, ZH, TH),
  // filtered down to whichever languages are selected.
  const companyLines = [
    { key: "en", text: COMPANY.nameEn, show: langMode !== "th-zh" },
    { key: "zh", text: COMPANY.nameZh, show: langMode !== "th-en" },
    { key: "th", text: COMPANY.nameTh, show: true },
  ].filter((l) => l.show);

  // A styled, editable .xlsx mirroring the PDF layout (letterhead, peach
  // title bar, bordered item table, totals, delivery info, terms/bank
  // boxes) — for opening in Excel to tweak wording/formatting before
  // sending. Line-item photos aren't embedded per row (kept simple); the
  // SKU still identifies the product. Note: exceljs, not the "xlsx"
  // package — SheetJS's free tier can't write cell fills/borders/fonts,
  // only exceljs supports full styling for free.
  async function downloadExcel() {
    setGeneratingExcel(true);
    try {
    const ExcelJSLib = (await import("exceljs")).default;
    const wb = new ExcelJSLib.Workbook();
    const ws = wb.addWorksheet("Sheet1");

    const numCols = isDeliveryNote ? 7 : 8;
    const widths = isDeliveryNote ? [6, 26, 16, 16, 8, 10, 24] : [6, 22, 14, 14, 7, 12, 12, 20];
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    const thinBorder: ExcelJS.Border = { style: "thin", color: { argb: "FF1A1A1A" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
    const PEACH = "FFF8CAAC";
    const RED = "FFC8102E";

    let r = 0;
    function nextRow() {
      r += 1;
      return r;
    }
    function styleCell(
      cell: ExcelJS.Cell,
      opts: { bold?: boolean; size?: number; align?: "left" | "center" | "right"; fill?: string; color?: string; border?: boolean } = {}
    ) {
      cell.font = { bold: opts.bold ?? false, size: opts.size ?? 10, color: { argb: opts.color ?? "FF1A1A1A" }, name: "Tahoma" };
      cell.alignment = { horizontal: opts.align ?? "left", vertical: "middle", wrapText: true };
      if (opts.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
      if (opts.border) cell.border = allBorders;
    }
    function mergedRow(text: string, opts: Parameters<typeof styleCell>[1] = {}, height?: number) {
      const row = nextRow();
      ws.mergeCells(row, 1, row, numCols);
      const cell = ws.getCell(row, 1);
      cell.value = text;
      styleCell(cell, opts);
      if (height) ws.getRow(row).height = height;
      return row;
    }
    function splitRow(left: string, right: string, opts: Parameters<typeof styleCell>[1] = {}) {
      const row = nextRow();
      const half = Math.ceil(numCols / 2);
      ws.mergeCells(row, 1, row, half);
      ws.mergeCells(row, half + 1, row, numCols);
      const lc = ws.getCell(row, 1);
      lc.value = left;
      styleCell(lc, { ...opts, align: opts.align ?? "left" });
      const rc = ws.getCell(row, half + 1);
      rc.value = right;
      styleCell(rc, { ...opts, align: "right" });
      return row;
    }
    function totalRow(label: string, amount: number, opts: Parameters<typeof styleCell>[1] = {}) {
      const row = nextRow();
      ws.mergeCells(row, 1, row, numCols - 2);
      ws.mergeCells(row, numCols - 1, row, numCols);
      const lc = ws.getCell(row, 1);
      lc.value = label;
      styleCell(lc, { ...opts, border: true });
      const rc = ws.getCell(row, numCols - 1);
      rc.value = amount;
      rc.numFmt = "#,##0.00";
      styleCell(rc, { ...opts, align: "right", border: true });
    }

    // Logo (floating image, doesn't consume its own row)
    try {
      const logoRes = await fetch("/icon.png");
      const logoBuffer = await logoRes.arrayBuffer();
      const imageId = wb.addImage({ buffer: logoBuffer, extension: "png" });
      ws.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 42, height: 42 } });
    } catch {
      // Logo is decorative — skip silently if it can't be fetched.
    }

    // Letterhead
    companyLines.forEach((line, i) => {
      mergedRow(line.text, { bold: i === 0, size: i === 0 ? 13 : 11, align: "center" });
    });
    mergedRow(
      `${L(TXT.address)}: 99/9, 99/11 หมู่ที่ 5 ถนนลำลูกกา ตำบลลำลูกกา อำเภอลำลูกกา จ.ปทุมธานี 12150`,
      { size: 9, align: "center" }
    );
    splitRow(`${L(TXT.tel)}: ${companyTel}`, `${L(TXT.web)}: ${COMPANY.web}`, { size: 9 });
    splitRow(`${L(TXT.taxId)}: ${COMPANY.taxId}`, `${L(TXT.email)}: ${COMPANY.email}`, { size: 9 });
    nextRow();

    // Title bar
    mergedRow(`${doc.th}\n${docSubLine}`, { bold: true, size: 14, align: "center", fill: PEACH }, 34);
    nextRow();

    // Date / doc no / customer
    splitRow(`${L(TXT.date)}: ${date}`, `${L(DOC_NO_LABELS[docType])}: ${docNo}`);
    mergedRow(`${L(TXT.customer)}: ${customerName || "-"}`);
    if (!isDeliveryNote) {
      mergedRow(`${L(TXT.address)}: ${customerAddress || "-"}`);
      mergedRow(`${L(TXT.taxId)}: ${customerTaxId || "-"}`);
    }
    nextRow();

    // Item table
    const headerLabels = [L(TXT.colNo), L(TXT.colItem), L(TXT.colModel), L(TXT.colSize), L(TXT.colQty)];
    if (isDeliveryNote) headerLabels.push(L(TXT.colUnit));
    if (!isDeliveryNote) headerLabels.push(L(TXT.colUnitPrice), L(TXT.colAmount));
    headerLabels.push(L(TXT.colRemark));
    const headerRow = nextRow();
    headerLabels.forEach((label, i) => {
      const cell = ws.getCell(headerRow, i + 1);
      cell.value = label;
      styleCell(cell, { bold: true, align: "center", fill: PEACH, border: true });
    });

    items.forEach((it, idx) => {
      const row = nextRow();
      const values: (string | number)[] = [idx + 1, it.name || "-", it.sku || "-", it.size || "-", it.qty];
      if (isDeliveryNote) values.push(it.unit || "-");
      if (!isDeliveryNote) values.push(it.unitPrice, it.qty * it.unitPrice);
      values.push(it.remark);
      values.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1);
        cell.value = v;
        const isMoneyCol = !isDeliveryNote && (i === 5 || i === 6);
        if (isMoneyCol) cell.numFmt = "#,##0.00";
        styleCell(cell, {
          align: i === 1 || i === headerLabels.length - 1 ? "left" : isMoneyCol ? "right" : "center",
          border: true,
        });
      });
    });
    nextRow();

    // Totals
    if (!isDeliveryNote) {
      totalRow(L(TXT.subtotal), subtotal);
      if (discountPct > 0) {
        totalRow(`${L(TXT.discount)} (${discountPct}%)`, -discountAmount, { color: RED });
        totalRow(L(TXT.afterDiscount), subtotalAfterDiscount);
      }
      totalRow(`${L(TXT.vatAmountLabel)} (${vatPct}%)`, vatAmount);
      totalRow(L(TXT.grandTotal), grandTotal, { bold: true });
      if (depositPct > 0) {
        totalRow(`${L(TXT.depositAmount)} (${depositPct}%)`, depositAmount);
        totalRow(L(TXT.balance), balanceAmount);
      }
      nextRow();
    }

    // Delivery info
    splitRow(`${L(TXT.shipAddress)}: ${shippingAddress || "-"}`, `${L(TXT.shipDate)}: ${shippingDate || "-"}`, { border: true });
    splitRow(`${L(TXT.shipContact)}: ${customerContact || "-"}`, `${L(TXT.shipPhone)}: ${customerPhone || "-"}`, { border: true });
    nextRow();

    // Terms + bank (quotation/invoice only, matches the PDF)
    if (!isDeliveryNote) {
      mergedRow("TERMS OF SALE AND OTHER COMMENTS", { bold: true, align: "center", fill: PEACH, border: true });
      termsText.split("\n").forEach((line) => mergedRow(line, { size: 9, border: true }));
      nextRow();

      mergedRow("Bank Account (THB)", { bold: true, align: "center", fill: PEACH, border: true });
      [
        "Account name : FUTAI FURNITURE CO.,LTD.   Account number : 100000301332239 (THB)",
        "Name of beneficiary bank : BANK OF CHINA (THAI) PCL   Beneficiary Bank Code : 052",
        "Address : 179/4 BANGKOK CITY TOWER, SOUTH SATHORN RD, TUNGMAHAMEK, SATHORN, BANGKOK 10120",
        "SWIFT Code (Field 57) : BKCHTHBKXXX   Correspondent Bank (Field 56A) For THB : BKCHCNBJXXX",
      ].forEach((line) => mergedRow(line, { size: 9, border: true }));
      nextRow();
    }

    // Signature(s)
    if (isDeliveryNote) {
      splitRow(`${L(TXT.senderSign)} :`, `${L(TXT.receiverSign)} :`);
    } else {
      splitRow(`${L(TXT.sellerSign)} :`, `${L(TXT.buyerSign)} :`);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docNo || "document"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error(t("สร้างไฟล์ Excel ไม่สำเร็จ ลองใหม่อีกครั้ง", "Failed to generate Excel file, please try again", "生成Excel文件失败，请重试"));
    } finally {
      setGeneratingExcel(false);
    }
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          /* position:sticky on the wrapper (for on-screen scrolling) makes it
             a positioning context, same as position:relative would — without
             this override, #print-area's position:absolute below resolves
             against that sticky box instead of the page, landing wherever the
             (still layout-occupying, just invisible) form content pushed it
             and leaving page 1 blank. */
          .preview-sticky-wrapper { position: static !important; overflow: visible !important; max-height: none !important; }
          /* Explicit width, not 100% or auto: position:absolute with only
             "left:0" set makes a block shrink-to-fit its content instead of
             keeping the 794px it had on screen, which silently reflows every
             auto-layout table below to different (wrong) column widths. */
          #print-area { position: absolute; top: 0; left: 0; width: 794px; margin: 0; }
          .no-print { display: none !important; }
          /* Chrome strips background colors on print by default (the
             peach header bar, yellow VAT row) unless the user manually
             checks "Background graphics" in More settings — force them
             to print regardless, matching the on-screen preview exactly. */
          #print-area, #print-area * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Without this, a row that doesn't fit the remaining space on a
             page gets sliced in half instead of moving to the next page
             whole — force every table row and boxed section to jump to the
             next page as a unit instead. */
          #print-area tr, #print-area .no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* The phone number field is a plain <input> so it's editable
             on-screen — strip any browser input chrome so it prints as
             plain text, matching the rest of the letterhead. */
          .company-tel-input {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 no-print">
        {defaultDocType === "delivery_note" ? (
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#C8102E] text-white flex items-center justify-center shrink-0">
              <Truck size={20} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("สร้างใบส่งของ", "Create Delivery Note", "生成送货单")}</h1>
              <p className="text-sm text-[#6B6B6B] mt-0.5">
                {t("กรอกข้อมูลเพื่อสร้างใบส่งของ (Delivery Note)", "Fill in the details to create a delivery note", "填写信息以生成送货单")}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("สร้างใบเสนอราคา / ใบแจ้งหนี้", "Quote / Invoice Builder", "生成报价单/发票")}</h1>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              {t(
                "อ้างอิงราคาจากรายการสินค้า กรอกลูกค้า แล้วดาวน์โหลดได้ทันที",
                "Pull prices from the product catalog, fill in customer details, and download instantly",
                "从产品目录中获取价格，填写客户信息，即可立即下载"
              )}
            </p>
          </div>
        )}
        {defaultDocType === "delivery_note" ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setListMode("saved");
                setListOpen((v) => !v);
              }}
            >
              <FolderOpen size={14} className="mr-1.5" /> {t("รายการที่บันทึกไว้", "Saved", "已保存")} ({ownSavedList.length})
            </Button>
            <Button variant="outline" onClick={() => document.getElementById("print-area")?.scrollIntoView({ behavior: "smooth" })}>
              <Eye size={14} className="mr-1.5" /> {t("ดูตัวอย่าง", "Preview", "预览")}
            </Button>
            <Button variant="outline" onClick={printDeliveryNote}>
              <Printer size={14} className="mr-1.5" /> {t("พิมพ์", "Print", "打印")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center h-9 px-4 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent"
                disabled={generatingExcel}
              >
                {generatingExcel ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
                {t("ดาวน์โหลด", "Download", "下载")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.print()}>{t("PDF", "PDF", "PDF")}</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadExcel}>{t("Excel", "Excel", "Excel")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={saveQuote} disabled={saving}>
              <Save size={14} className="mr-1.5" /> {saving ? t("กำลังบันทึก...", "Saving...", "保存中...") : t("บันทึกใบส่งของ", "Save Delivery Note", "保存送货单")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setListMode("saved");
                setListOpen((v) => !v);
              }}
            >
              <FolderOpen size={14} className="mr-1.5" /> {t("รายการที่บันทึกไว้", "Saved", "已保存")} ({ownSavedList.length})
            </Button>
            <Button variant="outline" onClick={resetForm}>
              <FilePlus2 size={14} className="mr-1.5" /> {t("สร้างใหม่", "New", "新建")}
            </Button>
            <Button onClick={saveQuote} disabled={saving}>
              <Save size={14} className="mr-1.5" /> {saving ? t("กำลังบันทึก...", "Saving...", "保存中...") : t("บันทึก", "Save", "保存")}
            </Button>
            <Button variant="outline" onClick={downloadExcel} disabled={generatingExcel}>
              {generatingExcel ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <FileSpreadsheet size={14} className="mr-1.5" />
              )}
              {generatingExcel ? t("กำลังสร้างไฟล์...", "Generating...", "生成中...") : t("ดาวน์โหลด Excel", "Download Excel", "下载Excel")}
            </Button>
            <Button variant="outline" onClick={printDeliveryNote}>
              <Truck size={14} className="mr-1.5" /> {t("ปริ้นใบส่งของ", "Print Delivery Note", "打印送货单")}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={14} className="mr-1.5" /> {t("ดาวน์โหลด PDF", "Download PDF", "下载PDF")}
            </Button>
          </div>
        )}
      </div>

      {listOpen && (
        <div className="bg-white rounded-xl shadow-sm p-5 no-print">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {listMode === "pull"
                ? t("เลือกใบเสนอราคาที่จะดึงข้อมูลมา", "Pick a quotation to pull from", "选择要导入的报价单")
                : showArchived
                  ? t("เอกสารที่เก็บเข้าคลัง", "Archived Documents", "已归档文件")
                  : t("รายการที่บันทึกไว้", "Saved Documents", "已保存文件")}
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? (
                <>
                  <FolderOpen size={13} className="mr-1.5" /> {t("ดูรายการปกติ", "View active", "查看正常列表")}
                </>
              ) : (
                <>
                  <Archive size={13} className="mr-1.5" /> {t("ดูที่เก็บถาวร", "View archived", "查看归档")}
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-2 mb-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">{t("ค้นหาชื่อบริษัท/ลูกค้า", "Search company / customer", "搜索公司/客户名称")}</Label>
              <div className="relative mt-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <Input
                  className="pl-8 h-8 text-sm"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={t("พิมพ์ชื่อบริษัทหรือลูกค้า...", "Type a company or customer name...", "输入公司或客户名称...")}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("ตั้งแต่วันที่", "From date", "起始日期")}</Label>
              <Input type="date" className="mt-1 h-8 text-sm" value={listDateFrom} onChange={(e) => setListDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t("ถึงวันที่", "To date", "截止日期")}</Label>
              <Input type="date" className="mt-1 h-8 text-sm" value={listDateTo} onChange={(e) => setListDateTo(e.target.value)} />
            </div>
            {(listSearch || listDateFrom || listDateTo) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setListSearch("");
                  setListDateFrom("");
                  setListDateTo("");
                }}
              >
                <X size={13} className="mr-1" /> {t("ล้างตัวกรอง", "Clear filters", "清除筛选")}
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAF7F2]">
                <TableHead className="text-xs">{t("เลขที่", "Doc No.", "单号")}</TableHead>
                <TableHead className="text-xs">{t("ประเภท", "Type", "类型")}</TableHead>
                <TableHead className="text-xs">{t("ลูกค้า", "Customer", "客户")}</TableHead>
                <TableHead className="text-xs">{t("วันที่", "Date", "日期")}</TableHead>
                <TableHead className="text-xs text-right">{t("จำนวนเงิน", "Amount", "金额")}</TableHead>
                <TableHead className="text-xs">{t("ช่องทาง", "Channel", "渠道")}</TableHead>
                <TableHead className="text-xs">{t("สถานะ", "Status", "状态")}</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#6B6B6B]">
                    {t("กำลังโหลด...", "Loading...", "加载中...")}
                  </TableCell>
                </TableRow>
              ) : filteredSavedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#6B6B6B]">
                    {savedList.length === 0
                      ? showArchived
                        ? t("ไม่มีเอกสารที่เก็บเข้าคลัง", "No archived documents", "没有已归档的文件")
                        : t("ยังไม่มีเอกสารที่บันทึกไว้", "No saved documents yet", "暂无已保存的文件")
                      : t("ไม่พบเอกสารที่ตรงกับตัวกรอง", "No documents match your filters", "没有符合筛选条件的文件")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSavedList.map((q) => (
                  <TableRow key={q.id} className="hover:bg-[#FAF7F2]/50">
                    <TableCell className="text-sm font-mono">{q.doc_no}</TableCell>
                    <TableCell className="text-xs">
                      {t(DOC_LABELS[q.doc_type].th, DOC_LABELS[q.doc_type].en, DOC_LABELS[q.doc_type].zh)}
                    </TableCell>
                    <TableCell className="text-sm">{q.customer_name || "-"}</TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">{q.doc_date}</TableCell>
                    <TableCell className="text-sm font-medium text-right whitespace-nowrap">
                      ฿{fmtMoney(computeGrandTotal(q.items, q.discount_pct, q.vat_pct))}
                    </TableCell>
                    <TableCell>
                      <Select value={q.channel} onValueChange={(v) => updateSavedChannel(q.id, v as SavedQuoteChannel)}>
                        <SelectTrigger
                          size="sm"
                          className={`h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${CHANNEL_META[q.channel].color}`}
                        >
                          <SelectValue>
                            {(v: SavedQuoteChannel) => t(CHANNEL_META[v].th, CHANNEL_META[v].en, CHANNEL_META[v].zh)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CHANNEL_ORDER.map((c) => (
                            <SelectItem key={c} value={c}>
                              {t(CHANNEL_META[c].th, CHANNEL_META[c].en, CHANNEL_META[c].zh)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={q.status} onValueChange={(v) => updateSavedStatus(q.id, v as SavedQuoteStatus)}>
                        <SelectTrigger
                          size="sm"
                          className={`h-auto min-h-0 rounded border-0 px-2 py-1 text-xs font-medium ${STATUS_META[q.status].color}`}
                        >
                          <SelectValue>
                            {(v: SavedQuoteStatus) => t(STATUS_META[v].th, STATUS_META[v].en, STATUS_META[v].zh)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(STATUS_META[s].th, STATUS_META[s].en, STATUS_META[s].zh)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        {listMode === "pull" ? (
                          <Button size="sm" onClick={() => pullFromQuotation(q.id)}>
                            {t("ใช้ใบนี้", "Use this", "使用此单")}
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => loadQuote(q.id)}>
                              {t("เปิด", "Open", "打开")}
                            </Button>
                            {showArchived ? (
                              <Button size="icon-sm" variant="ghost" onClick={() => restoreQuote(q.id)} aria-label={t("กู้คืน", "Restore", "恢复")}>
                                <ArchiveRestore size={13} className="text-[#6B6B6B]" />
                              </Button>
                            ) : (
                              <Button size="icon-sm" variant="ghost" onClick={() => archiveQuote(q.id)} aria-label={t("เก็บเข้าคลัง", "Archive", "归档")}>
                                <Archive size={13} className="text-[#6B6B6B]" />
                              </Button>
                            )}
                            <Button size="icon-sm" variant="ghost" onClick={() => deleteQuote(q.id, q.doc_no)} aria-label={t("ลบ", "Delete", "删除")}>
                              <Trash2 size={13} className="text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Form ─────────────────────────────────────────────────── */}
        <div className="space-y-4 no-print">
          {defaultDocType === "delivery_note" ? (
            <>
              <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#C8102E] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{t("ข้อมูลเอกสาร", "Document Info", "文件信息")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{t("วันที่ส่งของ", "Delivery Date", "发货日期")} *</Label>
                    <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("เลขที่ใบส่งของ", "Delivery Note No.", "送货单号")} *</Label>
                    <div className="mt-1 flex gap-1.5">
                      <Input
                        className="font-mono"
                        value={docNo}
                        onChange={(e) => {
                          setDocNo(e.target.value);
                          setDocNoTouched(true);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t("สร้างเลขที่ใหม่", "Regenerate number", "重新生成单号")}
                        onClick={() => {
                          setDocNo(`${DOC_LABELS.delivery_note.prefix}${todayStr().replace(/-/g, "")}-01`);
                          setDocNoTouched(false);
                          setDocNoWarningAcked(false);
                        }}
                      >
                        <RefreshCw size={14} />
                      </Button>
                    </div>
                    {!docNoTouched && docNoWarningAcked && (
                      <p className="mt-1 text-[11px] text-orange-600">
                        {t("⚠ อย่าลืมเปลี่ยนเป็นเลขที่ของตัวเอง", "⚠ Don't forget to change this to your own number", "⚠ 别忘了改成自己的单号")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#C8102E] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{t("ข้อมูลลูกค้า", "Customer Info", "客户信息")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{t("ชื่อลูกค้า / บริษัท", "Customer / Company Name", "客户/公司名称")} *</Label>
                    <div className="mt-1">
                      <CustomerNamePicker value={customerName} onChange={setCustomerName} savedList={savedList} onPickFull={pickCompany} />
                    </div>
                  </div>
                  <div>
                    <Label>{t("เบอร์โทรศัพท์", "Phone", "电话")}</Label>
                    <Input className="mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t("ที่อยู่", "Address", "地址")}</Label>
                    <Textarea className="mt-1" rows={2} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder={t("ที่อยู่ลูกค้า...", "Customer address...", "客户地址...")} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8102E] text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{t("เพิ่มสินค้า", "Add Products", "添加产品")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const line = newLine();
                        setItems((prev) => [...prev, line]);
                        setStockPickerTarget(line.id);
                        setStockPickerOpen(true);
                      }}
                    >
                      <Plus size={13} className="mr-1" /> {t("เพิ่มสินค้า", "Add Product", "添加产品")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setListMode("pull");
                        setListOpen(true);
                      }}
                    >
                      <FileSpreadsheet size={13} className="mr-1" /> {t("เลือกจากใบเสนอราคา", "From Quotation", "从报价单选择")}
                    </Button>
                  </div>
                </div>
                <datalist id="delivery-note-units">
                  <option value="ชุด" />
                  <option value="ตัว" />
                  <option value="กล่อง" />
                  <option value="แผ่น" />
                  <option value="คู่" />
                  <option value="ชิ้น" />
                </datalist>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="text-[#9CA3AF] text-left">
                        <th className="p-2 font-medium w-8">No.</th>
                        <th className="p-2 font-medium">{t("สินค้า / รายละเอียด", "Product / Details", "产品/详情")}</th>
                        <th className="p-2 font-medium w-28">{t("รุ่น / รหัส", "Model / SKU", "型号/编号")}</th>
                        <th className="p-2 font-medium w-24">{t("ขนาด (mm)", "Size (mm)", "规格 (mm)")}</th>
                        <th className="p-2 font-medium w-20">{t("จำนวน", "Qty", "数量")}</th>
                        <th className="p-2 font-medium w-24">{t("หน่วย", "Unit", "单位")}</th>
                        <th className="p-2 font-medium">{t("หมายเหตุ", "Remark", "备注")}</th>
                        <th className="p-2 font-medium w-10">{t("จัดการ", "", "操作")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id} className="border-t border-[#E8E5E0] align-top">
                          <td className="p-2 pt-3 text-[#9CA3AF]">{idx + 1}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <ImageUploadTile image={it.image} onChange={(url) => updateItem(it.id, { image: url })} />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStockPickerTarget(it.id);
                                    setStockPickerOpen(true);
                                  }}
                                  className="text-[10px] text-[#9CA3AF] hover:text-[#C8102E] inline-flex items-center gap-0.5 whitespace-nowrap"
                                >
                                  <Search size={10} /> {t("จากสต็อก", "From Stock", "从库存")}
                                </button>
                              </div>
                              <Input
                                className="h-8 text-xs"
                                placeholder={t("ชื่อสินค้า", "Item name", "产品名称")}
                                value={it.name}
                                onChange={(e) => updateItem(it.id, { name: e.target.value })}
                              />
                            </div>
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-8 text-xs font-mono"
                              value={it.sku}
                              onChange={(e) => updateItem(it.id, { sku: e.target.value, stock_variant_id: null })}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-8 text-xs"
                              placeholder={t("ขนาด (mm)", "Size (mm)", "规格 (mm)")}
                              value={it.size}
                              onChange={(e) => updateItem(it.id, { size: e.target.value, stock_variant_id: null })}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              value={it.qty}
                              onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-8 text-xs"
                              list="delivery-note-units"
                              value={it.unit}
                              onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-8 text-xs"
                              value={it.remark}
                              onChange={(e) => updateItem(it.id, { remark: e.target.value })}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <button type="button" onClick={() => removeItem(it.id)} aria-label={t("ลบ", "Remove", "删除")} className="text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#C8102E] text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{t("ข้อมูลเพิ่มเติม", "Additional Info", "附加信息")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{t("ผู้ส่งของ / ผู้รับผิดชอบ", "Delivered By / Responsible", "送货人/负责人")}</Label>
                    <Select value={salesperson || "__none"} onValueChange={(v) => setSalesperson(!v || v === "__none" ? "" : v)}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue>{(v: string) => (v === "__none" ? t("ยังไม่ระบุ", "Not set", "未设置") : v)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">{t("ยังไม่ระบุ", "Not set", "未设置")}</SelectItem>
                        {SALESPEOPLE.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("หมายเหตุ", "Note", "备注")}</Label>
                    <Input
                      className="mt-1"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder={t("เพิ่มเติม (ถ้ามี)", "Additional (if any)", "补充说明（如有）")}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(["quotation", "invoice", "delivery_note"] as DocType[]).map((docTypeOption) => (
                <button
                  key={docTypeOption}
                  type="button"
                  onClick={() => setDocTypeAndPrefix(docTypeOption)}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    docType === docTypeOption ? "bg-[#C8102E] text-white" : "bg-[#E8E5E0] text-[#6B6B6B] hover:bg-[#d0cdc8]"
                  }`}
                >
                  {t(DOC_LABELS[docTypeOption].th, DOC_LABELS[docTypeOption].en, DOC_LABELS[docTypeOption].zh)}
                </button>
              ))}
            </div>

            {!isDeliveryNote && (
              <>
                <div>
                  <Label>{t("ช่องทางที่มาของออเดอร์", "Order Channel", "订单渠道")}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                    {CHANNEL_ORDER.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setChannel(c)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          channel === c ? "bg-[#1A1A1A] text-white" : "bg-[#E8E5E0] text-[#6B6B6B] hover:bg-[#d0cdc8]"
                        }`}
                      >
                        {t(CHANNEL_META[c].th, CHANNEL_META[c].en, CHANNEL_META[c].zh)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>{t("ภาษาในเอกสาร", "Document Language", "文件语言")}</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {LANG_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setLangMode(o.value)}
                        className={`py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${
                          langMode === o.value ? "bg-[#1A1A1A] text-white" : "bg-[#E8E5E0] text-[#6B6B6B] hover:bg-[#d0cdc8]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("วันที่", "Date", "日期")}</Label>
                <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("เลขที่เอกสาร", "Document No.", "单号")}</Label>
                <Input
                  className="mt-1 font-mono"
                  value={docNo}
                  onChange={(e) => {
                    setDocNo(e.target.value);
                    setDocNoTouched(true);
                  }}
                />
                {!savedId && !docNoTouched && docNoWarningAcked && (
                  <p className="mt-1 text-[11px] text-orange-600">
                    {t("⚠ อย่าลืมเปลี่ยนเป็นเลขที่ของตัวเอง", "⚠ Don't forget to change this to your own number", "⚠ 别忘了改成自己的单号")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>{t("ชื่อลูกค้า / บริษัท", "Customer / Company Name", "客户/公司名称")}</Label>
                <div className="mt-1">
                  <CompanyPicker savedList={savedList} onPick={pickCompany} />
                </div>
                <Input
                  className="mt-1.5"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("เช่น บริษัท ... จำกัด", "e.g. ... Co., Ltd.", "例如：... 有限公司")}
                />
              </div>
              {!isDeliveryNote && (
                <>
                  <div className="sm:col-span-2">
                    <Label>{t("ที่อยู่", "Address", "地址")}</Label>
                    <Textarea className="mt-1" rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t("เลขผู้เสียภาษี", "Tax ID", "纳税人识别号")}</Label>
                    <Input className="mt-1" value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Delivery info — separate block, matches the real invoice layout
              (shipping address/date can differ from the billing details above) */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-[#1A1A1A]">{t("ข้อมูลจัดส่ง", "Delivery Info", "发货信息")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>{t("ที่อยู่จัดส่ง", "Delivery Address", "发货地址")}</Label>
                <Textarea className="mt-1" rows={2} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
              </div>
              <div>
                <Label>{t("วันที่จัดส่ง", "Delivery Date", "发货日期")}</Label>
                <Input type="date" className="mt-1" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("บุคคลที่ติดต่อ", "Contact Person", "联系人")}</Label>
                <Input className="mt-1" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("หมายเลขโทรศัพท์", "Phone", "电话")}</Label>
                <Input className="mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("ผู้ดูแลออเดอร์", "Sales / Order Owner", "负责人")}</Label>
                <Select value={salesperson || "__none"} onValueChange={(v) => setSalesperson(!v || v === "__none" ? "" : v)}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue>{(v: string) => (v === "__none" ? t("ยังไม่ระบุ", "Not set", "未设置") : v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t("ยังไม่ระบุ", "Not set", "未设置")}</SelectItem>
                    {SALESPEOPLE.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>{t("หมายเหตุ", "Note", "备注")}</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder={t("บันทึกภายใน เช่น เงื่อนไขพิเศษ", "Internal note, e.g. special terms", "内部备注，如特殊条款")}
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A]">{t("รายการสินค้า", "Line Items", "产品清单")}</p>
            {isDeliveryNote && (
              <datalist id="delivery-note-units">
                <option value="ชุด" />
                <option value="ตัว" />
                <option value="กล่อง" />
                <option value="แผ่น" />
                <option value="คู่" />
                <option value="ชิ้น" />
              </datalist>
            )}

            {items.map((it, idx) => (
              <div key={it.id} className="border border-[#E8E5E0] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#9CA3AF]">#{idx + 1}</span>
                  <button type="button" onClick={() => removeItem(it.id)} aria-label={t("ลบ", "Remove", "删除")} className="text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <ImageUploadTile image={it.image} onChange={(url) => updateItem(it.id, { image: url })} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs w-full justify-start"
                      onClick={() => {
                        setStockPickerTarget(it.id);
                        setStockPickerOpen(true);
                      }}
                    >
                      <Search size={13} className="mr-1.5 shrink-0" />
                      <span className="truncate">{t("เลือกสินค้าจากสต็อก...", "Pick from Stock...", "从库存选择...")}</span>
                    </Button>
                    {it.sku && (
                      <p className={`text-[11px] ${it.stock_variant_id ? "text-emerald-600" : "text-amber-600"}`}>
                        {it.stock_variant_id
                          ? t("✓ ผูกกับสต็อก", "✓ Linked to Stock", "✓ 已关联库存")
                          : t("ไม่ผูกสต็อก", "Not linked to Stock", "未关联库存")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    className="h-8 text-xs sm:col-span-2"
                    placeholder={t("ชื่อสินค้า", "Item Name", "产品名称")}
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder={t("รหัสรุ่น / SKU", "Model / SKU", "型号/SKU")}
                    value={it.sku}
                    onChange={(e) => updateItem(it.id, { sku: e.target.value, stock_variant_id: null })}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder={t("ขนาด (mm)", "Size (mm)", "规格 (mm)")}
                    value={it.size}
                    onChange={(e) => updateItem(it.id, { size: e.target.value, stock_variant_id: null })}
                  />
                </div>

                <div className={isDeliveryNote ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 sm:grid-cols-3 gap-2"}>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    placeholder={t("จำนวน", "Qty", "数量")}
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 0 })}
                  />
                  {isDeliveryNote && (
                    <Input
                      className="h-8 text-xs"
                      list="delivery-note-units"
                      placeholder={t("หน่วย เช่น ชุด/ตัว", "Unit e.g. set/pc", "单位 如 套/件")}
                      value={it.unit}
                      onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                    />
                  )}
                  {!isDeliveryNote && (
                    <>
                      <Select
                        value={String(it.seats)}
                        onValueChange={(v) => {
                          const seats = Number(v);
                          updateItem(it.id, { seats, unitPrice: computeSeatPrice(it.baseUnitPrice, seats) });
                        }}
                      >
                        <SelectTrigger size="sm" className="h-8 text-xs">
                          <SelectValue>{(v: string) => `${v} ${t("ที่นั่ง", "seats", "座")}`}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SEAT_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {t("ที่นั่ง", "seats", "座")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        placeholder={t("ราคาต่อหน่วย", "Unit Price", "单价")}
                        value={it.unitPrice}
                        onChange={(e) => {
                          const unitPrice = Number(e.target.value) || 0;
                          updateItem(it.id, {
                            unitPrice,
                            ...(it.seats === 1 ? { baseUnitPrice: unitPrice } : {}),
                          });
                        }}
                      />
                    </>
                  )}
                </div>
                <div className="flex gap-2 items-start">
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder={t("หมายเหตุ", "Remark", "备注")}
                    value={it.remark}
                    onChange={(e) => updateItem(it.id, { remark: e.target.value })}
                  />
                  <ImageUploadTile
                    image={it.remarkImage}
                    onChange={(url) => updateItem(it.id, { remarkImage: url })}
                  />
                </div>
                {!isDeliveryNote && (
                  <p className="text-right text-xs text-[#6B6B6B]">
                    {t("รวม", "Total", "总计")}: <span className="font-semibold text-[#1A1A1A]">฿{fmtMoney(it.qty * it.unitPrice)}</span>
                  </p>
                )}
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={() => setItems((prev) => [...prev, newLine()])}>
              <Plus size={13} className="mr-1" /> {t("เพิ่มรายการ", "Add Item", "添加项目")}
            </Button>
          </div>

          <StockProductPickerDialog
            open={stockPickerOpen}
            onOpenChange={setStockPickerOpen}
            products={liveStockProducts}
            onPick={(v) => {
              if (stockPickerTarget) pickStockProduct(stockPickerTarget, v);
              setStockPickerOpen(false);
            }}
          />

          {!isDeliveryNote && (
            <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>{t("ส่วนลด %", "Discount %", "折扣 %")}</Label>
                <Input type="number" step="0.1" className="mt-1" value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>VAT %</Label>
                <Input type="number" step="0.1" className="mt-1" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>{t("มัดจำ %", "Deposit %", "定金 %")}</Label>
                <Input type="number" step="0.1" className="mt-1" value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {!isDeliveryNote && (
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-2">
              <Label>{t("เงื่อนไขการขาย (แสดงในเอกสาร)", "Terms of Sale (shown on document)", "销售条款（显示在文件上）")}</Label>
              <Textarea
                className="font-mono text-xs"
                rows={6}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
              />
            </div>
          )}

          {!isDeliveryNote && (
            <>
              <PaymentsSection quoteId={savedId} />
              <ShipmentHistorySection quoteId={savedId} />
            </>
          )}
            </>
          )}
        </div>

        {/* ── Preview ──────────────────────────────────────────────── */}
        {/* Plain block, full height, no internal scroll — shows the whole
            document and scrolls in the normal page flow alongside the
            left column, with no sticky/JS scroll-sync involved. */}
        <div className="preview-sticky-wrapper overflow-x-auto">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-2 no-print">{t("ตัวอย่างเอกสาร (Preview)", "Preview", "预览")}</p>
          <div id="print-area" className="bg-white shadow-sm text-[11px] text-[#1A1A1A] leading-snug p-6 mx-auto" style={{ maxWidth: 794 }}>
            {/* Letterhead — matches FUTAI_Quotation_Template.xlsx rows 1-13 */}
            <table className="w-full border-collapse mb-0">
              <tbody>
                <tr>
                  <td rowSpan={companyLines.length} className="w-[80px] align-top pt-1">
                    <Image src="/icon.png" alt="Futai" width={60} height={60} className="rounded" />
                  </td>
                  <td colSpan={8} className="text-center font-bold text-[13px] pt-1">{companyLines[0].text}</td>
                </tr>
                {companyLines.slice(1).map((l, i) => (
                  <tr key={l.key}>
                    <td colSpan={8} className={`text-center text-[12px] ${i === companyLines.length - 2 ? "pb-1" : ""}`}>{l.text}</td>
                  </tr>
                ))}
                <tr className="text-[9.5px]">
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.address)} :</td>
                  <td colSpan={4}>99/9, 99/11 หมู่ที่ 5 ถนนลำลูกกา ตำบลลำลูกกา</td>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.tel)} :</td>
                  <td>
                    <input
                      value={companyTel}
                      onChange={(e) => setCompanyTel(e.target.value)}
                      className="company-tel-input w-full bg-transparent border-none p-0 text-[11px] leading-snug focus:outline-none focus:ring-1 focus:ring-[#C8102E]/40 rounded"
                    />
                  </td>
                </tr>
                <tr className="text-[9.5px]">
                  <td colSpan={2} />
                  <td colSpan={4}>อำเภอลำลูกกา จ.ปทุมธานี 12150</td>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.web)} :</td>
                  <td>{COMPANY.web}</td>
                </tr>
                <tr className="text-[9.5px]">
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.taxId)} :</td>
                  <td colSpan={4}>{COMPANY.taxId}</td>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.email)} :</td>
                  <td>{COMPANY.email}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-center font-bold py-1.5 my-2" style={{ backgroundColor: "#F8CAAC" }}>
              <div className="text-[15px]">{doc.th}</div>
              <div className="text-[11px]">{docSubLine}</div>
            </div>

            <table className="w-full border-collapse mb-2 text-[10.5px]">
              <tbody>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.date)}：</td>
                  <td colSpan={4}>{date}</td>
                  <td colSpan={3} className="text-right pr-1">
                    <span className="whitespace-nowrap">{L(DOC_NO_LABELS[docType])}</span>{" "}
                    <span className="font-mono">{docNo}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.customer)}:</td>
                  <td colSpan={7}>{customerName || "-"}</td>
                </tr>
                {!isDeliveryNote && (
                  <>
                    <tr>
                      <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.address)} :</td>
                      <td colSpan={7}>{customerAddress || "-"}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.taxId)}:</td>
                      <td colSpan={7}>{customerTaxId || "-"}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            <table className="w-full border-collapse mb-2 text-[10px]" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8CAAC" }}>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "6%" }}>{L(TXT.colNo)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: isDeliveryNote ? "20%" : "19%" }}>{L(TXT.colItem)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: isDeliveryNote ? "14%" : "13%" }}>{L(TXT.colModel)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: isDeliveryNote ? "12%" : "11%" }}>{L(TXT.colPhoto)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: isDeliveryNote ? "17%" : "17%" }}>{L(TXT.colSize)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: isDeliveryNote ? "7%" : "7%" }}>{L(TXT.colQty)}</th>
                  {isDeliveryNote && <th className="border border-[#1A1A1A] p-1" style={{ width: "8%" }}>{L(TXT.colUnit)}</th>}
                  {!isDeliveryNote && (
                    <>
                      <th className="border border-[#1A1A1A] p-1" style={{ width: "11%" }}>{L(TXT.colUnitPrice)} (THB.)</th>
                      <th className="border border-[#1A1A1A] p-1" style={{ width: "11%" }}>{L(TXT.colAmount)} (THB.)</th>
                    </>
                  )}
                  <th className="border border-[#1A1A1A] p-1" style={{ width: isDeliveryNote ? "16%" : "11%" }}>{L(TXT.colRemark)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id} className="text-center">
                    <td className="border border-[#1A1A1A] p-1">{idx + 1}</td>
                    <td className="border border-[#1A1A1A] p-1 text-left">{it.name || "-"}</td>
                    <td className="border border-[#1A1A1A] p-1 font-mono">{it.sku || "-"}</td>
                    <td className="border border-[#1A1A1A] p-1">
                      {it.image ? (
                        <div className="relative w-full h-16 mx-auto">
                          <Image src={it.image} alt="" fill sizes="90px" className="object-contain" />
                        </div>
                      ) : (
                        <span className="text-[#C8C5BE]">-</span>
                      )}
                    </td>
                    <td className="border border-[#1A1A1A] p-1">{it.size || "-"}</td>
                    <td className="border border-[#1A1A1A] p-1">{it.qty}</td>
                    {isDeliveryNote && <td className="border border-[#1A1A1A] p-1">{it.unit || "-"}</td>}
                    {!isDeliveryNote && (
                      <>
                        <td className="border border-[#1A1A1A] p-1 text-right">{fmtMoney(it.unitPrice)}</td>
                        <td className="border border-[#1A1A1A] p-1 text-right font-medium">{fmtMoney(it.qty * it.unitPrice)}</td>
                      </>
                    )}
                    <td className="border border-[#1A1A1A] p-1 text-left text-[#C8102E] font-medium">
                      {it.remark}
                      {it.remarkImage && (
                        <div className="relative w-full h-16 mt-1">
                          <Image src={it.remarkImage} alt="" fill sizes="90px" className="object-contain" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!isDeliveryNote && (
              <table className="w-full border-collapse mb-2 text-[10px]">
                <tbody>
                  <tr>
                    <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.subtotal)}</td>
                    <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(subtotal)}</td>
                  </tr>
                  {discountPct > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#C8102E]">{L(TXT.discount)} ({discountPct}%)</td>
                        <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#C8102E]">-฿{fmtMoney(discountAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.afterDiscount)}</td>
                        <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(subtotalAfterDiscount)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.vatAmountLabel)} ({vatPct}%)</td>
                    <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(vatAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={8} className="border border-[#1A1A1A] p-1 font-bold text-[#1A1A1A]">{L(TXT.grandTotal)}</td>
                    <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-bold text-[#1A1A1A]">฿{fmtMoney(grandTotal)}</td>
                  </tr>
                  {depositPct > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.depositAmount)} ({depositPct}%)</td>
                        <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(depositAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.balance)}</td>
                        <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(balanceAmount)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )}

            {/* Delivery info — separate from the customer/billing block above,
                matches the real invoice layout exactly (shipping details go
                here, filled in after the order is confirmed). */}
            <table className="w-full border-collapse mb-2 text-[10px]">
              <tbody>
                <tr>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap align-top">{L(TXT.shipAddress)}：</td>
                  <td colSpan={3} className="border border-[#1A1A1A] p-1 align-top">{shippingAddress || "-"}</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap align-top">{L(TXT.shipDate)}：</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 align-top">{shippingDate || "-"}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap">{L(TXT.shipContact)}：</td>
                  <td colSpan={3} className="border border-[#1A1A1A] p-1">{customerContact || "-"}</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap">{L(TXT.shipPhone)}：</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap">{customerPhone || "-"}</td>
                </tr>
              </tbody>
            </table>

            {!isDeliveryNote && (
              <>
                <div className="no-break mb-2 text-[9.5px] text-[#1A1A1A] border border-[#1A1A1A]">
                  <p className="font-semibold text-center py-1" style={{ backgroundColor: "#F8CAAC" }}>TERMS OF SALE AND OTHER COMMENTS</p>
                  <div className="p-1.5 space-y-0.5">
                    {termsText.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>

                <div className="no-break mb-2 text-[9.5px] text-[#1A1A1A] border border-[#1A1A1A]">
                  <p className="font-semibold text-center py-1" style={{ backgroundColor: "#F8CAAC" }}>Bank Account (THB)</p>
                  <div className="p-1.5 space-y-0.5">
                    <p>Account name : FUTAI FURNITURE CO.,LTD. &nbsp; Account number : 100000301332239 (THB)</p>
                    <p>Name of beneficiary bank : BANK OF CHINA (THAI) PCL &nbsp; Beneficiary Bank Code : 052</p>
                    <p>Address : 179/4 BANGKOK CITY TOWER, SOUTH SATHORN RD, TUNGMAHAMEK, SATHORN, BANGKOK 10120</p>
                    <p>SWIFT Code (Field 57) : BKCHTHBKXXX &nbsp; Correspondent Bank (Field 56A) For THB : BKCHCNBJXXX</p>
                  </div>
                </div>
              </>
            )}

            {isDeliveryNote ? (
              <div className="no-break grid grid-cols-2 gap-8 text-[10px] text-[#1A1A1A] pt-2">
                <p className="whitespace-pre-line h-16">{L(TXT.senderSign)} :</p>
                <p className="whitespace-pre-line h-16">{L(TXT.receiverSign)} :</p>
              </div>
            ) : (
              <div className="no-break grid grid-cols-2 gap-8 text-[10px] text-[#1A1A1A] pt-2">
                <p className="whitespace-pre-line h-16">{L(TXT.sellerSign)} :</p>
                <p className="whitespace-pre-line h-16">{L(TXT.buyerSign)} :</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuoteBuilderPage() {
  return (
    <Suspense fallback={null}>
      <QuoteBuilderInner />
    </Suspense>
  );
}
