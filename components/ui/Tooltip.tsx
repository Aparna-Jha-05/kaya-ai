"use client";
import { ReactNode, useState } from "react";
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
  const body = text ?? (term ? GLOSSARY[term] : "") ?? "";
  const label = children ?? term;

  return (
    <span
      className="relative inline-flex cursor-help items-center underline decoration-dotted decoration-text/30 underline-offset-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {label}
      {open && body && (
        <span className="absolute bottom-full left-1/2 z-[9999] mb-2.5 w-64 -translate-x-1/2 rounded-xl border border-line border-b-2 bg-card p-3 text-left text-xs font-medium leading-relaxed text-text shadow-2xl pointer-events-none drop-shadow-xl">
          {term && <span className="mb-1 block font-mono text-[10px] font-bold text-cyan tracking-wider">{term}</span>}
          {body}
        </span>
      )}
    </span>
  );
}
