import { Navbar } from "@/components/storefront/Navbar";
import { Footer } from "@/components/storefront/Footer";
import { LineFloatingButton } from "@/components/storefront/LineFloatingButton";
import { WeChatFloatingButton } from "@/components/storefront/WeChatFloatingButton";
import { FacebookFloatingButton } from "@/components/storefront/FacebookFloatingButton";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FacebookFloatingButton />
      <WeChatFloatingButton />
      <LineFloatingButton />
    </>
  );
}
