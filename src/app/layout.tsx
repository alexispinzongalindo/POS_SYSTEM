import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import GlobalLangToggle from "@/components/GlobalLangToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IslaPOS",
  description: "All-in-one POS for Puerto Rico restaurants. IVU-ready setup, fast onboarding, and real support.",
  icons: {
    icon: [
      { url: '/islapos-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/islapos-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/islapos-icon-192.png', sizes: '192x192', type: 'image/png' }],
    shortcut: [{ url: '/islapos-icon-32.png', sizes: '32x32', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`islapos-marketing ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalLangToggle />
        {children}
      </body>
    </html>
  );
}
