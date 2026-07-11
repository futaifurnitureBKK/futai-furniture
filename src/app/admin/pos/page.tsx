"use client";
import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import {
  Search, Plus, Minus, Trash2, X, Printer,
  QrCode, FileText, CheckCircle2, User, Phone,
  Building2, ChevronDown, RotateCcw, ShoppingBag,
} from "lucide-react";
import { PRODUCTS, CATEGORIES } from "@/data/mock";
import type { Product } from "@/types";

/* ── PromptPay QR generator ─────────────────────────────── */
function crc16(s: string) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) c = (c & 0x8000) ? (c << 1) ^ 0x1021 : c << 1;
    c &= 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
function tlv(tag: string, val: string) {
  return `${tag}${val.length.toString().padStart(2, "0")}${val}`;
}
function promptPayQR(phone: string, amount: number) {
  const num = phone.replace(/\D/g, "").replace(/^0/, "66");
  const acc = tlv("00", "A000000677010111") + tlv("01", num);
  const base =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("29", acc) +
    tlv("53", "764") +
    tlv("54", amount.toFixed(2)) +
    tlv("58", "TH") +
    "6304";
  return base + crc16(base);
}

/* ── Config (เปลี่ยนเป็นข้อมูลจริงได้) ─────────────────── */
const PROMPTPAY_PHONE = "0812345678";
const BANK_NAME       = "กสิกรไทย (KBank)";
const BANK_ACCOUNT    = "XXX-X-XXXXX-X";
const ACCOUNT_NAME    = "บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด";

/* ── Types ───────────────────────────────────────────────── */
interface POSItem { product: Product; quantity: number }
type PayMethod = "transfer" | "quote";

/* ═══════════════════════════════════════════════════════════
   POS PAGE
═══════════════════════════════════════════════════════════ */
export default function POSPage() {
  const [query, setQuery]           = useState("");
  const [catFilter, setCatFilter]   = useState<string | null>(null);
  const [cart, setCart]             = useState<POSItem[]>([]);
  const [custName, setCustName]     = useState("");
  const [custCompany, setCustCompany] = useState("");
  const [custPhone, setCustPhone]   = useState("");
  const [payMethod, setPayMethod]   = useState<PayMethod | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [orderDone, setOrderDone]   = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  /* filtered products */
  const products = useMemo(() => PRODUCTS.filter((p) => {
    const matchCat = !catFilter || p.category_slug === catFilter;
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      p.name_th.toLowerCase().includes(q) ||
      p.name_en.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    return matchCat && matchQ;
  }), [query, catFilter]);

  /* cart helpers */
  const addItem = (product: Product) =>
    setCart((prev) => {
      const ex = prev.find((i) => i.product.sku === product.sku);
      return ex
        ? prev.map((i) => i.product.sku === product.sku ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1 }];
    });

  const changeQty = (sku: string, delta: number) =>
    setCart((prev) =>
      prev.map((i) => i.product.sku === sku ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
          .filter((i) => i.quantity > 0)
    );

  const removeItem = (sku: string) => setCart((prev) => prev.filter((i) => i.product.sku !== sku));

  /* totals */
  const itemCount   = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal   = cart.reduce((s, i) => s + (i.product.price ?? 0) * i.quantity, 0);
  const hasUnpriced = cart.some((i) => i.product.price === null);

  const openPayment = (method: PayMethod) => { setPayMethod(method); setShowModal(true); };
  const confirmPay  = () => setOrderDone(true);
  const handlePrint = () => window.print();
  const newOrder    = () => {
    setCart([]); setCustName(""); setCustCompany(""); setCustPhone("");
    setPayMethod(null); setShowModal(false); setOrderDone(false);
  };

  const qrPayload = promptPayQR(PROMPTPAY_PHONE, cartTotal);
  const orderNum  = `FT-${Date.now().toString().slice(-6)}`;

  /* ── RENDER ────────────────────────────────────────────── */
  return (
    <div className="flex gap-4 items-start h-[calc(100vh-8.5rem)]">

      {/* ── LEFT: Product browser ──────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 h-full overflow-hidden">

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="ค้นหา ชื่อสินค้า / SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E5E0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCatFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              !catFilter ? "bg-[#1A1A1A] text-white" : "bg-white border border-[#E8E5E0] text-[#6B6B6B] hover:border-[#1A1A1A]"
            }`}
          >
            ทั้งหมด ({PRODUCTS.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setCatFilter(cat.slug === catFilter ? null : cat.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                catFilter === cat.slug ? "bg-[#C8102E] text-white" : "bg-white border border-[#E8E5E0] text-[#6B6B6B] hover:border-[#C8102E]"
              }`}
            >
              {cat.name_th}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
            {products.map((p) => {
              const inCart = cart.find((i) => i.product.sku === p.sku);
              return (
                <button
                  key={p.sku}
                  onClick={() => addItem(p)}
                  className={`relative group bg-white rounded-xl border transition-all text-left overflow-hidden hover:shadow-md active:scale-95 ${
                    inCart ? "border-[#C8102E] ring-1 ring-[#C8102E]/30" : "border-[#E8E5E0] hover:border-[#C8102E]/40"
                  }`}
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-[#F5F3EF]">
                    {p.images[0] ? (
                      <Image src={p.images[0]} alt={p.name_th} fill sizes="150px" className="object-contain p-2" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={24} className="text-[#C8C5BE]" />
                      </div>
                    )}
                    {inCart && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#C8102E] text-white text-[10px] font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2">
                    <p className="text-[10px] text-[#9B9B9B] font-mono">{p.sku}</p>
                    <p className="text-xs text-[#1A1A1A] font-medium leading-snug line-clamp-2 mt-0.5">{p.name_th}</p>
                    <p className="text-xs font-semibold mt-1 text-[#C8102E]">
                      {p.price ? `฿${p.price.toLocaleString()}` : "ตามใบเสนอ"}
                    </p>
                  </div>
                  {/* Add overlay */}
                  <div className="absolute inset-0 bg-[#C8102E]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus size={20} className="text-[#C8102E] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
            {products.length === 0 && (
              <div className="col-span-full text-center py-16 text-[#6B6B6B]">
                <Search size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">ไม่พบสินค้า</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Cart ────────────────────────────────── */}
      <div className="w-[340px] shrink-0 flex flex-col h-full bg-white rounded-xl border border-[#E8E5E0] overflow-hidden">

        {/* Cart header */}
        <div className="px-4 py-3 border-b border-[#E8E5E0] flex items-center justify-between">
          <span className="font-semibold text-[#1A1A1A] text-sm">รายการสั่งซื้อ</span>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-[#9B9B9B] hover:text-red-500 flex items-center gap-1">
              <RotateCcw size={11} /> ล้าง
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#C8C5BE] py-10">
              <ShoppingBag size={36} className="mb-2" />
              <p className="text-xs">กดสินค้าเพื่อเพิ่มในรายการ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product.sku} className="flex gap-2 items-center py-2 border-b border-[#F0EDE8] last:border-0">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#F5F3EF] shrink-0">
                    {item.product.images[0] && (
                      <Image src={item.product.images[0]} alt={item.product.name_th} fill sizes="40px" className="object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#1A1A1A] line-clamp-1">{item.product.name_th}</p>
                    <p className="text-[10px] text-[#9B9B9B]">{item.product.sku}</p>
                    {item.product.price ? (
                      <p className="text-xs text-[#C8102E] font-semibold">฿{(item.product.price * item.quantity).toLocaleString()}</p>
                    ) : (
                      <p className="text-[10px] text-[#C8102E]">ตามใบเสนอ</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => changeQty(item.product.sku, -1)} className="w-6 h-6 rounded-md border border-[#E8E5E0] flex items-center justify-center hover:bg-[#FAF7F2] text-[#6B6B6B]">
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                    <button onClick={() => changeQty(item.product.sku, 1)} className="w-6 h-6 rounded-md border border-[#E8E5E0] flex items-center justify-center hover:bg-[#FAF7F2] text-[#6B6B6B]">
                      <Plus size={11} />
                    </button>
                    <button onClick={() => removeItem(item.product.sku)} className="w-6 h-6 ml-1 rounded-md flex items-center justify-center hover:text-red-500 text-[#C8C5BE]">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer info */}
        <div className="px-3 py-3 border-t border-[#E8E5E0] space-y-2">
          <p className="text-xs font-medium text-[#6B6B6B] flex items-center gap-1.5"><User size={11} />ข้อมูลลูกค้า</p>
          <input
            placeholder="ชื่อลูกค้า"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-[#E8E5E0] rounded-lg focus:outline-none focus:border-[#C8102E]"
          />
          <div className="flex gap-2">
            <input
              placeholder="บริษัท"
              value={custCompany}
              onChange={(e) => setCustCompany(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-[#E8E5E0] rounded-lg focus:outline-none focus:border-[#C8102E]"
            />
            <input
              placeholder="เบอร์โทร"
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-[#E8E5E0] rounded-lg focus:outline-none focus:border-[#C8102E]"
            />
          </div>
        </div>

        {/* Total + Payment */}
        <div className="px-4 py-3 border-t border-[#E8E5E0] space-y-3 bg-[#FAFAFA]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#6B6B6B]">{itemCount} รายการ</span>
            <span className="text-lg font-bold text-[#1A1A1A]">
              {hasUnpriced ? "ตามใบเสนอราคา" : `฿${cartTotal.toLocaleString()}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={cart.length === 0}
              onClick={() => openPayment("transfer")}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#1A2F5E] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#152448] transition-colors"
            >
              <QrCode size={14} /> โอนเงิน / QR
            </button>
            <button
              disabled={cart.length === 0}
              onClick={() => openPayment("quote")}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#C8102E] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#a30d25] transition-colors"
            >
              <FileText size={14} /> ใบเสนอราคา
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E5E0]">
              <h2 className="font-semibold text-[#1A1A1A]">
                {payMethod === "transfer" ? "ชำระเงินโอน / PromptPay" : "สร้างใบเสนอราคา"}
              </h2>
              {!orderDone && (
                <button onClick={() => setShowModal(false)} className="text-[#6B6B6B] hover:text-[#1A1A1A]">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal content */}
            <div className="p-6" ref={receiptRef}>

              {/* ── Order done ── */}
              {orderDone ? (
                <div className="text-center py-4">
                  <CheckCircle2 size={56} className="mx-auto text-green-500 mb-3" />
                  <p className="font-semibold text-[#1A1A1A] text-lg mb-1">
                    {payMethod === "transfer" ? "บันทึกการรับเงินแล้ว" : "สร้างใบเสนอราคาแล้ว"}
                  </p>
                  <p className="text-sm text-[#6B6B6B] mb-1">เลขที่: {orderNum}</p>
                  {custName && <p className="text-sm text-[#6B6B6B]">ลูกค้า: {custName}</p>}
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handlePrint}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#E8E5E0] rounded-lg text-sm text-[#1A1A1A] hover:bg-[#FAF7F2]"
                    >
                      <Printer size={15} /> พิมพ์ใบเสร็จ
                    </button>
                    <button
                      onClick={newOrder}
                      className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333]"
                    >
                      รายการใหม่
                    </button>
                  </div>
                </div>

              ) : payMethod === "transfer" ? (
                /* ── Transfer / QR payment ── */
                <div className="space-y-4">
                  {/* QR code */}
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-xl border-2 border-[#1A2F5E] inline-block">
                      <QRCode value={qrPayload} size={180} />
                    </div>
                  </div>
                  {/* Amount */}
                  {!hasUnpriced && (
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[#1A2F5E]">฿{cartTotal.toLocaleString()}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">PromptPay: {PROMPTPAY_PHONE}</p>
                    </div>
                  )}
                  {/* Bank info */}
                  <div className="bg-[#F5F7FF] rounded-xl p-4 text-sm space-y-1">
                    <p className="text-[#6B6B6B] text-xs font-medium uppercase tracking-wide">ข้อมูลบัญชี</p>
                    <p className="font-semibold text-[#1A1A1A]">{BANK_NAME}</p>
                    <p className="text-[#1A1A1A]">{BANK_ACCOUNT}</p>
                    <p className="text-[#6B6B6B] text-xs">{ACCOUNT_NAME}</p>
                  </div>
                  {/* Order summary */}
                  <div className="text-xs text-[#6B6B6B] space-y-1 border-t border-[#E8E5E0] pt-3">
                    {cart.map((i) => (
                      <div key={i.product.sku} className="flex justify-between">
                        <span className="truncate mr-2">{i.product.name_th} ×{i.quantity}</span>
                        <span>{i.product.price ? `฿${(i.product.price * i.quantity).toLocaleString()}` : "-"}</span>
                      </div>
                    ))}
                    {!hasUnpriced && (
                      <div className="flex justify-between font-semibold text-[#1A1A1A] pt-1 border-t border-[#E8E5E0]">
                        <span>ยอดรวม</span>
                        <span>฿{cartTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={confirmPay}
                    className="w-full py-3 bg-[#1A2F5E] text-white rounded-xl font-medium text-sm hover:bg-[#152448] transition-colors"
                  >
                    ยืนยันรับเงินแล้ว
                  </button>
                </div>

              ) : (
                /* ── Quote ── */
                <div className="space-y-4">
                  {/* Quote header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-[#1A2F5E] text-lg">ใบเสนอราคา</p>
                      <p className="text-xs text-[#6B6B6B]">เลขที่: {orderNum}</p>
                      <p className="text-xs text-[#6B6B6B]">วันที่: {new Date().toLocaleDateString("th-TH", { year:"numeric", month:"long", day:"numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A1A1A]">ฟูไท่ เฟอร์นิเจอร์</p>
                      <p className="text-[10px] text-[#6B6B6B]">บริษัท ฟูไท่ เฟอร์นิเจอร์ จำกัด</p>
                    </div>
                  </div>
                  {/* Customer */}
                  {(custName || custCompany) && (
                    <div className="bg-[#FAF7F2] rounded-lg p-3 text-sm">
                      <p className="font-medium text-[#1A1A1A]">{custName}</p>
                      {custCompany && <p className="text-xs text-[#6B6B6B]">{custCompany}</p>}
                      {custPhone && <p className="text-xs text-[#6B6B6B]">{custPhone}</p>}
                    </div>
                  )}
                  {/* Items */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E5E0] text-[#6B6B6B]">
                        <th className="text-left py-1.5 font-medium">รายการ</th>
                        <th className="text-center py-1.5 font-medium w-10">จำนวน</th>
                        <th className="text-right py-1.5 font-medium w-20">ราคา</th>
                        <th className="text-right py-1.5 font-medium w-20">รวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((i) => (
                        <tr key={i.product.sku} className="border-b border-[#F0EDE8]">
                          <td className="py-1.5">
                            <p className="font-medium text-[#1A1A1A] leading-snug">{i.product.name_th}</p>
                            <p className="text-[#9B9B9B]">{i.product.sku}</p>
                          </td>
                          <td className="text-center py-1.5">{i.quantity}</td>
                          <td className="text-right py-1.5">{i.product.price ? `฿${i.product.price.toLocaleString()}` : "TBD"}</td>
                          <td className="text-right py-1.5 font-medium">{i.product.price ? `฿${(i.product.price * i.quantity).toLocaleString()}` : "TBD"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-right pt-2 font-semibold text-[#1A1A1A]">ยอดรวม</td>
                        <td className="text-right pt-2 font-bold text-[#C8102E]">
                          {hasUnpriced ? "ตามสอบถาม" : `฿${cartTotal.toLocaleString()}`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  <p className="text-[10px] text-[#9B9B9B]">* ราคานี้มีผลภายใน 30 วัน / Valid for 30 days</p>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#E8E5E0] rounded-lg text-sm text-[#1A1A1A] hover:bg-[#FAF7F2]"
                    >
                      <Printer size={15} /> พิมพ์ / Export
                    </button>
                    <button
                      onClick={confirmPay}
                      className="flex-1 py-2.5 bg-[#C8102E] text-white rounded-xl font-medium text-sm hover:bg-[#a30d25]"
                    >
                      บันทึกใบเสนอ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

