import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["latin", "thai"],
  variable: "--font-sarabun",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ฟู่ไท เฟอร์นิเจอร์ | Futai Furniture",
  description:
    "เฟอร์นิเจอร์สำนักงานคุณภาพสูง — คลังสินค้าในไทย ติดตั้งฟรี บริการหลังขายจริง | Premium office furniture in Thailand",
  keywords: ["เฟอร์นิเจอร์สำนักงาน", "office furniture", "ฟู่ไท", "Futai"],
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${sarabun.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
