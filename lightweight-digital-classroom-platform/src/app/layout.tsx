import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { NetworkProvider } from "@/components/NetworkContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "পাঠশালা ডিজিটাল | Pathshala Digital Classroom",
  description:
    "Lightweight online classroom designed for reliable learning on low-bandwidth connections in Bangladesh.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn" className={`${inter.variable} ${notoBengali.variable}`}>
      <body
        className="min-h-screen bg-[#fafaf7] text-[#182026] antialiased"
        style={{ fontFamily: "var(--font-bengali), var(--font-inter), sans-serif" }}
      >
        <I18nProvider initialLang="bn">
          <NetworkProvider>{children}</NetworkProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
