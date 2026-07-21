import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductPageClient } from "@/components/storefront/ProductPageClient";
import { getProductBySku, getProductsByCategory } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

interface PageProps {
  params: Promise<{ sku: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sku } = await params;
  const product = await getProductBySku(sku);
  if (!product) return {};

  const title = `${product.name_th} | Futai Furniture`;
  const description = product.description_th || `${product.name_th} — เฟอร์นิเจอร์สำนักงานคุณภาพสูง จากฟูไท่ เฟอร์นิเจอร์ คลังสินค้าในไทย ติดตั้งฟรี`;
  const image = product.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { sku } = await params;
  const product = await getProductBySku(sku);
  if (!product || !product.is_active) notFound();

  const related = (await getProductsByCategory(product.category_slug))
    .filter((p) => p.sku !== sku)
    .slice(0, 4);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_th,
    description: product.description_th,
    sku: product.sku,
    image: product.images,
    brand: { "@type": "Brand", name: "Futai Furniture" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.sku}`,
      // Pricing is hidden storefront-wide (quote-only model) — no price field.
      availability:
        product.stock_status === "in_stock"
          ? "https://schema.org/InStock"
          : product.stock_status === "on_order"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductPageClient product={product} related={related} />
    </>
  );
}
