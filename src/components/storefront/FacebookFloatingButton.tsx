"use client";
import { useLanguage } from "@/store/language";

// Stacks above WeChat/LINE in the same floating column — was previously an
// inline icon in the homepage hero only, now available on every page.
export function FacebookFloatingButton() {
  const { t } = useLanguage();
  return (
    <a
      href="https://www.facebook.com/profile.php?id=61591265678222"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("ไปที่ Facebook", "Visit our Facebook", "访问我们的Facebook")}
      title={t("ไปที่ Facebook", "Visit our Facebook", "访问我们的Facebook")}
      className="fixed bottom-[172px] right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#1877F2] text-white shadow-lg hover:bg-[#145dbf] hover:scale-105 transition-all"
    >
      <svg viewBox="0 0 24 24" width={28} height={28} fill="currentColor" aria-hidden="true">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
      </svg>
    </a>
  );
}
