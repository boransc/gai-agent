import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { activeBusiness } from "@/agent/lib/quote-agent/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = `${activeBusiness.businessName} — Get a Quote`;
const description = `Get an itemised quote from ${activeBusiness.businessName} in a couple of minutes. Every figure comes from configuration, checked against a fixed, deterministic pipeline before you see it — never invented, never guessed.`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
