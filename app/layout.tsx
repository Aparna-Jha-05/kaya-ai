import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/navigation/AppSidebar";
import CommandPalette from "@/components/navigation/CommandPalette";
import TopHeader from "@/components/navigation/TopHeader";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
            __html: `try { const theme = localStorage.getItem("po-lice-theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme; } catch {}`,
          }}
        />
      </head>
      <body className="h-full overflow-x-hidden bg-bg text-text font-sans antialiased">
        <div className="flex h-screen flex-col lg:flex-row max-w-[1600px] mx-auto overflow-hidden">
          <TopHeader />
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <main className="flex-1 min-w-0 max-w-full px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden">{children}</main>
            <footer className="mx-auto max-w-[1400px] px-6 py-8 text-center text-[11px] font-medium text-text/40">
              ©2026 PO-LICE. Catching bid bandits before budget breaks.
            </footer>
          </div>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}
