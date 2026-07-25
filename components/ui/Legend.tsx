"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { Palette, X } from "lucide-react";

const ITEMS: { color: string; label: string }[] = [
  { color: COLORS.green, label: "Pass" },
  { color: COLORS.amber, label: "Review needed" },
  { color: COLORS.violet, label: "Vendor reliability" },
  { color: COLORS.blue, label: "Schedule risk" },
  { color: COLORS.red, label: "Failure" },
];

// Persistent color legend, collapsible, pinned bottom-left.
export default function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div className="w-56 rounded-xl border border-white/15 bg-[#0a1a13]/95 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text/50">
              Color legend
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close legend">
              <X className="h-3.5 w-3.5 text-text/40 hover:text-text" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {ITEMS.map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-xs text-text/70">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: it.color, boxShadow: `0 0 6px ${it.color}` }}
                />
                {it.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-[#0a1a13]/95 px-3 py-2 text-xs text-text/70 shadow-xl backdrop-blur hover:text-text"
        >
          <Palette className="h-3.5 w-3.5" />
          Legend
        </button>
      )}
    </div>
  );
}
