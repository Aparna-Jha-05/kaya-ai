"use client";
import Card, { CardHeader } from "@/components/ui/Card";
import MockBadge from "@/components/ui/MockBadge";
import { COLORS } from "@/lib/constants";
import { Mail, Clock, CheckCircle2, FileSearch } from "lucide-react";
import Link from "next/link";

interface CaseItem {
  icon: typeof Mail;
  color: string;
  title: string;
  meta: string;
  href?: string;
  mocked?: boolean;
  live?: boolean;
}

const ITEMS: CaseItem[] = [
  {
    icon: Mail,
    color: COLORS.violet,
    title: "RFI draft for Vendor B: safety certificate missing",
    meta: "awaiting reviewer approval",
    href: "/bids/B",
    live: true,
  },
  {
    icon: FileSearch,
    color: COLORS.blue,
    title: "Vendor B delivery history reviewed",
    meta: "3 delay notices · 1 dispute surfaced",
    href: "/bids/B",
  },
  {
    icon: Clock,
    color: COLORS.amber,
    title: "Vendor B schedule exposure identified",
    meta: "planning handoff pending",
    mocked: true,
  },
  {
    icon: CheckCircle2,
    color: COLORS.cyan,
    title: "Vendor A passed all checks",
    meta: "recommended for review",
    href: "/bids/A",
  },
];

export default function CaseFilesPanel() {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Review queue
            <span className="flex h-1.5 w-1.5 items-center">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-green/60" />
            </span>
          </span>
        }
        caption="Items that need reviewer attention."
      />
      <ul className="divide-y divide-white/5">
        {ITEMS.map((it, i) => {
          const body = (
            <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${it.color}1a` }}
              >
                <it.icon className="h-3.5 w-3.5" style={{ color: it.color }} />
              </span>
              <div className="min-w-0">
                <p className="text-xs leading-snug text-text/85">{it.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-text/40">{it.meta}</span>
                  {it.mocked && <MockBadge />}
                  {it.live && (
                    <span className="rounded bg-violet/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-violet">
                      action needed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
          return (
            <li key={i}>
              {it.href ? <Link href={it.href}>{body}</Link> : body}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
