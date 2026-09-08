"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, MapPin, Share2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/storefront/ProductCard";
import { QuoteModal } from "@/components/storefront/QuoteModal";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/store/language";
import { toast } from "sonner";
import type { Product } from "@/types";

export function ProductPageClient({ product, related }: { product: Product; related: Product[] }) {
  const { t, lang } = useLanguage();
  const { addItem } = useCart();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [activeVariant, setActiveVariant] = useState(-1); // -1 = no color picked yet
  const [activeSeat, setActiveSeat] = useState(-1); // -1 = no seat count picked yet
  const colorVariants = product.color_variants ?? [];
  // Order as configured in the admin (reorderable there), not auto-sorted —
  // lets the admin control the button order shown to customers.
  const seatVariants = product.seat_variants ?? [];

  // One combined strip: cover photo first, then every color's photos, then
  // every seat count's photos — all always visible, regardless of which
  // variant is currently picked. Each entry remembers which color/seat
  // count (if any) it belongs to, so picking a thumbnail also syncs the
  // matching selector, and vice versa.
  const galleryEntries = [
    { src: product.images[0], variantIndex: -1, seatIndex: -1 },
    ...colorVariants.flatMap((v, vi) => v.images.map((src) => ({ src, variantIndex: vi, seatIndex: -1 }))),
    ...seatVariants.flatMap((v, si) => v.images.map((src) => ({ src, variantIndex: -1, seatIndex: si }))),
  ];
  const galleryImages = galleryEntries.map((e) => e.src);

  function selectImage(i: number) {
    setActiveImg(i);
    setActiveVariant(galleryEntries[i].variantIndex);
    setActiveSeat(galleryEntries[i].seatIndex);
  }

  function selectVariant(idx: number) {
    const i = galleryEntries.findIndex((e) => e.variantIndex === idx);
    setActiveVariant(idx);
    setActiveImg(i >= 0 ? i : 0);
  }

  function selectSeat(idx: number) {
    const i = galleryEntries.findIndex((e) => e.seatIndex === idx);
    setActiveSeat(idx);
    if (i >= 0) setActiveImg(i);
  }

  const stockLabel: Record<string, string> = {
    in_stock: t("มีสินค้า", "In Stock", "有货"),
    out_of_stock: t("สินค้าหมด", "Out of Stock", "缺货"),
    on_order: t("สั่งจอง", "On Order", "预订"),
  };

  const stockColor: Record<string, string> = {
    in_stock: "bg-green-100 text-green-700",
    out_of_stock: "bg-red-100 text-red-700",
    on_order: "bg-[#C9A876]/20 text-[#7a6040]",
  };

  const handleAddToCart = () => {
    const variant = activeVariant >= 0 ? colorVariants[activeVariant] : undefined;
    const color = variant
      ? { label_th: variant.label_th, label_en: variant.label_en, label_zh: variant.label_zh, hex: variant.hex }
      : undefined;
    const seats = activeSeat >= 0 ? seatVariants[activeSeat].seats : undefined;
    addItem(product, 1, color, seats);
    toast.success(t("เพิ่มลงตะกร้าแล้ว", "Added to cart", "已加入购物车"));
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4 text-xs text-[#6B6B6B]">
        <Link href="/" className="hover:text-[#C8102E]">{t("หน้าแรก", "Home", "首页")}</Link>
        <span className="mx-2">›</span>
        <Link href={`/category/${product.category_slug}`} className="hover:text-[#C8102E]">
          {product.category_slug.replace(/-/g, " ")}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-[#1A1A1A]">{product.sku}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image gallery */}
          <FadeIn className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
              <Image
                src={galleryImages[activeImg] ?? galleryImages[0]}
                alt={t(product.name_th, product.name_en, product.name_zh)}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-4 transition-all duration-300"
                priority
              />
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => selectImage(i)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                      activeImg === i ? "border-[#C8102E]" : "border-transparent"
                    }`}
                  >
                    <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </FadeIn>

          {/* Product info */}
          <FadeIn delay={0.1} className="pt-2">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-xs font-mono text-[#6B6B6B] bg-[#E8E5E0] px-2 py-1 rounded">
                {product.sku}
              </p>
              <span className={`text-xs px-2 py-1 rounded font-medium ${stockColor[product.stock_status]}`}>
                {stockLabel[product.stock_status]}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] leading-tight mb-2">
              {t(product.name_th, product.name_en, product.name_zh)}
            </h1>
            {lang !== "en" && product.name_en && (
              <p className="text-[#6B6B6B] text-sm mb-6">
                {product.name_en}
              </p>
            )}

            {/* Dimensions */}
            <div className="bg-[#E8E5E0] rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-[#6B6B6B] mb-1">{t("ขนาด", "Dimensions", "尺寸")}</p>
              <p className="font-mono text-[#1A1A1A] font-medium">{product.dimensions}</p>
            </div>

            {/* Color variants */}
            {colorVariants.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#6B6B6B] mb-2">
                  {t("สี", "Color", "颜色")}
                  {activeVariant >= 0 && (
                    <span className="text-[#1A1A1A] font-medium ml-1">
                      : {t(
                          colorVariants[activeVariant].label_th,
                          colorVariants[activeVariant].label_en,
                          colorVariants[activeVariant].label_zh
                        )}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colorVariants.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectVariant(i)}
                      aria-label={t(v.label_th, v.label_en, v.label_zh)}
                      title={t(v.label_th, v.label_en, v.label_zh)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        activeVariant === i ? "border-[#C8102E] scale-110" : "border-white shadow-sm hover:scale-105"
                      }`}
                      style={{ backgroundColor: v.hex, outline: activeVariant === i ? "none" : "1px solid #E8E5E0" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Seat count variants */}
            {seatVariants.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#6B6B6B] mb-2">
                  {t("จำนวนที่นั่ง", "Seats", "座位数")}
                  {activeSeat >= 0 && (
                    <span className="text-[#1A1A1A] font-medium ml-1">
                      : {seatVariants[activeSeat].seats} {t("ที่นั่ง", "seats", "座")}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {seatVariants.map((v, i) => (
                    <button
                      key={v.seats}
                      type="button"
                      onClick={() => selectSeat(i)}
                      aria-label={`${v.seats} ${t("ที่นั่ง", "seats", "座")}`}
                      className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 transition-all ${
                        activeSeat === i
                          ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                          : "border-[#E8E5E0] text-[#6B6B6B] hover:border-[#C9A876]"
                      }`}
                    >
                      <User size={16} />
                      <span className="text-xs font-medium mt-0.5">{v.seats}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price / CTA — pricing is hidden storefront-wide (quote-only model) */}
            <div className="space-y-3 mb-8">
              <p className="text-[#6B6B6B] text-sm">
                {t(
                  "สินค้านี้ยังไม่แสดงราคา กรุณาขอใบเสนอราคา",
                  "Price on request — please fill in the quote form.",
                  "该产品暂未标价，请填写报价申请表"
                )}
              </p>
              <Button
                onClick={() => setQuoteOpen(true)}
                className="w-full h-12 bg-[#C8102E] hover:bg-[#a30d25] text-white text-base"
              >
                {t("ขอใบเสนอราคา", "Request Quote", "索取报价")}
              </Button>
              <Button
                onClick={handleAddToCart}
                disabled={
                  product.stock_status === "out_of_stock" ||
                  (colorVariants.length > 0 && activeVariant < 0) ||
                  (seatVariants.length > 0 && activeSeat < 0)
                }
                variant="outline"
                className="w-full h-11 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
              >
                <ShoppingCart size={16} className="mr-2" />
                {t("เพิ่มลงตะกร้า", "Add to Cart", "加入购物车")}
              </Button>
              {colorVariants.length > 0 && activeVariant < 0 && (
                <p className="text-xs text-[#C8102E]">{t("กรุณาเลือกสีก่อนเพิ่มลงตะกร้า", "Please pick a color before adding to cart", "请先选择颜色再加入购物车")}</p>
              )}
              {seatVariants.length > 0 && activeSeat < 0 && (
                <p className="text-xs text-[#C8102E]">{t("กรุณาเลือกจำนวนที่นั่งก่อนเพิ่มลงตะกร้า", "Please pick a seat count before adding to cart", "请先选择座位数再加入购物车")}</p>
              )}
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Showroom link */}
            <div className="mt-8 pt-6 border-t border-[#E8E5E0]">
              <Link
                href="/showroom"
                className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#C8102E] transition-colors"
              >
                <MapPin size={14} />
                {t("ดูสินค้าจริงที่โชว์รูม ตึกฟูไท่ ชั้น 4 →", "See in our showroom, Futai Building 4F →", "到富泰大厦4楼展厅看实物 →")}
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Description — full-width section below the gallery/info, Shopee-style */}
        {(product.description_th || product.description_en || product.description_zh) && (
          <FadeIn className="mt-16">
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-4 pb-4 border-b border-[#E8E5E0]">
                {t("รายละเอียดสินค้า", "Product Description", "产品详情")}
              </h2>
              <div
                className="prose prose-sm max-w-none text-[#6B6B6B] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t(product.description_th, product.description_en, product.description_zh) }}
              />
            </div>
          </FadeIn>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-20">
            <FadeIn>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">
                {t("สินค้าที่เกี่ยวข้อง", "Related Products", "相关产品")}
              </h2>
            </FadeIn>
            <StaggerChildren
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              stagger={0.07}
            >
              {related.map((p) => (
                <StaggerItem key={p.sku}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </StaggerChildren>
          </section>
        )}
      </div>

      <QuoteModal
        product={product}
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
      />
    </div>
  );
}
