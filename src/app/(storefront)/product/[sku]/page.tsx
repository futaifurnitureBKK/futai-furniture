"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingCart, MapPin, Share2 } from "lucide-react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCTS, getProductsByCategory } from "@/data/mock";
import { ProductCard } from "@/components/storefront/ProductCard";
import { QuoteModal } from "@/components/storefront/QuoteModal";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/store/language";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ sku: string }>;
}

export default function ProductPage({ params }: PageProps) {
  const { sku } = use(params);
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const product = PRODUCTS.find((p) => p.sku === sku);
  if (!product) notFound();

  const related = getProductsByCategory(product.category_slug)
    .filter((p) => p.sku !== sku)
    .slice(0, 4);

  const stockLabel: Record<string, string> = {
    in_stock: t("มีสินค้า", "In Stock"),
    out_of_stock: t("สินค้าหมด", "Out of Stock"),
    on_order: t("สั่งจอง", "On Order"),
  };

  const stockColor: Record<string, string> = {
    in_stock: "bg-green-100 text-green-700",
    out_of_stock: "bg-red-100 text-red-700",
    on_order: "bg-[#C9A876]/20 text-[#7a6040]",
  };

  const handleAddToCart = () => {
    addItem(product);
    toast.success(t("เพิ่มลงตะกร้าแล้ว", "Added to cart"));
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4 text-xs text-[#6B6B6B]">
        <Link href="/" className="hover:text-[#C8102E]">หน้าแรก</Link>
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
                src={product.images[activeImg] ?? product.images[0]}
                alt={product.name_th}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-4 transition-all duration-300"
                priority
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
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
              {t(product.name_th, product.name_en)}
            </h1>
            <p className="text-[#6B6B6B] text-sm mb-6">
              {t(product.name_en, product.name_th)}
            </p>

            {/* Dimensions */}
            <div className="bg-[#E8E5E0] rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-[#6B6B6B] mb-1">{t("ขนาด", "Dimensions")}</p>
              <p className="font-mono text-[#1A1A1A] font-medium">{product.dimensions}</p>
            </div>

            {/* Description */}
            <p className="text-[#6B6B6B] text-sm leading-relaxed mb-8">
              {t(product.description_th, product.description_en)}
            </p>

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

            {/* Price / CTA */}
            <div className="space-y-3">
              {product.price !== null ? (
                <>
                  <p className="text-3xl font-bold text-[#C8102E]">
                    ฿{product.price.toLocaleString()}
                  </p>
                  <Button
                    onClick={handleAddToCart}
                    disabled={product.stock_status === "out_of_stock"}
                    className="w-full h-12 bg-[#C8102E] hover:bg-[#a30d25] text-white text-base"
                  >
                    <ShoppingCart size={18} className="mr-2" />
                    {t("เพิ่มลงตะกร้า", "Add to Cart")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-[#6B6B6B] text-sm">
                    {t(
                      "สินค้านี้ยังไม่แสดงราคา กรุณาขอใบเสนอราคา",
                      "Price on request — please fill in the quote form."
                    )}
                  </p>
                  <Button
                    onClick={() => setQuoteOpen(true)}
                    className="w-full h-12 bg-[#C8102E] hover:bg-[#a30d25] text-white text-base"
                  >
                    {t("ขอใบเสนอราคา", "Request Quote")}
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    variant="outline"
                    className="w-full h-11 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    {t("เพิ่มลงตะกร้า", "Add to Cart")}
                  </Button>
                </>
              )}
            </div>

            {/* Showroom link */}
            <div className="mt-8 pt-6 border-t border-[#E8E5E0]">
              <Link
                href="/showroom"
                className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#C8102E] transition-colors"
              >
                <MapPin size={14} />
                {t("ดูสินค้าจริงที่โชว์รูม ตึกฟูไท่ ชั้น 4 →", "See in our showroom, Futai Building 4F →")}
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-20">
            <FadeIn>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">
                {t("สินค้าที่เกี่ยวข้อง", "Related Products")}
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
