import { TempoInit } from "@/components/tempo-init";
import { BetaFeedbackButton } from "@/components/beta-feedback-button";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insurance Sales Genie AI",
  description:
    "AI Tools To Help You Close More Deals. Cut Your Workload in Half. Instantly Match Clients with the Right Insurance Plan Without the Headaches.",
  openGraph: {
    title: "Insurance Sales Genie AI",
    description:
      "AI Tools To Help You Close More Deals. Cut Your Workload in Half. Instantly Match Clients with the Right Insurance Plan Without the Headaches.",
    images: [
      "https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/6839e5ba3ddeac5abf36301b.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/6830c0c8a746514d41995743.png",
    shortcut:
      "https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/6830c0c8a746514d41995743.png",
    apple:
      "https://storage.googleapis.com/msgsndr/QFjnAi2H2A9Cpxi7l0ri/media/6830c0c8a746514d41995743.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script src="https://api.tempolabs.ai/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
      <body className={inter.className}>
        {children}
        <BetaFeedbackButton />
        <TempoInit />
      </body>
    </html>
  );
}
