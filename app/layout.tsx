import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/navigation/AppSidebar";
import CommandPalette from "@/components/navigation/CommandPalette";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import Link from "next/link";
import { FilePlus2, Shield } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "PO-LICE · Procurement Review",
  description:
    "Procurement enforcement layer for Amber. LLM extracts and explains, deterministic math validates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { const theme = localStorage.getItem("po-lice-theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme; } catch {}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg text-text font-sans antialiased">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/90 backdrop-blur lg:hidden">
          <div className="mx-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-5 py-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/15 ring-1 ring-cyan/40">
                <Shield className="h-4 w-4 text-cyan" />
              </span>
              <div className="leading-tight">
                <div className="font-mono text-sm font-bold tracking-tight text-text group-hover:text-cyan transition-colors">
                  PO-LICE
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-text/40">
                  Procurement review
                </div>
              </div>
            </Link>
            <nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto text-xs">
              <NavLink href="/">Queue</NavLink>
              <NavLink href="/bids">Compare</NavLink>
              <NavLink href="/audit">Activity</NavLink>
            </nav>
            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeToggle compact />
              <Link href="/bids/new" className="inline-flex items-center gap-1.5 rounded-md bg-cyan/15 px-2.5 py-1.5 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/25">
                <FilePlus2 className="h-3.5 w-3.5" />
                Upload
              </Link>
            </div>
          </div>
        </header>
        <div className="mx-auto flex min-h-[calc(100vh-1px)] max-w-[1600px]">
          <AppSidebar />
          <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
        <CommandPalette />
        <footer className="mx-auto max-w-[1400px] px-6 py-8 text-center text-[11px] text-text/30">
          PO-LICE presents cited evidence; authorised reviewers make decisions.
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-text/60 transition-colors hover:bg-white/5 hover:text-text"
    >
      {children}
    </Link>
  );
}
