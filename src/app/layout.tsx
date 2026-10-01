import type { Metadata } from "next";
import { Cairo, Great_Vibes } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

const script = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Glowy Clinic & Beauty",
  description: "نظام إدارة الحجوزات والمدفوعات وتسوية الخبيرات — Glowy",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${script.variable} h-full`}
    >
      <body className="min-h-full font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
