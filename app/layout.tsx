import type { Metadata } from "next";
import "./globals.css";
import Legend from "@/components/ui/Legend";
import CommandPalette from "@/components/navigation/CommandPalette";
import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "PO-LICE · Procurement Review",
  description:
    "Procurement enforcement layer for Amber. LLM extracts and explains, deterministic math validates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text font-sans antialiased">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-5 px-5 py-3 lg:px-8">
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
            <nav aria-label="Primary navigation" className="flex items-center gap-1 overflow-x-auto text-xs">
              <NavLink href="/">Queue</NavLink>
              <NavLink href="/bids">Compare</NavLink>
              <NavLink href="/audit">Activity</NavLink>
            </nav>
            <div className="hidden items-center gap-2 text-[11px] text-text/45 xl:flex">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              Extracted data is cited. Rules determine compliance.
            </div>
          </div>
        </header>
        <div className="mx-auto min-h-[calc(100vh-56px)] max-w-[1600px]">
          <main className="min-w-0 px-5 py-6 lg:px-8">{children}</main>
        </div>
        <CommandPalette />
        <Legend />
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
