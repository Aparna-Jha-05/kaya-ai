"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "po-lice-theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    // Track OS preference changes only when user hasn't made a manual choice.
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTheme(systemTheme());
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("po-lice-theme-change"));
    setTheme(next);
  }

  return (
    <div suppressHydrationWarning className={`flex items-center rounded-xl border border-line bg-surface p-1 shadow-xs ${compact ? "inline-flex" : "w-full"}`} role="group" aria-label="Color theme">
      <button suppressHydrationWarning type="button" onClick={() => choose("light")} aria-pressed={theme === "light"} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold tactile-press transition-all ${compact ? "" : "flex-1"} ${theme === "light" ? "bg-card text-text ring-1 ring-line shadow-xs" : "text-text/60 hover:text-text"}`}>
        <Sun className="h-3.5 w-3.5" />
        <span className={compact ? "sr-only" : ""}>Light</span>
      </button>
      <button suppressHydrationWarning type="button" onClick={() => choose("dark")} aria-pressed={theme === "dark"} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold tactile-press transition-all ${compact ? "" : "flex-1"} ${theme === "dark" ? "bg-card text-text ring-1 ring-line shadow-xs" : "text-text/60 hover:text-text"}`}>
        <Moon className="h-3.5 w-3.5" />
        <span className={compact ? "sr-only" : ""}>Dark</span>
      </button>
    </div>
  );
}
