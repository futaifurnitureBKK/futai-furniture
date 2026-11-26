import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductPageClient } from "@/components/storefront/ProductPageClient";
import { getProductBySku, getProductsByCategory, getCategoryBySlug } from "@/lib/products";
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
    alternates: {
      canonical: `${SITE_URL}/product/${product.sku}`,
    },
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

  const [related, category] = await Promise.all([
    getProductsByCategory(product.category_slug).then((products) =>
      products.filter((p) => p.sku !== sku).slice(0, 4)
    ),
    getCategoryBySlug(product.category_slug),
  ]);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: category.name_th,
              item: `${SITE_URL}/category/${category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: category ? 3 : 2,
        name: product.name_th,
        item: `${SITE_URL}/product/${product.sku}`,
      },
    ],
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductPageClient product={product} related={related} />
    </>
  );
}
