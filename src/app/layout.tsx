import type { Metadata } from "next";
import "./globals.css";
import Toaster from "@/components/Toaster";

export const metadata: Metadata = {
  title: { default: "VietMart - Mua sắm online giá tốt", template: "%s | VietMart" },
  description: "VietMart - Sàn thương mại điện tử: điện thoại, laptop, thời trang, làm đẹp, bách hóa. Thanh toán VNPAY, COD. Giao nhanh toàn quốc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
