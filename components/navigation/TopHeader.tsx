"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import LogoIcon from "@/components/ui/LogoIcon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutList, Scale, ScrollText, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { useTour } from "@/components/walkthrough/TourContext";

const NAV = [
  { href: "/", label: "Bid Review Queue", Icon: LayoutList },
  { href: "/bids", label: "Bid Portfolio", Icon: Scale },
  { href: "/audit", label: "Audit Log", Icon: ScrollText, tourAttr: "tour-audit" },
];

export default function TopHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { startTour, advanceIfMatch } = useTour();

  useEffect(() => {
    setMounted(true);

    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/bids") return pathname === "/bids" || pathname.startsWith("/bids/");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 shrink-0 border-b border-line bg-bg min-h-[65px]">
        <div className="mx-auto flex items-center justify-between gap-x-3 px-4 py-3">
          <Link
            href="/"
            data-tour="tour-nav-dashboard"
            onClick={() => {
              setMobileMenuOpen(false);
              advanceIfMatch("tour-nav-dashboard");
            }}
            title="Purchase Order Liability, Intelligence & Compliance Engine"
            className="flex items-center gap-3 group shrink-0"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line border-b-2 bg-surface shadow-xs group-hover:border-cyan/40 group-hover:scale-105 transition duration-200">
              <LogoIcon className="h-5.5 w-5.5" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-text group-hover:text-cyan transition-colors duration-200 leading-none">
              PO-LICE
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-3">
            <nav aria-label="Primary navigation" className="flex items-center gap-1 text-xs">
              {NAV.map(({ href, label, tourAttr }) => {
                const active = isNavActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    data-tour={tourAttr}
                    className={`rounded-xl px-3 py-2 transition ${
                      active
                        ? "bg-cyan/15 font-bold text-cyan ring-1 ring-cyan/30 shadow-xs"
                        : "text-text/60 font-semibold hover:bg-surface hover:text-text"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 border-l border-line pl-3">
              <button
                type="button"
                onClick={() => startTour(0)}
                title="Guided Tour"
                aria-label="Guided Tour"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-text hover:border-cyan/40 hover:bg-cyan/10 hover:text-cyan tactile-press transition-all shadow-xs"
              >
                <Sparkles className="h-4 w-4 text-cyan" />
                <span className="sr-only">Guided Tour</span>
              </button>
              <ThemeToggle compact />
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Toggle navigation menu"
            aria-label="Toggle navigation menu"
            className="inline-flex sm:hidden h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-text hover:border-cyan/40 hover:text-cyan tactile-press transition-colors shadow-xs"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed top-[65px] left-0 right-0 bottom-0 z-[9999] flex flex-col bg-bg px-4 py-6 overflow-y-auto sm:hidden"
              >
                <nav aria-label="Mobile navigation" className="space-y-1.5 flex-1">
                  {NAV.map(({ href, label, Icon, tourAttr }) => {
                    const active = isNavActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        data-tour={tourAttr}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition duration-150 ${
                          active
                            ? "bg-cyan/15 font-bold text-cyan ring-1 ring-cyan/30 shadow-xs"
                            : "text-text/60 font-semibold hover:bg-surface hover:text-text"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        {label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-auto space-y-3 pt-4 border-t border-line">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      startTour(0);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan text-on-accent hover:bg-cyan/90 font-bold px-3 py-2.5 text-sm tactile-press shadow-xs transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    Guided Tour
                  </button>

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
