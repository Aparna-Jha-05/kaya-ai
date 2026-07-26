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
      className={`rounded-xl border border-white/10 bg-card/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] ${className}`}
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
    <div className="flex items-start justify-between gap-4 border-b border-white/5 px-4 py-3">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-text">{title}</h3>
        {caption && (
          <p className="mt-1 text-[13px] leading-snug text-text/55">{caption}</p>
        )}
      </div>
      {right}
    </div>
  );
}
