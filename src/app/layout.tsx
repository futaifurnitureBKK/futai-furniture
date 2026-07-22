import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL, SITE_NAME } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: "ฟูไท่ เฟอร์นิเจอร์ | Futai Furniture — เฟอร์นิเจอร์สำนักงานนำเข้าจากจีน",
  description:
    "Futai Furniture (ฟูไท่ เฟอร์นิเจอร์) นำเข้าและจัดจำหน่ายเฟอร์นิเจอร์สำนักงานคุณภาพสูงจากจีน คลังสินค้าในไทย ติดตั้งฟรีทั่วประเทศ บริการหลังการขายจริง | Futai Furniture imports and distributes premium office furniture from China — in-stock in Thailand, free nationwide installation.",
  keywords: [
    "เฟอร์นิเจอร์สำนักงาน",
    "office furniture",
    "ฟูไท่",
    "Futai",
    "Futai Furniture",
    "เฟอร์นิเจอร์จากจีน",
    "furniture from China",
    "China office furniture",
    "นำเข้าเฟอร์นิเจอร์จีน",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "ฟูไท่ เฟอร์นิเจอร์ | Futai Furniture — เฟอร์นิเจอร์สำนักงานนำเข้าจากจีน",
    description:
      "นำเข้าและจัดจำหน่ายเฟอร์นิเจอร์สำนักงานคุณภาพสูงจากจีน คลังสินค้าในไทย ติดตั้งฟรีทั่วประเทศ",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Futai Furniture — เฟอร์นิเจอร์สำนักงานนำเข้าจากจีน",
    description: "นำเข้าและจัดจำหน่ายเฟอร์นิเจอร์สำนักงานคุณภาพสูงจากจีน คลังสินค้าในไทย ติดตั้งฟรีทั่วประเทศ",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/icon.png",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Futai Furniture",
  alternateName: "ฟูไท่ เฟอร์นิเจอร์",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Futai Furniture นำเข้าและจัดจำหน่ายเฟอร์นิเจอร์สำนักงานคุณภาพสูงจากจีน คลังสินค้าในไทย ติดตั้งฟรีทั่วประเทศ",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ตึกฟูไท่ ชั้น 4 คลอง 8",
    addressLocality: "ลำลูกกา",
    addressRegion: "ปทุมธานี",
    addressCountry: "TH",
  },
  telephone: "+66638261333",
  sameAs: ["https://line.me/ti/p/KJFKqUTMk-"],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
