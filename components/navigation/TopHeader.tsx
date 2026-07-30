"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function TopHeader() {
  const pathname = usePathname();

  const isUploadActive = pathname === "/bids/new";

  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/bids") return pathname === "/bids" || (pathname.startsWith("/bids/") && !isUploadActive);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-bg/90 backdrop-blur lg:hidden">
      <div className="mx-auto flex items-center justify-between gap-x-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan/15 ring-1 ring-cyan/40">
            <Image src="/icon.svg" alt="PO-LICE Icon" width={20} height={20} priority />
          </span>
          <div className="leading-tight">
            <div className="font-mono text-sm font-bold tracking-tight text-text group-hover:text-cyan transition-colors">
              PO-LICE
            </div>
            <div className="text-[9px] text-text/40 hidden sm:block max-w-[200px] truncate">
              Purchase Order - Liability, Intelligence &amp; Compliance Engine
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-0.5">
          <nav aria-label="Primary navigation" className="flex items-center gap-1 text-xs">
            <NavLink href="/" active={isNavActive("/")}>
              Queue
            </NavLink>
            <NavLink href="/bids" active={isNavActive("/bids")}>
              Compare
            </NavLink>
            <NavLink href="/audit" active={isNavActive("/audit")}>
              Activity
            </NavLink>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-2">
            <ThemeToggle compact />
            <Link
              href="/bids/new"
              title="Upload bid"
              aria-label="Upload bid"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 transition-colors ${isUploadActive
                  ? "bg-cyan/25 ring-1 ring-cyan/50 text-cyan"
                  : "bg-surface/80 text-text/70 hover:bg-white/5 hover:text-cyan"
                }`}
            >
              <FilePlus2 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 transition-colors ${active
          ? "bg-cyan/10 font-medium text-cyan"
          : "text-text/60 hover:bg-white/5 hover:text-text"
        }`}
    >
      {children}
    </Link>
  );
}
