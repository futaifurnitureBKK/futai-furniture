"use client";
import { useState } from "react";
import Image from "next/image";
import { QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/store/language";

// WeChat has no web deep-link like LINE does — the only way in is scanning
// a QR code, so this opens a popup with it instead of linking straight out.
export function WeChatFloatingButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("แชทผ่าน WeChat", "Chat on WeChat", "通过微信联系")}
        title={t("แชทผ่าน WeChat", "Chat on WeChat", "通过微信联系")}
        className="fixed bottom-24 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#07C160] text-white shadow-lg hover:bg-[#06ad55] hover:scale-105 transition-all"
      >
        <QrCode size={26} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>{t("เพิ่มเพื่อนทาง WeChat", "Add us on WeChat", "添加微信好友")}</DialogTitle>
          </DialogHeader>
          <Image
            src="/wechat-qr.jpg"
            alt="WeChat QR code"
            width={500}
            height={600}
            className="w-full h-auto rounded-lg border border-[#E8E5E0]"
          />
          <p className="text-xs text-[#9CA3AF] mt-2">
            {t(
              "เปิดแอป WeChat แล้วสแกน QR นี้เพื่อเพิ่มเพื่อน",
              "Open the WeChat app and scan this QR code to add us",
              "打开微信App扫描此二维码添加好友"
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
