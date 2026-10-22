"use client";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/store/language";

// Persistent chat entry point on every storefront page — most customers
// already reach out over LINE, so this skips the "fill the quote form,
// wait" step for anyone who just wants to ask something quick.
export function LineFloatingButton() {
  const { t } = useLanguage();
  return (
    <a
      href="https://line.me/ti/p/KJFKqUTMk-"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("แชทผ่าน LINE", "Chat on LINE", "通过LINE聊天")}
      title={t("แชทผ่าน LINE", "Chat on LINE", "通过LINE聊天")}
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#06C755] text-white shadow-lg hover:bg-[#05b34d] hover:scale-105 transition-all"
    >
      <MessageCircle size={28} />
    </a>
  );
}
