import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { KineticBackground } from "@/components/KineticBackground";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Pancake",
  description: "摄影群组的灵感、策划和反馈工作台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <KineticBackground />
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
