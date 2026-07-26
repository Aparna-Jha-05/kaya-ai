"use client";

import { motion } from "framer-motion";
import { Check, ClipboardCheck, FileText, ScanText, ShieldCheck } from "lucide-react";
import { COLORS } from "@/lib/constants";

const STEPS = [
  { label: "Document received", state: "Received", Icon: FileText },
  { label: "Extracted data", state: "Validated", Icon: ScanText },
  { label: "Compliance checks", state: "Complete", Icon: ShieldCheck },
  { label: "Reviewer action", state: "In review", Icon: ClipboardCheck },
] as const;

export default function BidFlowState({ activeStep = 3 }: { activeStep?: number }) {
  return <section aria-label="Bid review flow" className="rounded-xl border border-white/10 bg-card/60 p-4"><div className="mb-3 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-wider text-cyan">Bid flow</p><p className="font-mono text-[10px] text-text/45">{STEPS[Math.min(activeStep, STEPS.length - 1)].state}</p></div><div className="flex items-center gap-1 overflow-x-auto pb-1">{STEPS.map(({ label, Icon }, index) => { const complete = index < activeStep; const current = index === activeStep; const color = complete || current ? COLORS.cyan : "rgba(255,255,255,0.32)"; return <div key={label} className="flex min-w-[112px] flex-1 items-center gap-1"><div className="flex flex-col items-center gap-1.5 px-1"><motion.div animate={{ backgroundColor: (complete || current) ? `${COLORS.cyan}1a` : "rgba(255,255,255,0.04)", borderColor: (complete || current) ? `${COLORS.cyan}66` : "rgba(255,255,255,0.08)", scale: current ? [1, 1.06, 1] : 1 }} transition={{ duration: 0.35 }} className="flex h-9 w-9 items-center justify-center rounded-lg border">{complete ? <Check className="h-4 w-4 text-cyan" /> : <Icon className="h-4 w-4" style={{ color }} />}</motion.div><span className="whitespace-nowrap text-[10px]" style={{ color }}>{label}</span></div>{index < STEPS.length - 1 && <div className="relative h-0.5 min-w-6 flex-1 overflow-hidden rounded bg-white/10"><motion.div animate={{ width: index < activeStep ? "100%" : "0%" }} transition={{ duration: 0.35 }} className="absolute inset-y-0 left-0 bg-cyan" /></div>}</div>; })}</div></section>;
}
