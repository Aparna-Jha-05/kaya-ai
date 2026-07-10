import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Legend from "@/components/ui/Legend";
import Link from "next/link";
import { Shield } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "PO-LICE · The Precinct",
  description:
    "Procurement enforcement layer for Amber. LLM extracts and explains, deterministic math validates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg text-text font-sans antialiased">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/80 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-green/15 ring-1 ring-green/40">
                <Shield className="h-4 w-4 text-green" />
              </span>
              <div className="leading-tight">
                <div className="font-mono text-sm font-bold tracking-tight text-text group-hover:text-green transition-colors">
                  PO-LICE
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-text/40">
                  The Precinct
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">Precinct</NavLink>
              <NavLink href="/bids/B">Bid Detail</NavLink>
              <NavLink href="/audit">Audit Log</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-6 py-6">{children}</main>
        <Legend />
        <footer className="mx-auto max-w-[1400px] px-6 py-8 text-center text-[11px] text-text/30">
          Humans decide, PO-lice provides evidence. · Track 3: Procurement · UN SDGs
          8, 9, 11, 12 · Team TensorTruss, IIT Madras
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
