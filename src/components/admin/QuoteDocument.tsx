import Image from "next/image";
import type { SavedQuote, SavedQuoteDocType } from "@/types";

// A read-only, print-ready rendering of one saved quotation/invoice/delivery
// note — used for the "download selected as one PDF" batch export on the
// quote-builder list. Deliberately a standalone copy of the live editor's
// print-area markup (quote-builder/page.tsx) rather than a shared import:
// the editor's version is tightly wired to dozens of pieces of live editing
// state (including one still-editable field, the company phone number), and
// reusing it here would mean threading a read-only/editable split through
// that already-large component. This copy only ever renders saved,
// finalized documents, so it carries no editable inputs at all.

type LangMode = "th-en-zh" | "th-en" | "th-zh";

interface TriText {
  th: string;
  en: string;
  zh: string;
}

const DOC_LABELS: Record<SavedQuoteDocType, TriText> = {
  quotation: { th: "ใบเสนอราคา", en: "QUOTATION", zh: "报价单" },
  invoice: { th: "ใบแจ้งหนี้", en: "INVOICE", zh: "发票" },
  delivery_note: { th: "ใบส่งของ", en: "DELIVERY NOTE", zh: "送货单" },
};

const DOC_NO_LABELS: Record<SavedQuoteDocType, TriText> = {
  quotation: { th: "เลขที่ใบเสนอราคา", en: "Quotation No", zh: "报价单号" },
  invoice: { th: "เลขที่ใบแจ้งหนี้", en: "Invoice No", zh: "发票号码" },
  delivery_note: { th: "เลขที่ใบส่งของ", en: "DN No.", zh: "送货单号" },
};

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
  address: { th: "ที่อยู่", en: "Address", zh: "地址" },
  tel: { th: "โทรศัพท์", en: "Tel", zh: "电话" },
  web: { th: "เว็บไซต์", en: "Website", zh: "网站" },
  email: { th: "อีเมล", en: "Email", zh: "邮箱" },
  taxId: { th: "เลขผู้เสียภาษี", en: "Tax ID", zh: "纳税人识别号" },
  date: { th: "วันที่", en: "Date", zh: "日期" },
  customer: { th: "ลูกค้า", en: "Customer", zh: "客户" },
  shipAddress: { th: "ที่อยู่จัดส่ง", en: "Delivery Address", zh: "发货地址" },
  shipDate: { th: "วันที่จัดส่ง", en: "Delivery Date", zh: "发货日期" },
  shipContact: { th: "บุคคลที่ติดต่อ", en: "Contact Person", zh: "联系人" },
  shipPhone: { th: "หมายเลขโทรศัพท์", en: "Phone", zh: "电话" },
  colNo: { th: "ลำดับ", en: "No.", zh: "序号" },
  colItem: { th: "ชื่อสินค้า", en: "Item", zh: "品名" },
  colModel: { th: "แบบอย่าง", en: "Model", zh: "型号" },
  colPhoto: { th: "ภาพ", en: "Photo", zh: "图片" },
  colSize: { th: "ขนาด (mm)", en: "Size (mm)", zh: "规格" },
  colQty: { th: "ปริมาณ", en: "Qty", zh: "数量" },
  colUnit: { th: "หน่วย", en: "Unit", zh: "单位" },
  colUnitPrice: { th: "ราคาต่อหน่วย", en: "Unit Price", zh: "单价" },
  colAmount: { th: "จำนวนเงินทั้งหมด", en: "Amount", zh: "总价" },
  colRemark: { th: "หมายเหตุ", en: "Remark", zh: "备注" },
  subtotal: { th: "รวมเป็นเงิน / รวมราคาสินค้า", en: "Subtotal", zh: "小计" },
  discount: { th: "หัก ส่วนลด", en: "Discount", zh: "折扣" },
  afterDiscount: { th: "ราคาหลังหักส่วนลด / ยอดรวมก่อนภาษี", en: "Total after discount (before VAT)", zh: "折扣后金额（税前）" },
  vatAmountLabel: { th: "ภาษีมูลค่าเพิ่ม", en: "VAT", zh: "增值税" },
  grandTotal: { th: "ราคารวมทั้งสิ้น / ยอดรวมสุทธิ", en: "Grand Total", zh: "总价" },
  depositAmount: { th: "เงินมัดจำ", en: "Deposit", zh: "定金" },
  balance: { th: "ยอดคงเหลือหลังจัดส่งและติดตั้ง", en: "Balance", zh: "余款" },
  sellerSign: { th: "ผู้ขาย (ประทับตราบริษัท)", en: "Seller (Company Stamp)", zh: "销售方（盖章）" },
  buyerSign: { th: "ผู้ซื้อ (ประทับตราบริษัท)", en: "Buyer (Company Stamp)", zh: "采购方（盖章）" },
  receiverSign: { th: "ลายเซ็นผู้รับสินค้า", en: "Received By", zh: "收货人签名" },
  senderSign: { th: "ลายเซ็นผู้ส่งของ", en: "Delivered By", zh: "送货人签名" },
} satisfies Record<string, TriText>;

function joinLang(langMode: LangMode, t: TriText): string {
  if (langMode === "th-en-zh") return `${t.th} / ${t.en} / ${t.zh}`;
  if (langMode === "th-en") return `${t.th} / ${t.en}`;
  return `${t.th} / ${t.zh}`;
}

function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number) {
  return Number(n.toFixed(2));
}

export function QuoteDocument({ quote }: { quote: SavedQuote }) {
  const langMode = quote.lang_mode as LangMode;
  const L = (t: TriText) => joinLang(langMode, t);
  const isDeliveryNote = quote.doc_type === "delivery_note";
  const doc = DOC_LABELS[quote.doc_type];
  const docSubLine = langMode === "th-en-zh" ? `${doc.en} / ${doc.zh}` : langMode === "th-en" ? doc.en : doc.zh;
  const companyLines = [
    { key: "en", text: COMPANY.nameEn, show: langMode !== "th-zh" },
    { key: "zh", text: COMPANY.nameZh, show: langMode !== "th-en" },
  ].filter((l) => l.show);

  const items = quote.items;
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const discountAmount = subtotal * (quote.discount_pct / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vatAmount = subtotalAfterDiscount * (quote.vat_pct / 100);
  const grandTotal = subtotalAfterDiscount + vatAmount;
  const depositAmount = grandTotal * (quote.deposit_pct / 100);
  const balanceAmount = grandTotal - depositAmount;

  return (
    <div className="bg-white text-[11px] text-[#1A1A1A] leading-snug p-6 mx-auto" style={{ maxWidth: 794 }}>
      <table className="w-full border-collapse mb-0">
        <tbody>
          <tr>
            <td rowSpan={companyLines.length} className="w-[80px] align-top pt-1">
              <Image src="/icon.png" alt="Futai" width={60} height={60} className="rounded" priority />
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
            <td colSpan={4}>{quote.doc_date}</td>
            <td colSpan={3} className="text-right pr-1">
              <span className="whitespace-nowrap">{L(DOC_NO_LABELS[quote.doc_type])}</span>{" "}
              <span className="font-mono">{quote.doc_no}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.customer)}:</td>
            <td colSpan={7}>{quote.customer_name || "-"}</td>
          </tr>
          {!isDeliveryNote && (
            <>
              <tr>
                <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.address)} :</td>
                <td colSpan={7}>{quote.customer_address || "-"}</td>
              </tr>
              <tr>
                <td colSpan={2} className="whitespace-nowrap pr-1">{L(TXT.taxId)}:</td>
                <td colSpan={7}>{quote.customer_tax_id || "-"}</td>
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
            <tr key={it.item_id || idx} className="text-center">
              <td className="border border-[#1A1A1A] p-1">{idx + 1}</td>
              <td className="border border-[#1A1A1A] p-1 text-left">{it.name || "-"}</td>
              <td className="border border-[#1A1A1A] p-1 font-mono">{it.sku || "-"}</td>
              <td className="border border-[#1A1A1A] p-1">
                {it.image ? (
                  <div className="relative w-full h-16 mx-auto">
                    <Image src={it.image} alt="" fill sizes="90px" className="object-contain" priority />
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
                    <Image src={it.remarkImage} alt="" fill sizes="90px" className="object-contain" priority />
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
            {quote.discount_pct > 0 && (
              <>
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#C8102E]">{L(TXT.discount)} ({fmtPct(quote.discount_pct)}%)</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#C8102E]">-฿{fmtMoney(discountAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.afterDiscount)}</td>
                  <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(subtotalAfterDiscount)}</td>
                </tr>
              </>
            )}
            <tr>
              <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.vatAmountLabel)} ({quote.vat_pct}%)</td>
              <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-medium text-[#1A1A1A]">฿{fmtMoney(vatAmount)}</td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-[#1A1A1A] p-1 font-bold text-[#1A1A1A]">{L(TXT.grandTotal)}</td>
              <td colSpan={2} className="border border-[#1A1A1A] p-1 text-right font-bold text-[#1A1A1A]">฿{fmtMoney(grandTotal)}</td>
            </tr>
            {quote.deposit_pct > 0 && (
              <>
                <tr>
                  <td colSpan={8} className="border border-[#1A1A1A] p-1 text-[#1A1A1A]">{L(TXT.depositAmount)} ({quote.deposit_pct}%)</td>
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

      <table className="w-full border-collapse mb-2 text-[10px]">
        <tbody>
          <tr>
            <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap align-top">{L(TXT.shipAddress)}：</td>
            <td colSpan={3} className="border border-[#1A1A1A] p-1 align-top">{quote.shipping_address || "-"}</td>
            <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap align-top">{L(TXT.shipDate)}：</td>
            <td colSpan={2} className="border border-[#1A1A1A] p-1 align-top">{quote.shipping_date || "-"}</td>
          </tr>
          <tr>
            <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap">{L(TXT.shipContact)}：</td>
            <td colSpan={3} className="border border-[#1A1A1A] p-1">{quote.contact_person || "-"}</td>
            <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap">{L(TXT.shipPhone)}：</td>
            <td colSpan={2} className="border border-[#1A1A1A] p-1 whitespace-nowrap">{quote.contact_phone || "-"}</td>
          </tr>
        </tbody>
      </table>

      {!isDeliveryNote && (
        <>
          <div className="mb-2 text-[9.5px] text-[#1A1A1A] border border-[#1A1A1A]">
            <p className="font-semibold text-center py-1" style={{ backgroundColor: "#F8CAAC" }}>TERMS OF SALE AND OTHER COMMENTS</p>
            <div className="p-1.5 space-y-0.5">
              {(quote.terms_text || "").split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
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
        </>
      )}

      {isDeliveryNote ? (
        <div className="grid grid-cols-2 gap-8 text-[10px] text-[#1A1A1A] pt-2">
          <p className="whitespace-pre-line h-16">{L(TXT.senderSign)} :</p>
          <p className="whitespace-pre-line h-16">{L(TXT.receiverSign)} :</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-8 text-[10px] text-[#1A1A1A] pt-2">
          <p className="whitespace-pre-line h-16">{L(TXT.sellerSign)} :</p>
          <p className="whitespace-pre-line h-16">{L(TXT.buyerSign)} :</p>
        </div>
      )}
    </div>
  );
}
