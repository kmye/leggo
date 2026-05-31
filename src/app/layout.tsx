import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BmcWidget } from "@/components/bmc-widget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leggo Together",
  description: "Plan your trips day by day",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
    <head>
      <BmcWidget />
    </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}

      </body>
    </html>
  );
}
