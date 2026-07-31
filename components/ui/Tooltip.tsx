"use client";
import { ReactNode, useRef, useState } from "react";
import { GLOSSARY } from "@/lib/constants";

// Jargon tooltip. If `term` is in the glossary, uses that definition.
export default function Tooltip({
  term,
  text,
  children,
}: {
  term?: string;
  text?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const body = text ?? (term ? GLOSSARY[term] : "") ?? "";
  const label = children ?? term;

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 260;
      const placeAbove = rect.top > 130;
      const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
      const idealLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
      const left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, idealLeft));
      setCoords({ top, left, placeAbove });
    }
    setOpen(true);
  };

  return (
    <span
      ref={triggerRef}
      className="inline-flex cursor-help items-center underline decoration-dotted decoration-text/30 underline-offset-2"
      onMouseEnter={showTooltip}
      onMouseLeave={() => setOpen(false)}
      onFocus={showTooltip}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {label}
      {open && body && coords && (
        <span
          className="fixed z-[99999] w-65 rounded-xl border border-line border-b-2 bg-card p-3 text-left text-xs font-medium leading-relaxed text-text shadow-2xl pointer-events-none drop-shadow-2xl animate-in fade-in duration-150"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: coords.placeAbove ? "translateY(-100%)" : "translateY(0)",
          }}
        >
          {term && <span className="mb-1 block font-mono text-[10px] font-bold text-cyan tracking-wider">{term}</span>}
          {body}
        </span>
      )}
    </span>
  );
}
