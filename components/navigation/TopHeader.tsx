"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FilePlus2, LayoutList, Menu, Scale, ScrollText, X } from "lucide-react";
import LogoIcon from "@/components/ui/LogoIcon";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Queue", Icon: LayoutList },
  { href: "/bids", label: "Compare", Icon: Scale },
  { href: "/audit", label: "Activity", Icon: ScrollText },
];

export default function TopHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isUploadActive = pathname === "/bids/new";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/bids") return pathname === "/bids" || (pathname.startsWith("/bids/") && !isUploadActive);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="sticky top-0 z-50 shrink-0 border-b border-line bg-bg">
        <div className="mx-auto flex items-center justify-between gap-x-3 px-4 py-3">
          <Link
            href="/"
            title="Purchase Order Liability, Intelligence & Compliance Engine"
            className="group flex shrink-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-b-2 border-line bg-surface shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:border-cyan/40">
              <LogoIcon className="h-6 w-6" />
            </span>
            <span className="text-xl font-extrabold leading-none tracking-tight text-text transition-colors duration-200 group-hover:text-cyan">
              PO-LICE
            </span>
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <nav aria-label="Primary navigation" className="flex items-center gap-1 text-xs">
              {NAV.map(({ href, label }) => {
                const active = isNavActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-xl px-3 py-2 transition-all ${
                      active
                        ? "bg-cyan/15 font-bold text-cyan ring-1 ring-cyan/30 shadow-xs"
                        : "font-semibold text-text/60 hover:bg-surface hover:text-text"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 border-l border-line pl-3">
              <ThemeToggle compact />
              <Link
                href="/bids/new"
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isUploadActive
                    ? "bg-cyan/25 text-cyan ring-1 ring-cyan/50"
                    : "bg-cyan text-on-accent shadow-xs hover:bg-cyan/90 tactile-press"
                }`}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                <span>Upload</span>
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            title="Toggle navigation menu"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-text shadow-xs transition-colors hover:border-cyan/40 hover:text-cyan tactile-press sm:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mobileMenuOpen ? "close" : "menu"}
                initial={{ rotate: mobileMenuOpen ? -90 : 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: mobileMenuOpen ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </header>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                id="mobile-navigation"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed inset-x-0 bottom-0 top-[65px] z-[9999] flex flex-col overflow-y-auto bg-bg px-4 py-6 sm:hidden"
              >
                <nav aria-label="Mobile navigation" className="flex-1 space-y-1.5">
                  {NAV.map(({ href, label, Icon }) => {
                    const active = isNavActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all duration-150 ${
                          active
                            ? "bg-cyan/15 font-bold text-cyan ring-1 ring-cyan/30 shadow-xs"
                            : "font-semibold text-text/60 hover:bg-surface hover:text-text"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        {label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-auto space-y-3 border-t border-line pt-4">
                  <Link
                    href="/bids/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                      isUploadActive
                        ? "bg-cyan/25 text-cyan ring-1 ring-cyan/50"
                        : "bg-cyan text-on-accent shadow-xs hover:bg-cyan/90 tactile-press"
                    }`}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    Upload
                  </Link>
                  <ThemeToggle />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
