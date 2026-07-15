import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductPageClient } from "@/components/storefront/ProductPageClient";
import { getProductBySku, getProductsByCategory } from "@/lib/products";

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

  return <ProductPageClient product={product} related={related} />;
}
