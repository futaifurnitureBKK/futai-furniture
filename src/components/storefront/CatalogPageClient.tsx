"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/store/language";

// react-pdf touches browser-only APIs (DOMMatrix, Path2D) at module scope,
// so it can't run during server rendering — load it client-only.
const CatalogFlipbook = dynamic(
  () => import("@/components/storefront/CatalogFlipbook").then((m) => m.CatalogFlipbook),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[60vh] text-[#999]">
        <Loader2 className="animate-spin" size={28} />
      </div>
    ),
  }
);

export function CatalogPageClient() {
  const { t } = useLanguage();

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-16">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center mb-8">
          <p className="text-[#C8102E] text-xs tracking-[0.3em] uppercase font-semibold mb-3">
            {t("แคตตาล็อกสินค้า", "Product Catalog", "产品目录")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
            {t("แคตตาล็อก ฟูไท่ เฟอร์นิเจอร์", "Futai Furniture Catalog", "富泰家具目录")}
          </h1>
        </div>

        <CatalogFlipbook />
      </div>
    </div>
  );
}
