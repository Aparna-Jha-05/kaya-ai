"use client";

import { motion } from "framer-motion";
import { ClipboardCheck, FileText, ScanText, ShieldCheck } from "lucide-react";
import { COLORS } from "@/lib/constants";

const STEPS = [
  { label: "Document received", Icon: FileText },
  { label: "Extracted and validated", Icon: ScanText },
  { label: "Compliance checks", Icon: ShieldCheck },
  { label: "Reviewer action", Icon: ClipboardCheck },
] as const;

export default function BidFlowState() {
  return (
    <section aria-label="Bid review flow" className="rounded-xl border border-white/10 bg-card/60 p-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-cyan">Bid flow</p>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map(({ label, Icon }, index) => (
          <div key={label} className="flex min-w-[108px] flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1.5 px-1">
              <motion.div
                initial={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                animate={{ backgroundColor: `${COLORS.cyan}1a`, borderColor: `${COLORS.cyan}66` }}
                transition={{ delay: index * 0.12, duration: 0.28 }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border"
              >
                <Icon className="h-4 w-4 text-cyan" />
              </motion.div>
              <span className="whitespace-nowrap text-[10px] text-text/75">{label}</span>
            </div>
            {index < STEPS.length - 1 && <div className="relative h-0.5 min-w-6 flex-1 overflow-hidden rounded bg-white/10"><motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ delay: index * 0.12 + 0.16, duration: 0.3 }} className="absolute inset-y-0 left-0 bg-cyan" /></div>}
          </div>
        ))}
      </div>
    </section>
  );
}
