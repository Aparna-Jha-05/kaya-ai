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
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-bg/70 px-3 py-5 lg:flex">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan/15 ring-1 ring-cyan/40">
          <Image src="/icon.svg" alt="PO-LICE Icon" width={20} height={20} priority />
        </span>
        <div>
          <span className="block font-mono text-sm font-bold tracking-tight text-text">PO-LICE</span>
          <span className="block text-[10px] text-text/45 leading-tight font-medium">Purchase Order Liability, Intelligence &amp; Compliance Engine</span>
        </div>
      </Link>

      <nav aria-label="Primary navigation" className="space-y-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = isNavActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-cyan/10 font-medium text-cyan" : "text-text/55 hover:bg-white/5 hover:text-text"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-3 border-t border-white/10">
        <Link
          href="/bids/new"
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isUploadActive
              ? "bg-cyan/25 ring-1 ring-cyan/50 text-cyan"
              : "bg-cyan/15 text-cyan hover:bg-cyan/25"
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
