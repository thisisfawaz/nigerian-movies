import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { ViewTransitions } from "next-view-transitions";

import { NavProgress } from "@/components/nav-progress";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "YouFlix — Nigerian movie channels on YouTube",
    template: "%s · YouFlix"
  },
  description:
    "Discover and watch Nigerian movie channels on YouTube in one organized catalogue."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ViewTransitions>
          <Suspense fallback={null}>
            <NavProgress />
          </Suspense>
          {children}
        </ViewTransitions>
      </body>
    </html>
  );
}
