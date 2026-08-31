"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRICE_CATALOG, type PriceCatalogEntry } from "@/data/price-catalog";

type DocType = "quotation" | "invoice";

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

const DOC_LABELS: Record<DocType, { th: string; en: string; zh: string; prefix: string }> = {
  quotation: { th: "ใบเสนอราคา", en: "QUOTATION", zh: "报价单", prefix: "QT" },
  invoice:   { th: "ใบแจ้งหนี้", en: "INVOICE",   zh: "发票",   prefix: "IV" },
};

const COMPANY = {
  nameEn: "FUTAI FURNITURE CO.,LTD.",
  nameZh: "富泰家具有限公司（泰国）",
  nameTh: "บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด",
  addressTh: "99/9, 99/11 หมู่ที่ 5 ถนนลำลูกกา ตำบลลำลูกกา อำเภอลำลูกกา จ.ปทุมธานี 12150",
  taxId: "0135568015065",
  tel: "061 898 0412",
  web: "www.futaifurniture.com",
  email: "futai.furniture@gmail.com",
};

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

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; top: 0; left: 0; width: 100%; }
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
                  <td rowSpan={3} className="w-[80px] align-top pt-1">
                    <Image src="/icon.png" alt="Futai" width={60} height={60} className="rounded" />
                  </td>
                  <td colSpan={8} className="text-center font-bold text-[13px] pt-1">{COMPANY.nameEn}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="text-center text-[12px]">{COMPANY.nameZh}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="text-center text-[12px] pb-1">{COMPANY.nameTh}</td>
                </tr>
                <tr className="text-[9.5px]">
                  <td colSpan={2} className="whitespace-nowrap pr-1">地址 (ที่อยู่) :</td>
                  <td colSpan={4}>99/9, 99/11 หมู่ที่ 5 ถนนลำลูกกา ตำบลลำลูกกา</td>
                  <td colSpan={2} className="whitespace-nowrap pr-1">电话 (Tel) :</td>
                  <td>{COMPANY.tel}</td>
                </tr>
                <tr className="text-[9.5px]">
                  <td colSpan={2} />
                  <td colSpan={4}>อำเภอลำลูกกา จ.ปทุมธานี 12150</td>
                  <td colSpan={2} className="whitespace-nowrap pr-1">网站 (Web) :</td>
                  <td>{COMPANY.web}</td>
                </tr>
                <tr className="text-[9.5px]">
                  <td colSpan={2} className="whitespace-nowrap pr-1">纳税人识别号 (เลขผู้เสียภาษี):</td>
                  <td colSpan={4}>{COMPANY.taxId}</td>
                  <td colSpan={2} className="whitespace-nowrap pr-1">邮箱 (Email) :</td>
                  <td>{COMPANY.email}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-center font-bold text-[13px] py-1.5 my-2" style={{ backgroundColor: "#F8CAAC" }}>
              {doc.th}  /  {doc.en}  /  {doc.zh}
            </div>

            <table className="w-full border-collapse mb-2 text-[10.5px]">
              <tbody>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">日期 (วันที่)：</td>
                  <td colSpan={4}>{date}</td>
                  <td colSpan={2} className="whitespace-nowrap">{doc.en === "INVOICE" ? "Invoice No" : "Quotation No"}</td>
                  <td className="font-mono">{docNo}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">客户 (ลูกค้า):</td>
                  <td colSpan={7}>{customerName || "-"}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">地址 (ที่อยู่) :</td>
                  <td colSpan={7}>{customerAddress || "-"}{customerContact || customerPhone ? ` — ${customerContact} ${customerPhone}`.trim() : ""}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="whitespace-nowrap pr-1">纳税人识别号 (เลขผู้เสียภาษี):</td>
                  <td colSpan={7}>{customerTaxId || "-"}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse mb-0 text-[10px]">
              <thead>
                <tr style={{ backgroundColor: "#F8CAAC" }}>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "6%" }}>序号<br />(ลำดับ)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "18%" }}>品名<br />(ชื่อสินค้า)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "12%" }}>型号<br />(แบบอย่าง)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>图片<br />(ภาพ)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "16%" }}>规格 / ขนาด (mm)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "6%" }}>数量<br />(ปริมาณ)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "6%" }}>หน่วย<br />(Unit)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>单价<br />(ราคา/หน่วย)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>总价<br />(จำนวนเงิน)</th>
                  <th className="border border-[#C8B49A] p-1" style={{ width: "10%" }}>备注<br />(หมายเหตุ)</th>
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
                  <td className="border border-[#E8E5E0] p-1 whitespace-nowrap">VAT %</td>
                  <td className="border border-[#E8E5E0] p-1 text-center">{vatPct}%</td>
                  <td className="border border-[#E8E5E0] p-1 whitespace-nowrap">มัดจำ % / Deposit %</td>
                  <td className="border border-[#E8E5E0] p-1 text-center" colSpan={7}>{depositPct}%</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">小计（ราคารวมก่อนภาษี） / Subtotal</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">增值税（ภาษีมูลค่าเพิ่ม） / VAT</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(vatAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 font-bold">总价（ราคารวมทั้งหมด） / Grand Total</td>
                  <td colSpan={2} className="p-1 text-right font-bold">฿{fmtMoney(grandTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">定金（เงินมัดจำ） / Deposit</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(depositAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-1 text-[#6B6B6B]">余款（ยอดคงเหลือหลังจัดส่งและติดตั้ง） / Balance</td>
                  <td colSpan={2} className="p-1 text-right font-medium">฿{fmtMoney(balanceAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-2 mb-3 text-[9.5px] text-[#6B6B6B] space-y-0.5">
              <p className="font-semibold text-[#1A1A1A]">TERMS OF SALE AND OTHER COMMENTS</p>
              <p>1. เวลาจัดส่ง: ภายใน 3 วันหลังจากได้รับเงินมัดจำ (สำหรับสินค้าสั่งผลิตต้องใช้เวลา 30 วัน) / 发货时间：收到定金3天内（定制产品需要30天）</p>
              <p>2. เงื่อนไขการชำระเงิน: มัดจำตาม % ที่ระบุ ส่วนที่เหลือชำระหลังจากจัดส่งและติดตั้ง / 付款条款：定金，余款在完成运输和安装之后结清。</p>
              <p>3. รูปภาพและตัวอย่างสินค้าในเอกสารนี้เป็นเพียงการอ้างอิง สินค้าจริงอาจมีความแตกต่างของสีและรายละเอียดเล็กน้อย</p>
              <p>4. เอกสารนี้มีอายุ 30 วันนับจากวันที่ออก / 报价有效期30天。</p>
            </div>

            <div className="pt-2 mb-2 text-[9.5px] text-[#6B6B6B]">
              <p className="font-semibold text-[#1A1A1A]">Bank Account (THB)</p>
              <p>Account name : FUTAI FURNITURE CO.,LTD. &nbsp; Account number : 100000301332239 (THB)</p>
              <p>Name of beneficiary bank : BANK OF CHINA (THAI) PCL &nbsp; Beneficiary Bank Code : 052</p>
              <p>Address : 179/4 BANGKOK CITY TOWER, SOUTH SATHORN RD, TUNGMAHAMEK, SATHORN, BANGKOK 10120</p>
              <p>SWIFT Code (Field 57) : BKCHTHBKXXX &nbsp; Correspondent Bank (Field 56A) For THB : BKCHCNBJXXX</p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[10px] text-[#6B6B6B] pt-2">
              <p className="whitespace-pre-line h-16">{"销售方（盖章）:\nผู้ขาย (ประทับตราบริษัท) :"}</p>
              <p className="whitespace-pre-line h-16">{"采购方（盖章）：\nผู้ซื้อ (ประทับตราบริษัท) :"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
