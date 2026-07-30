"use client";
import Image from "next/image";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, LayoutList, Scale, ScrollText } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Queue", Icon: LayoutList },
  { href: "/bids", label: "Compare", Icon: Scale },
  { href: "/audit", label: "Activity", Icon: ScrollText },
];

export default function AppSidebar() {
  const pathname = usePathname();

  const isUploadActive = pathname === "/bids/new";

  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/bids") return pathname === "/bids" || (pathname.startsWith("/bids/") && !isUploadActive);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-card/40 px-3 py-5 lg:flex">
      <Link href="/" title="Purchase Order Liability, Intelligence & Compliance Engine" className="mb-7 flex items-center gap-3 px-1 group">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan shadow-[0_4px_14px_rgba(56,189,248,0.4)] group-hover:shadow-[0_4px_20px_rgba(56,189,248,0.6)] group-hover:scale-105 transition-all duration-200">
          <Image src="/icon.svg" alt="PO-LICE" width={24} height={24} priority />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-text group-hover:text-cyan transition-colors duration-200 leading-none">
          PO-LICE
        </span>
      </Link>

      <nav aria-label="Primary navigation" className="space-y-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = isNavActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${active
                ? "bg-cyan/15 font-bold text-cyan ring-1 ring-cyan/30 shadow-xs"
                : "text-text/60 font-semibold hover:bg-surface hover:text-text"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-3 border-t border-line">
        <Link
          href="/bids/new"
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${isUploadActive
            ? "bg-cyan/25 ring-1 ring-cyan/50 text-cyan"
            : "bg-cyan text-on-accent hover:bg-cyan/90 tactile-press shadow-xs"
            }`}
        >
          <FilePlus2 className="h-4 w-4" />
          Upload
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
