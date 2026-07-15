import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">เพิ่มสินค้าใหม่</h1>
      <ProductForm mode="new" />
    </div>
  );
}
