import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CategoryPageClient } from "@/components/storefront/CategoryPageClient";
import { getCategoryBySlug, getProductsByCategory } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const title = `${category.name_th} | Futai Furniture`;
  const description = category.description_th || `เลือกซื้อ${category.name_th}คุณภาพสูง จากฟูไท่ เฟอร์นิเจอร์ คลังสินค้าในไทย ติดตั้งฟรี ออกใบกำกับภาษีได้`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/category/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      images: category.banner_url ? [category.banner_url] : undefined,
      type: "website",
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await getProductsByCategory(slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name_th,
        item: `${SITE_URL}/category/${category.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryPageClient category={category} products={products} />
    </>
  );
}
