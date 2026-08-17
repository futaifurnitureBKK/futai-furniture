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
    <div className="bg-[#FAF7F2] h-[100dvh] pt-16 flex flex-col overflow-hidden">
      <div className="flex items-center justify-center py-2 shrink-0">
        <h1 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
          {t("แคตตาล็อก ฟูไท่ เฟอร์นิเจอร์", "Futai Furniture Catalog", "富泰家具目录")}
        </h1>
      </div>

      <div className="flex-1 min-h-0 px-2 sm:px-4">
        <CatalogFlipbook />
      </div>
    </div>
  );
}
