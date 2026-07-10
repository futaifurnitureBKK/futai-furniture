import { notFound } from "next/navigation";
import Image from "next/image";
import { CATEGORIES, getProductsByCategory } from "@/data/mock";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const products = getProductsByCategory(slug);

  return (
    <div className="bg-[#FAF7F2]">
      {/* Banner */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        <Image
          src={category.banner_url}
          alt={category.name_th}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#1A1A1A]/55 flex flex-col items-center justify-center text-center px-4">
          <FadeIn>
            <p className="text-[#C9A876] text-xs tracking-[0.3em] uppercase mb-2 font-light">
              Futai Furniture
            </p>
            <h1 className="text-white text-3xl sm:text-4xl font-bold">
              {category.name_th}
            </h1>
            <p className="text-white/70 text-sm mt-1">{category.name_en}</p>
          </FadeIn>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-[#6B6B6B]">
        <span>หน้าแรก</span>
        <span className="mx-2">›</span>
        <span className="text-[#1A1A1A]">{category.name_th}</span>
      </div>

      {/* Products grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <FadeIn>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#6B6B6B]">
              {products.length} รายการ
            </p>
          </div>
        </FadeIn>

        {products.length === 0 ? (
          <div className="text-center py-24 text-[#6B6B6B]">
            <p className="text-lg">ไม่พบสินค้าในหมวดหมู่นี้</p>
            <p className="text-sm mt-2">กำลังเพิ่มสินค้าเร็วๆ นี้</p>
          </div>
        ) : (
          <StaggerChildren
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            stagger={0.05}
          >
            {products.map((product) => (
              <StaggerItem key={product.sku}>
                <ProductCard product={product} />
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </div>
    </div>
  );
}
