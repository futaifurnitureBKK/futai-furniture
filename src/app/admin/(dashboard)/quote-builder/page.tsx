"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Printer, Search, Save, FolderOpen, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PRICE_CATALOG, type PriceCatalogEntry } from "@/data/price-catalog";
import { useLanguage } from "@/store/language";
import type { SavedQuote, SavedQuoteItem } from "@/types";

type DocType = "quotation" | "invoice";
type LangMode = "th-en-zh" | "th-en" | "th-zh";

interface TriText {
  th: string;
  en: string;
  zh: string;
}

interface LineItem {
  id: string;
  name: string;
  sku: string;
  size: string;
  qty: number;
  unitPrice: number;
  remark: string;
  image: string | null;
}

type SavedListRow = Pick<SavedQuote, "id" | "doc_type" | "doc_no" | "customer_name" | "doc_date" | "updated_at">;

const DOC_LABELS: Record<DocType, TriText & { prefix: string }> = {
  quotation: { th: "ใบเสนอราคา", en: "QUOTATION", zh: "报价单", prefix: "QT" },
  invoice:   { th: "ใบแจ้งหนี้", en: "INVOICE",   zh: "发票",   prefix: "IV" },
};

const DOC_NO_LABELS: Record<DocType, TriText> = {
  quotation: { th: "เลขที่ใบเสนอราคา", en: "Quotation No", zh: "报价单号" },
  invoice:   { th: "เลขที่ใบแจ้งหนี้", en: "Invoice No",   zh: "发票号码" },
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
  colUnitPrice:   { th: "ราคาต่อหน่วย",     en: "Unit Price",   zh: "单价" },
  colAmount:      { th: "จำนวนเงินทั้งหมด", en: "Amount",       zh: "总价" },
  colRemark:      { th: "หมายเหตุ",         en: "Remark",       zh: "备注" },
  subtotal:       { th: "ราคารวมก่อนภาษี", en: "Subtotal",     zh: "小计" },
  discount:       { th: "ส่วนลด",           en: "Discount",     zh: "折扣" },
  vatAmountLabel: { th: "ภาษีมูลค่าเพิ่ม", en: "VAT",          zh: "增值税" },
  grandTotal:     { th: "ราคารวมทั้งหมด",  en: "Grand Total",  zh: "总价" },
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
  sellerSign: { th: "ผู้ขาย (ประทับตราบริษัท)", en: "Seller (Company Stamp)", zh: "销售方（盖章）" },
  buyerSign:  { th: "ผู้ซื้อ (ประทับตราบริษัท)", en: "Buyer (Company Stamp)",  zh: "采购方（盖章）" },
} satisfies Record<string, TriText>;

function joinLang(langMode: LangMode, t: TriText): string {
  if (langMode === "th-en-zh") return `${t.th} / ${t.en} / ${t.zh}`;
  if (langMode === "th-en") return `${t.th} / ${t.en}`;
  return `${t.th} / ${t.zh}`;
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
    image: null,
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProductPicker({ onPick }: { onPick: (entry: PriceCatalogEntry) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return PRICE_CATALOG.filter(
      (e) => e.sku.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    ).slice(0, 8);
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

export default function QuoteBuilderPage() {
  const { t } = useLanguage();
  const [docType, setDocType] = useState<DocType>("quotation");
  const [langMode, setLangMode] = useState<LangMode>("th-en-zh");
  const [docNo, setDocNo] = useState(`${DOC_LABELS.quotation.prefix}${todayStr().replace(/-/g, "")}-01`);
  const [date, setDate] = useState(todayStr());
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingDate, setShippingDate] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [vatPct, setVatPct] = useState(7);
  const [depositPct, setDepositPct] = useState(50);
  const [items, setItems] = useState<LineItem[]>([newLine()]);

  const [savedId, setSavedId] = useState<number | null>(null);
  const [savedList, setSavedList] = useState<SavedListRow[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  const L = (t: TriText) => joinLang(langMode, t);

  async function fetchSavedList() {
    setLoadingList(true);
    const res = await fetch("/api/admin/saved-quotes");
    const data = await res.json();
    setLoadingList(false);
    if (res.ok) setSavedList(data.quotes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/saved-quotes");
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setSavedList(data.quotes);
        setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setSavedId(null);
    setDocType("quotation");
    setLangMode("th-en-zh");
    setDocNo(`${DOC_LABELS.quotation.prefix}${todayStr().replace(/-/g, "")}-01`);
    setDate(todayStr());
    setCustomerName("");
    setCustomerAddress("");
    setCustomerTaxId("");
    setShippingAddress("");
    setShippingDate("");
    setCustomerContact("");
    setCustomerPhone("");
    setDiscountPct(0);
    setVatPct(7);
    setDepositPct(50);
    setItems([newLine()]);
  }

  async function saveQuote() {
    setSaving(true);
    const payload = {
      doc_type: docType,
      doc_no: docNo,
      lang_mode: langMode,
      doc_date: date,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_tax_id: customerTaxId,
      shipping_address: shippingAddress,
      shipping_date: shippingDate || null,
      contact_person: customerContact,
      contact_phone: customerPhone,
      discount_pct: discountPct,
      vat_pct: vatPct,
      deposit_pct: depositPct,
      items: items.map(
        (it): SavedQuoteItem => ({
          name: it.name,
          sku: it.sku,
          size: it.size,
          qty: it.qty,
          unitPrice: it.unitPrice,
          remark: it.remark,
          image: it.image,
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
    setDate(q.doc_date);
    setCustomerName(q.customer_name);
    setCustomerAddress(q.customer_address);
    setCustomerTaxId(q.customer_tax_id);
    setShippingAddress(q.shipping_address);
    setShippingDate(q.shipping_date || "");
    setCustomerContact(q.contact_person);
    setCustomerPhone(q.contact_phone);
    setDiscountPct(q.discount_pct ?? 0);
    setVatPct(q.vat_pct);
    setDepositPct(q.deposit_pct);
    setItems(
      q.items.length
        ? q.items.map((it) => ({ ...it, id: Math.random().toString(36).slice(2) }))
        : [newLine()]
    );
    setListOpen(false);
  }

  async function deleteQuote(id: number) {
    if (!confirm(t("ลบใบนี้ใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)", "Delete this document? This can't be undone.", "确定删除吗？删除后无法恢复。"))) return;
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

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  function pickProduct(id: string, entry: PriceCatalogEntry) {
    updateItem(id, {
      name: entry.category,
      sku: entry.sku,
      size: entry.size,
      unitPrice: entry.price ?? 0,
      image: entry.image,
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vatAmount = subtotalAfterDiscount * (vatPct / 100);
  const grandTotal = subtotalAfterDiscount + vatAmount;
  const depositAmount = grandTotal * (depositPct / 100);
  const balanceAmount = grandTotal - depositAmount;

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

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
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
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
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
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setListOpen((v) => !v)}>
            <FolderOpen size={14} className="mr-1.5" /> {t("รายการที่บันทึกไว้", "Saved", "已保存")} ({savedList.length})
          </Button>
          <Button variant="outline" onClick={resetForm}>
            <FilePlus2 size={14} className="mr-1.5" /> {t("สร้างใหม่", "New", "新建")}
          </Button>
          <Button variant="outline" onClick={saveQuote} disabled={saving}>
            <Save size={14} className="mr-1.5" /> {saving ? t("กำลังบันทึก...", "Saving...", "保存中...") : t("บันทึก", "Save", "保存")}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={14} className="mr-1.5" /> {t("ดาวน์โหลด PDF", "Download PDF", "下载PDF")}
          </Button>
        </div>
      </div>

      {listOpen && (
        <div className="bg-white rounded-xl shadow-sm p-5 no-print">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-3">{t("รายการที่บันทึกไว้", "Saved Documents", "已保存文件")}</p>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAF7F2]">
                <TableHead className="text-xs">{t("เลขที่", "Doc No.", "单号")}</TableHead>
                <TableHead className="text-xs">{t("ประเภท", "Type", "类型")}</TableHead>
                <TableHead className="text-xs">{t("ลูกค้า", "Customer", "客户")}</TableHead>
                <TableHead className="text-xs">{t("วันที่", "Date", "日期")}</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#6B6B6B]">
                    {t("กำลังโหลด...", "Loading...", "加载中...")}
                  </TableCell>
                </TableRow>
              ) : savedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#6B6B6B]">
                    {t("ยังไม่มีเอกสารที่บันทึกไว้", "No saved documents yet", "暂无已保存的文件")}
                  </TableCell>
                </TableRow>
              ) : (
                savedList.map((q) => (
                  <TableRow key={q.id} className="hover:bg-[#FAF7F2]/50">
                    <TableCell className="text-sm font-mono">{q.doc_no}</TableCell>
                    <TableCell className="text-xs">
                      {t(DOC_LABELS[q.doc_type].th, DOC_LABELS[q.doc_type].en, DOC_LABELS[q.doc_type].zh)}
                    </TableCell>
                    <TableCell className="text-sm">{q.customer_name || "-"}</TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">{q.doc_date}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => loadQuote(q.id)}>
                          {t("เปิด", "Open", "打开")}
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => deleteQuote(q.id)} aria-label={t("ลบ", "Delete", "删除")}>
                          <Trash2 size={13} className="text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Form ─────────────────────────────────────────────────── */}
        <div className="space-y-4 no-print">
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex gap-2">
              {(["quotation", "invoice"] as DocType[]).map((docTypeOption) => (
                <button
                  key={docTypeOption}
                  type="button"
                  onClick={() => setDocTypeAndPrefix(docTypeOption)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    docType === docTypeOption ? "bg-[#C8102E] text-white" : "bg-[#E8E5E0] text-[#6B6B6B] hover:bg-[#d0cdc8]"
                  }`}
                >
                  {t(DOC_LABELS[docTypeOption].th, DOC_LABELS[docTypeOption].en, DOC_LABELS[docTypeOption].zh)}
                </button>
              ))}
            </div>

            <div>
              <Label>{t("ภาษาในเอกสาร", "Document Language", "文件语言")}</Label>
              <div className="flex gap-2 mt-1">
                {LANG_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setLangMode(o.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      langMode === o.value ? "bg-[#1A1A1A] text-white" : "bg-[#E8E5E0] text-[#6B6B6B] hover:bg-[#d0cdc8]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("วันที่", "Date", "日期")}</Label>
                <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("เลขที่เอกสาร", "Document No.", "单号")}</Label>
                <Input className="mt-1 font-mono" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{t("ชื่อลูกค้า / บริษัท", "Customer / Company Name", "客户/公司名称")}</Label>
                <Input
                  className="mt-1"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("เช่น บริษัท ... จำกัด", "e.g. ... Co., Ltd.", "例如：... 有限公司")}
                />
              </div>
              <div className="col-span-2">
                <Label>{t("ที่อยู่", "Address", "地址")}</Label>
                <Textarea className="mt-1" rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>{t("เลขผู้เสียภาษี", "Tax ID", "纳税人识别号")}</Label>
                <Input className="mt-1" value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Delivery info — separate block, matches the real invoice layout
              (shipping address/date can differ from the billing details above) */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-[#1A1A1A]">{t("ข้อมูลจัดส่ง", "Delivery Info", "发货信息")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
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
              <div className="col-span-2">
                <Label>{t("หมายเลขโทรศัพท์", "Phone", "电话")}</Label>
                <Input className="mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1A1A1A]">{t("รายการสินค้า", "Line Items", "产品清单")}</p>
              <Button size="sm" variant="outline" onClick={() => setItems((prev) => [...prev, newLine()])}>
                <Plus size={13} className="mr-1" /> {t("เพิ่มรายการ", "Add Item", "添加项目")}
              </Button>
            </div>

            {items.map((it, idx) => (
              <div key={it.id} className="border border-[#E8E5E0] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#9CA3AF]">#{idx + 1}</span>
                  <button type="button" onClick={() => removeItem(it.id)} aria-label={t("ลบ", "Remove", "删除")} className="text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex gap-2">
                  {it.image && (
                    <div className="relative w-16 h-12 shrink-0 rounded bg-[#F5F3EF] overflow-hidden border border-[#E8E5E0]">
                      <Image src={it.image} alt="" fill sizes="64px" className="object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <ProductPicker onPick={(entry) => pickProduct(it.id, entry)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    className="h-8 text-xs col-span-2"
                    placeholder={t("ชื่อสินค้า", "Item Name", "产品名称")}
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder={t("รหัสรุ่น / SKU", "Model / SKU", "型号/SKU")}
                    value={it.sku}
                    onChange={(e) => updateItem(it.id, { sku: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder={t("ขนาด (mm)", "Size (mm)", "规格 (mm)")}
                    value={it.size}
                    onChange={(e) => updateItem(it.id, { size: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    placeholder={t("จำนวน", "Qty", "数量")}
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    placeholder={t("ราคาต่อหน่วย", "Unit Price", "单价")}
                    value={it.unitPrice}
                    onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value) || 0 })}
                  />
                </div>
                <Input
                  className="h-8 text-xs"
                  placeholder={t("หมายเหตุ", "Remark", "备注")}
                  value={it.remark}
                  onChange={(e) => updateItem(it.id, { remark: e.target.value })}
                />
                <p className="text-right text-xs text-[#6B6B6B]">
                  {t("รวม", "Total", "总计")}: <span className="font-semibold text-[#1A1A1A]">฿{fmtMoney(it.qty * it.unitPrice)}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-3 gap-3">
            <div>
              <Label>{t("ส่วนลด %", "Discount %", "折扣 %")}</Label>
              <Input type="number" className="mt-1" value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>VAT %</Label>
              <Input type="number" className="mt-1" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>{t("มัดจำ %", "Deposit %", "定金 %")}</Label>
              <Input type="number" className="mt-1" value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        {/* ── Preview ──────────────────────────────────────────────── */}
        <div>
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
                  <td>{COMPANY.tel}</td>
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
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.address)} :</td>
                  <td colSpan={7}>{customerAddress || "-"}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.taxId)}:</td>
                  <td colSpan={7}>{customerTaxId || "-"}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse mb-2 text-[10px]" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8CAAC" }}>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "6%" }}>{L(TXT.colNo)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "19%" }}>{L(TXT.colItem)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "13%" }}>{L(TXT.colModel)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "11%" }}>{L(TXT.colPhoto)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "17%" }}>{L(TXT.colSize)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "7%" }}>{L(TXT.colQty)}</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "11%" }}>{L(TXT.colUnitPrice)} (THB.)</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "11%" }}>{L(TXT.colAmount)} (THB.)</th>
                  <th className="border border-[#1A1A1A] p-1" style={{ width: "11%" }}>{L(TXT.colRemark)}</th>
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
                    <td className="border border-[#1A1A1A] p-1 text-right">{fmtMoney(it.unitPrice)}</td>
                    <td className="border border-[#1A1A1A] p-1 text-right font-medium">{fmtMoney(it.qty * it.unitPrice)}</td>
                    <td className="border border-[#1A1A1A] p-1 text-left">{it.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="w-full border-collapse mb-2 text-[10px]">
              <tbody>
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.subtotal)}</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(subtotal)}</td>
                </tr>
                {discountPct > 0 && (
                  <tr>
                    <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.discount)} ({discountPct}%)</td>
                    <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">-฿{fmtMoney(discountAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.vatAmountLabel)} ({vatPct}%)</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(vatAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 font-bold text-[#1A1A1A]">{L(TXT.grandTotal)}</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-bold text-[#1A1A1A]">฿{fmtMoney(grandTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.depositAmount)} ({depositPct}%)</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(depositAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.balance)}</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(balanceAmount)}</td>
                </tr>
              </tbody>
            </table>

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
                  <td colSpan={2} className="border border-[#1A1A1A] p-1">{customerPhone || "-"}</td>
                </tr>
              </tbody>
            </table>

            <div className="mb-2 text-[9.5px] text-[#1A1A1A] border border-[#1A1A1A]">
              <p className="font-semibold text-center py-1" style={{ backgroundColor: "#F8CAAC" }}>TERMS OF SALE AND OTHER COMMENTS</p>
              <div className="p-1.5 space-y-0.5">
                <p>1. {L(TXT.term1)}</p>
                <p>2. {L(TXT.term2)}</p>
                <p>3. {L(TXT.term3)}</p>
                <p>4. {L(TXT.term4)}</p>
              </div>
            </div>

            <div className="mb-2 text-[9.5px] text-[#1A1A1A] border border-[#1A1A1A]">
              <p className="font-semibold text-center py-1" style={{ backgroundColor: "#F8CAAC" }}>Bank Account (THB)</p>
              <div className="p-1.5 space-y-0.5">
                <p>Account name : FUTAI FURNITURE CO.,LTD. &nbsp; Account number : 100000301332239 (THB)</p>
                <p>Name of beneficiary bank : BANK OF CHINA (THAI) PCL &nbsp; Beneficiary Bank Code : 052</p>
                <p>Address : 179/4 BANGKOK CITY TOWER, SOUTH SATHORN RD, TUNGMAHAMEK, SATHORN, BANGKOK 10120</p>
                <p>SWIFT Code (Field 57) : BKCHTHBKXXX &nbsp; Correspondent Bank (Field 56A) For THB : BKCHCNBJXXX</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[10px] text-[#1A1A1A] pt-2">
              <p className="whitespace-pre-line h-16">{L(TXT.sellerSign)} :</p>
              <p className="whitespace-pre-line h-16">{L(TXT.buyerSign)} :</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
