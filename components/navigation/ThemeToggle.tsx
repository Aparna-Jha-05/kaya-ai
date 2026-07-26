"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "po-lice-theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const root = document.documentElement;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial = saved === "dark" || saved === "light" ? saved : systemTheme();
    setTheme(initial);

    // A system preference controls first use. Once a reviewer makes a choice,
    // it is intentionally retained—there is no ambiguous third "default" mode.
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
    <div className={`inline-flex items-center rounded-lg border border-white/10 bg-surface/80 p-0.5 ${compact ? "" : "w-full"}`} role="group" aria-label="Color theme">
      <button type="button" onClick={() => choose("light")} aria-pressed={theme === "light"} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${theme === "light" ? "bg-card text-text shadow-sm" : "text-text/55 hover:text-text"}`}>
        <Sun className="h-3.5 w-3.5" />
        <span className={compact ? "sr-only" : ""}>Light</span>
      </button>
      <button type="button" onClick={() => choose("dark")} aria-pressed={theme === "dark"} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${theme === "dark" ? "bg-card text-text shadow-sm" : "text-text/55 hover:text-text"}`}>
        <Moon className="h-3.5 w-3.5" />
        <span className={compact ? "sr-only" : ""}>Dark</span>
      </button>
    </div>
  );
}
