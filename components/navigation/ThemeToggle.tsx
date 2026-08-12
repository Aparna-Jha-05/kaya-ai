"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "po-lice-theme";

function getCurrentTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const datasetTheme = document.documentElement.dataset.theme as Theme | undefined;
  if (datasetTheme === "dark" || datasetTheme === "light") return datasetTheme;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getCurrentTheme());

    const handleCustomChange = () => {
      setTheme(getCurrentTheme());
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const next = media.matches ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        setTheme(next);
      }
    };

    window.addEventListener("po-lice-theme-change", handleCustomChange);
    media.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("po-lice-theme-change", handleCustomChange);
      media.removeEventListener("change", handleMediaChange);
    };
  }, []);

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("po-lice-theme-change"));
    setTheme(next);
  }

  const activeTheme = mounted ? theme : "light";

  return (
    <div suppressHydrationWarning className={`flex items-center rounded-xl border border-line bg-surface p-1 shadow-xs ${compact ? "inline-flex" : "w-full"}`} role="group" aria-label="Color theme">
      <button suppressHydrationWarning type="button" onClick={() => choose("light")} aria-pressed={activeTheme === "light"} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold tactile-press transition-all ${compact ? "" : "flex-1"} ${activeTheme === "light" ? "bg-card text-text ring-1 ring-line shadow-xs" : "text-text/60 hover:text-text"}`}>
        <Sun className="h-3.5 w-3.5" />
        <span className={compact ? "sr-only" : ""}>Light</span>
      </button>
      <button suppressHydrationWarning type="button" onClick={() => choose("dark")} aria-pressed={activeTheme === "dark"} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold tactile-press transition-all ${compact ? "" : "flex-1"} ${activeTheme === "dark" ? "bg-card text-text ring-1 ring-line shadow-xs" : "text-text/60 hover:text-text"}`}>
        <Moon className="h-3.5 w-3.5" />
        <span className={compact ? "sr-only" : ""}>Dark</span>
      </button>
    </div>
  );
}
