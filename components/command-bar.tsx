"use client";

import { useEffect } from "react";

interface CommandBarProps {
  onSelectVendorA: () => void;
  onSelectVendorB: () => void;
  onSelectVendorC: () => void;
  onOpenRFI: () => void;
}

export default function CommandBar({
  onSelectVendorA,
  onSelectVendorB,
  onSelectVendorC,
  onOpenRFI,
}: CommandBarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "1") {
          e.preventDefault();
          onSelectVendorA();
        } else if (e.key === "2") {
          e.preventDefault();
          onSelectVendorB();
        } else if (e.key === "3") {
          e.preventDefault();
          onSelectVendorC();
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          onOpenRFI();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectVendorA, onSelectVendorB, onSelectVendorC, onOpenRFI]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#111827]/90 border border-[#1e293b] rounded-full px-5 py-2.5 shadow-2xl backdrop-blur-md z-40 flex items-center gap-4 text-xs">
      <span className="font-mono text-[#38bdf8] font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#38bdf8] animate-ping" /> COMMAND_BAR
      </span>

      <div className="h-4 w-px bg-[#1e293b]" />

      <button
        onClick={onSelectVendorA}
        className="text-[#94a3b8] hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <kbd className="bg-[#040711] border border-[#1e293b] text-[#38bdf8] px-1.5 py-0.5 rounded text-[10px] font-mono">
          ⌘1
        </kbd>
        Vendor A
      </button>

      <button
        onClick={onSelectVendorB}
        className="text-[#94a3b8] hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <kbd className="bg-[#040711] border border-[#1e293b] text-[#f43f5e] px-1.5 py-0.5 rounded text-[10px] font-mono">
          ⌘2
        </kbd>
        Vendor B (Breach)
      </button>

      <button
        onClick={onSelectVendorC}
        className="text-[#94a3b8] hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <kbd className="bg-[#040711] border border-[#1e293b] text-[#fbbf24] px-1.5 py-0.5 rounded text-[10px] font-mono">
          ⌘3
        </kbd>
        Vendor C
      </button>

      <div className="h-4 w-px bg-[#1e293b]" />

      <button
        onClick={onOpenRFI}
        className="text-[#94a3b8] hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <kbd className="bg-[#040711] border border-[#1e293b] text-[#818cf8] px-1.5 py-0.5 rounded text-[10px] font-mono">
          ⌘R
        </kbd>
        Jarvis RFI
      </button>
    </div>
  );
}
