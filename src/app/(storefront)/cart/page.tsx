"use client";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/store/language";
import { FadeIn } from "@/components/animations/FadeIn";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, hasUnpricedItems } = useCart();
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16">
        <ShoppingBag size={64} className="text-[#E8E5E0] mb-6" />
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
          {t("ตะกร้าของคุณว่างเปล่า", "Your cart is empty", "您的购物车是空的")}
        </h1>
        <p className="text-[#6B6B6B] mb-8">
          {t("เพิ่มสินค้าที่ต้องการเพื่อดำเนินการต่อ", "Add some products to get started", "添加产品以继续")}
        </p>
        <Link
          href="/search"
          className={cn(buttonVariants(), "bg-[#C8102E] hover:bg-[#a30d25] text-white")}
        >
          {t("เลือกซื้อสินค้า", "Browse Products", "浏览产品")}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FadeIn>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-10">
            {t("ตะกร้าสินค้า", "Shopping Cart", "购物车")}
          </h1>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const variantImage = item.color
                ? item.product.color_variants?.find((v) => v.label_th === item.color!.label_th)?.images[0]
                : undefined;
              return (
              <FadeIn key={item.product.sku + (item.color?.label_th ?? "")}>
                <div className="bg-white rounded-xl p-4 flex gap-4 shadow-sm">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#FAF7F2] shrink-0">
                    <Image
                      src={variantImage ?? item.product.images[0]}
                      alt={t(item.product.name_th, item.product.name_en, item.product.name_zh)}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6B6B6B] font-mono">{item.product.sku}</p>
                    <p className="font-medium text-[#1A1A1A] text-sm leading-snug line-clamp-2">
                      {t(item.product.name_th, item.product.name_en, item.product.name_zh)}
                    </p>
                    {item.color && (
                      <p className="flex items-center gap-1.5 text-xs text-[#6B6B6B] mt-1">
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-[#E8E5E0]"
                          style={{ backgroundColor: item.color.hex }}
                        />
                        {t(item.color.label_th, item.color.label_en, item.color.label_zh)}
                      </p>
                    )}
                    <p className="text-xs text-[#C8102E] mt-1">
                      {t("ราคาตามใบเสนอราคา", "Price on quote", "价格以报价单为准")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <button
                      onClick={() => removeItem(item.product.sku, item.color?.label_th)}
                      className="text-[#6B6B6B] hover:text-red-500 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.sku, item.quantity - 1, item.color?.label_th)}
                        className="w-7 h-7 rounded border border-[#E8E5E0] flex items-center justify-center hover:bg-[#E8E5E0] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.sku, item.quantity + 1, item.color?.label_th)}
                        className="w-7 h-7 rounded border border-[#E8E5E0] flex items-center justify-center hover:bg-[#E8E5E0] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </FadeIn>
              );
            })}
          </div>

          {/* Summary */}
          <FadeIn delay={0.1}>
            <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-24">
              <h2 className="font-semibold text-[#1A1A1A] mb-4">
                {t("สรุปคำสั่งซื้อ", "Order Summary", "订单摘要")}
              </h2>
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>{t("จำนวนสินค้า", "Items", "商品数量")}</span>
                  <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[#1A1A1A] pt-3 border-t border-[#E8E5E0]">
                  <span>{t("ยอดรวม", "Total", "总计")}</span>
                  <span>
                    {hasUnpricedItems()
                      ? t("ตามใบเสนอราคา", "Per Quote", "以报价为准")
                      : `฿${(subtotal() ?? 0).toLocaleString()}`}
                  </span>
                </div>
              </div>
              {hasUnpricedItems() && (
                <p className="text-xs text-[#6B6B6B] bg-[#FAF7F2] p-3 rounded mb-4">
                  {t(
                    "มีสินค้าที่ยังไม่มีราคา ทีมงานจะติดต่อเพื่อแจ้งราคาหลังจากคุณส่งคำสั่งซื้อ",
                    "Some items have no price yet. Our team will confirm pricing after you submit.",
                    "部分商品尚未标价，提交后我们的团队会与您确认价格"
                  )}
                </p>
              )}
              <Link
                href="/checkout"
                className={cn(
                  buttonVariants(),
                  "w-full bg-[#C8102E] hover:bg-[#a30d25] text-white h-11 justify-center"
                )}
              >
                {hasUnpricedItems()
                  ? t("ส่งคำขอใบเสนอราคา", "Submit Quote Request", "提交报价申请")
                  : t("ดำเนินการชำระเงิน", "Proceed to Checkout", "前往结算")}
              </Link>
              <Link
                href="/search"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full mt-2 text-[#6B6B6B] justify-center"
                )}
              >
                {t("เลือกสินค้าเพิ่ม", "Continue Shopping", "继续购物")}
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
