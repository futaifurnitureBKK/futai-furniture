import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductBySku } from "@/lib/products";

interface PageProps {
  params: Promise<{ sku: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { sku } = await params;
  const product = await getProductBySku(decodeURIComponent(sku));
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">แก้ไขสินค้า — {product.sku}</h1>
      <ProductForm mode="edit" product={product} />
    </div>
  );
}
