import type { Metadata } from "next";
import * as React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RigorMobile — RigorChain Web Miner & Wallet",
  description:
    "Browser-based SHA3-256 miner (WebGPU + Worker pool) and HD wallet for RigorChain. Modern UI/UX, background mining, cronjobs, and CI/CD via GitHub Actions.",
  keywords: [
    "RigorChain",
    "RIGOR",
    "ORU",
    "RES",
    "SHA3-256",
    "RGRPOW01",
    "WebGPU miner",
    "Web wallet",
    "Bech32 rg",
    "ASERT",
  ],
  authors: [{ name: "SecretArrow" }],
  openGraph: {
    title: "RigorMobile — RigorChain Web Miner & Wallet",
    description:
      "Browser-based SHA3-256 miner (WebGPU + Worker pool) and HD wallet for RigorChain.",
    url: "https://github.com/SecretArrow/rigormobile",
    siteName: "RigorMobile",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RigorMobile — RigorChain Web Miner & Wallet",
    description:
      "Browser-based SHA3-256 miner (WebGPU + Worker pool) and HD wallet for RigorChain.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // bun-workspace resolves @types/react to two versions (18.3.x via sonner's
  // transitive dep, 19.3.x for the app). Use React.createElement so the
  // children prop accepts any ReactNode; runtime is identical to JSX.
  const tree = React.createElement(
    "html",
    { lang: "en", suppressHydrationWarning: true },
    React.createElement(
      "body",
      {
        className: `${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`,
      },
      React.createElement(
        ThemeProvider,
        {
          attribute: "class",
          defaultTheme: "dark",
          enableSystem: true,
          disableTransitionOnChange: true,
        },
        children,
        React.createElement(Toaster, {
          richColors: true,
          closeButton: true,
          position: "top-right",
        }),
      ),
    ),
  );
  return tree;
}
