import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import CommandPalette from "@/components/navigation/CommandPalette";
import TopHeader from "@/components/navigation/TopHeader";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: true,
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "PO-LICE · Purchase Order Liability, Intelligence & Compliance Engine",
  description:
    "LLM extracts and explains, deterministic SQL and math validate procurement compliance.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const t=localStorage.getItem("po-lice-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.dataset.theme="dark";}}catch(e){}})()`,
          }}
        />
      </head>
      {/* Single natural-scroll body — no overflow-hidden, no h-screen trap */}
      <body className="min-h-screen bg-bg text-text font-sans antialiased">
        {/* App shell: header sticky at top, then sidebar + content in a row */}
        <TopHeader />
        <div className="mx-auto flex w-full max-w-[1720px] items-start">
          {/* Main content: flex-col so footer stays at bottom, no overflow clip */}
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              {children}
            </main>
            <footer className="border-t border-line/40 px-6 py-6 text-center text-[11px] font-medium text-text/40">
              ©2026 PO-LICE. Catching bid bandits before budget breaks.
            </footer>
          </div>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}
