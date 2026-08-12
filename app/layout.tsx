import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import dynamic from "next/dynamic";
import ConnectionFooter from "@/components/navigation/ConnectionFooter";
import TopHeader from "@/components/navigation/TopHeader";
import { TourProvider } from "@/components/walkthrough/TourContext";

const CommandPalette = dynamic(() => import("@/components/navigation/CommandPalette"), { ssr: false });
const GuidedTourModal = dynamic(() => import("@/components/walkthrough/GuidedTourModal"), { ssr: false });

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const t=localStorage.getItem("po-lice-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.dataset.theme="dark";}else{document.documentElement.dataset.theme="light";}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-bg text-text font-sans antialiased">
        <TourProvider>
          <TopHeader />
          <div className="mx-auto flex w-full max-w-[1720px] flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <main className="min-w-0 flex-1 px-4 pt-6 pb-4 sm:px-6 lg:px-8 xl:px-10">
                {children}
              </main>
              <footer className="border-t border-line/40 px-6 py-2.5 text-center text-[11px] font-medium text-text/40 shrink-0">
                ©2026 PO-LICE. Catching bid bandits before budget breaks.
              </footer>
            </div>
          </div>
          <CommandPalette />
          <ConnectionFooter />
          <GuidedTourModal />
        </TourProvider>
      </body>
    </html>
  );
}
