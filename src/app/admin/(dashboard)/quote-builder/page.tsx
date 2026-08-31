"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRICE_CATALOG, type PriceCatalogEntry } from "@/data/price-catalog";

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
  unit: string;
  unitPrice: number;
  remark: string;
  image: string | null;
}

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
  contact:        { th: "ผู้ติดต่อ",        en: "Contact",      zh: "联系人" },
  colNo:          { th: "ลำดับ",            en: "No.",          zh: "序号" },
  colItem:        { th: "ชื่อสินค้า",       en: "Item",         zh: "品名" },
  colModel:       { th: "แบบอย่าง",         en: "Model",        zh: "型号" },
  colPhoto:       { th: "ภาพ",              en: "Photo",        zh: "图片" },
  colSize:        { th: "ขนาด (mm)",        en: "Size (mm)",    zh: "规格" },
  colQty:         { th: "ปริมาณ",           en: "Qty",          zh: "数量" },
  colUnit:        { th: "หน่วย",            en: "Unit",         zh: "单位" },
  colUnitPrice:   { th: "ราคา/หน่วย",       en: "Unit Price",   zh: "单价" },
  colAmount:      { th: "จำนวนเงิน",        en: "Amount",       zh: "总价" },
  colRemark:      { th: "หมายเหตุ",         en: "Remark",       zh: "备注" },
  vatLabel:       { th: "VAT %",            en: "VAT %",        zh: "增值税 %" },
  depositLabel:   { th: "มัดจำ %",          en: "Deposit %",    zh: "定金 %" },
  subtotal:       { th: "ราคารวมก่อนภาษี", en: "Subtotal",     zh: "小计" },
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
    unit: "ชุด",
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
          placeholder="ค้นหา SKU หรือชื่อสินค้า..."
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
  const [docType, setDocType] = useState<DocType>("quotation");
  const [langMode, setLangMode] = useState<LangMode>("th-en-zh");
  const [docNo, setDocNo] = useState(`${DOC_LABELS.quotation.prefix}${todayStr().replace(/-/g, "")}-01`);
  const [date, setDate] = useState(todayStr());
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vatPct, setVatPct] = useState(7);
  const [depositPct, setDepositPct] = useState(50);
  const [items, setItems] = useState<LineItem[]>([newLine()]);

  const L = (t: TriText) => joinLang(langMode, t);

  function setDocTypeAndPrefix(t: DocType) {
    setDocType(t);
    setDocNo((prev) => {
      const oldPrefix = DOC_LABELS[docType].prefix;
      const newPrefix = DOC_LABELS[t].prefix;
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
  const vatAmount = subtotal * (vatPct / 100);
  const grandTotal = subtotal + vatAmount;
  const depositAmount = grandTotal * (depositPct / 100);
  const balanceAmount = grandTotal - depositAmount;

  const doc = DOC_LABELS[docType];

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
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">สร้างใบเสนอราคา / ใบแจ้งหนี้</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">อ้างอิงราคาจากรายการสินค้า กรอกลูกค้า แล้วดาวน์โหลดได้ทันที</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={14} className="mr-1.5" /> ดาวน์โหลด PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Form ─────────────────────────────────────────────────── */}
        <div className="space-y-4 no-print">
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex gap-2">
              {(["quotation", "invoice"] as DocType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocTypeAndPrefix(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    docType === t ? "bg-[#C8102E] text-white" : "bg-[#E8E5E0] text-[#6B6B6B] hover:bg-[#d0cdc8]"
                  }`}
                >
                  {DOC_LABELS[t].th}
                </button>
              ))}
            </div>

            <div>
              <Label>ภาษาในเอกสาร</Label>
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
                <Label>วันที่</Label>
                <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>เลขที่เอกสาร</Label>
                <Input className="mt-1 font-mono" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>ชื่อลูกค้า / บริษัท</Label>
                <Input className="mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="เช่น บริษัท ... จำกัด" />
              </div>
              <div className="col-span-2">
                <Label>ที่อยู่</Label>
                <Textarea className="mt-1" rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>
              <div>
                <Label>เลขผู้เสียภาษี</Label>
                <Input className="mt-1" value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} />
              </div>
              <div>
                <Label>เบอร์ติดต่อ</Label>
                <Input className="mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>ผู้ติดต่อ</Label>
                <Input className="mt-1" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1A1A1A]">รายการสินค้า</p>
              <Button size="sm" variant="outline" onClick={() => setItems((prev) => [...prev, newLine()])}>
                <Plus size={13} className="mr-1" /> เพิ่มรายการ
              </Button>
            </div>

            {items.map((it, idx) => (
              <div key={it.id} className="border border-[#E8E5E0] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#9CA3AF]">#{idx + 1}</span>
                  <button type="button" onClick={() => removeItem(it.id)} aria-label="ลบ" className="text-red-400 hover:text-red-600">
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
                    placeholder="ชื่อสินค้า"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="รหัสรุ่น / SKU"
                    value={it.sku}
                    onChange={(e) => updateItem(it.id, { sku: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="ขนาด (mm)"
                    value={it.size}
                    onChange={(e) => updateItem(it.id, { size: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    placeholder="จำนวน"
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 0 })}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="หน่วย"
                    value={it.unit}
                    onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                  />
                  <Input
                    type="number"
                    className="h-8 text-xs col-span-2"
                    placeholder="ราคา/หน่วย"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value) || 0 })}
                  />
                </div>
                <Input
                  className="h-8 text-xs"
                  placeholder="หมายเหตุ"
                  value={it.remark}
                  onChange={(e) => updateItem(it.id, { remark: e.target.value })}
                />
                <p className="text-right text-xs text-[#6B6B6B]">
                  รวม: <span className="font-semibold text-[#1A1A1A]">฿{fmtMoney(it.qty * it.unitPrice)}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-3">
            <div>
              <Label>VAT %</Label>
              <Input type="number" className="mt-1" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>มัดจำ %</Label>
              <Input type="number" className="mt-1" value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        {/* ── Preview ──────────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A] mb-2 no-print">ตัวอย่างเอกสาร (Preview)</p>
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

            <div className="text-center font-bold text-[13px] py-1.5 my-2" style={{ backgroundColor: "#F8CAAC" }}>
              {L(doc)}
            </div>

            <table className="w-full border-collapse mb-2 text-[10.5px]">
              <tbody>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.date)}：</td>
                  <td colSpan={4}>{date}</td>
                  <td colSpan={2} className="whitespace-nowrap">{L(DOC_NO_LABELS[docType])}</td>
                  <td className="font-mono">{docNo}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.customer)}:</td>
                  <td colSpan={7}>{customerName || "-"}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.address)} :</td>
                  <td colSpan={7}>{customerAddress || "-"}{customerContact || customerPhone ? ` — ${customerContact} ${customerPhone}`.trim() : ""}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.taxId)}:</td>
                  <td colSpan={7}>{customerTaxId || "-"}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse mb-0 text-[10px]" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8CAAC" }}>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "6%" }}>{L(TXT.colNo)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "18%" }}>{L(TXT.colItem)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "12%" }}>{L(TXT.colModel)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>{L(TXT.colPhoto)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "16%" }}>{L(TXT.colSize)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "6%" }}>{L(TXT.colQty)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "6%" }}>{L(TXT.colUnit)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>{L(TXT.colUnitPrice)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>{L(TXT.colAmount)}</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>{L(TXT.colRemark)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id} className="text-center">
                    <td className="border border-[#E8E5E0] p-1">{idx + 1}</td>
                    <td className="border border-[#E8E5E0] p-1 text-left">{it.name || "-"}</td>
                    <td className="border border-[#E8E5E0] p-1 font-mono">{it.sku || "-"}</td>
                    <td className="border border-[#E8E5E0] p-1">
                      {it.image ? (
                        <div className="relative w-full h-16 mx-auto">
                          <Image src={it.image} alt="" fill sizes="90px" className="object-contain" />
                        </div>
                      ) : (
                        <span className="text-[#C8C5BE]">-</span>
                      )}
                    </td>
                    <td className="border border-[#E8E5E0] p-1">{it.size || "-"}</td>
                    <td className="border border-[#E8E5E0] p-1">{it.qty}</td>
                    <td className="border border-[#E8E5E0] p-1">{it.unit}</td>
                    <td className="border border-[#E8E5E0] p-1 text-right">{fmtMoney(it.unitPrice)}</td>
                    <td className="border border-[#E8E5E0] p-1 text-right font-medium">{fmtMoney(it.qty * it.unitPrice)}</td>
                    <td className="border border-[#E8E5E0] p-1 text-left">{it.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="w-full border-collapse mb-0 text-[10px]">
              <tbody>
                <tr style={{ backgroundColor: "#FFFFCC" }}>
                  <td className="border border-[#E8E5E0] p-1 whitespace-nowrap">{L(TXT.vatLabel)}</td>
                  <td className="border border-[#E8E5E0] p-1 text-center">{vatPct}%</td>
                  <td className="border border-[#E8E5E0] p-1 whitespace-nowrap">{L(TXT.depositLabel)}</td>
                  <td className="border border-[#E8E5E0] p-1 text-center" colSpan={7}>{depositPct}%</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">{L(TXT.subtotal)}</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">{L(TXT.vatAmountLabel)}</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(vatAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 font-bold">{L(TXT.grandTotal)}</td>
                  <td colSpan={2} className="p-1 text-right font-bold">฿{fmtMoney(grandTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">{L(TXT.depositAmount)}</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(depositAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">{L(TXT.balance)}</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(balanceAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-2 mb-3 text-[9.5px] text-[#6B6B6B] space-y-0.5">
              <p className="font-semibold text-[#1A1A1A]">TERMS OF SALE AND OTHER COMMENTS</p>
              <p>1. {L(TXT.term1)}</p>
              <p>2. {L(TXT.term2)}</p>
              <p>3. {L(TXT.term3)}</p>
              <p>4. {L(TXT.term4)}</p>
            </div>

            <div className="pt-2 mb-2 text-[9.5px] text-[#6B6B6B]">
              <p className="font-semibold text-[#1A1A1A]">Bank Account (THB)</p>
              <p>Account name : FUTAI FURNITURE CO.,LTD. &nbsp; Account number : 100000301332239 (THB)</p>
              <p>Name of beneficiary bank : BANK OF CHINA (THAI) PCL &nbsp; Beneficiary Bank Code : 052</p>
              <p>Address : 179/4 BANGKOK CITY TOWER, SOUTH SATHORN RD, TUNGMAHAMEK, SATHORN, BANGKOK 10120</p>
              <p>SWIFT Code (Field 57) : BKCHTHBKXXX &nbsp; Correspondent Bank (Field 56A) For THB : BKCHCNBJXXX</p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[10px] text-[#6B6B6B] pt-2">
              <p className="whitespace-pre-line h-16">{L(TXT.sellerSign)} :</p>
              <p className="whitespace-pre-line h-16">{L(TXT.buyerSign)} :</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
