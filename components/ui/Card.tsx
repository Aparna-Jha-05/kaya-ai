import { ReactNode } from "react";

export default function Card({
  children,
  className = "",
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: string; // hex for a left border accent
}) {
  return (
    <div
      className={`rounded-2xl border border-line border-b-2 bg-card shadow-xs transition-all duration-150 hover:border-cyan/40 max-w-full relative overflow-visible ${className}`}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  caption,
  right,
}: {
  title: ReactNode;
  caption?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 px-5 py-4 sm:px-6 sm:py-4.5">
      <div className="min-w-0 flex-1">
        <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-text truncate">{title}</h3>
        {caption && (
          <p className="mt-1 text-[13px] leading-snug text-text/60 font-medium break-words">{caption}</p>
        )}
      </div>
      {right}
    </div>
  );
}
