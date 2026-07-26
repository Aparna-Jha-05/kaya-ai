"use client";
import Image from "next/image";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, LayoutList, Scale, ShieldCheck, ScrollText } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Review queue", Icon: LayoutList },
  { href: "/bids", label: "Compare bids", Icon: Scale },
  { href: "/audit", label: "Activity log", Icon: ScrollText },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-hidden border-r border-white/10 bg-bg/70 px-3 py-5 lg:flex lg:flex-col">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/15 ring-1 ring-cyan/40">
          <Image src="/wordmark-dark.svg" alt="PO-LICE" width={120} height={32} priority />
        </span>
        <span>
          <span className="block font-mono text-sm font-bold tracking-tight text-text">PO-LICE</span>
          <span className="block text-[9px] text-text/45 leading-tight mt-0.5" style={{ letterSpacing: "0.04em" }}>Purchase Order Liability,</span>
          <span className="block text-[9px] text-text/45 leading-tight" style={{ letterSpacing: "0.04em" }}>Intelligence &amp; Compliance</span>
          <span className="block text-[9px] text-cyan/70 leading-tight mt-1 font-mono" style={{ letterSpacing: "0.02em" }}>Catching bid bandits.</span>
        </span>
      </Link>

      <nav aria-label="Primary navigation" className="space-y-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-cyan/10 text-cyan" : "text-text/55 hover:bg-white/5 hover:text-text"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link href="/bids/new" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-cyan/15 px-3 py-2.5 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25">
        <FilePlus2 className="h-4 w-4" />
        Upload bid
      </Link>

      <div className="mt-auto space-y-3">
        <ThemeToggle />
        <div className="rounded-lg border border-white/10 bg-surface/60 p-3">
          <p className="ui-label font-mono uppercase text-text/50">Decision rule</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text/65">Extracted data is cited. Deterministic rules assess compliance. Reviewers authorize actions.</p>
        </div>
      </div>
    </aside>
  );
}
