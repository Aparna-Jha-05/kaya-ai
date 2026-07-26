"use client";

import { useEffect, useState } from "react";
import { Braces, Check, ClipboardList, FileText, ScanText, Users } from "lucide-react";
import { motion } from "framer-motion";
import UploadDropzone from "@/components/bid/UploadDropzone";
import RecordBidReview from "@/components/bid/RecordBidReview";
import { COLORS } from "@/lib/constants";
import type { BidRecord } from "@/lib/api";

type Stage = "upload" | "extract" | "validate" | "patrols" | "results";

const PIPELINE = [
  { key: "upload", label: "Vendor PDF", Icon: FileText },
  { key: "extract", label: "Extract data", Icon: ScanText },
  { key: "validate", label: "Validate data", Icon: Braces },
  { key: "patrols", label: "Run checks", Icon: Users },
  { key: "results", label: "Review results", Icon: ClipboardList },
] as const;

const STAGE_INDEX: Record<Stage, number> = { upload: 0, extract: 1, validate: 2, patrols: 3, results: 4 };

export default function BidWorkspace({ initialRecord }: { initialRecord?: BidRecord }) {
  const [record, setRecord] = useState<BidRecord | undefined>(initialRecord);
  const [stage, setStage] = useState<Stage>(initialRecord ? "results" : "upload");
  const lit = STAGE_INDEX[stage];

  useEffect(() => {
    if (!record || stage === "results") return;
    const sequence: Record<Exclude<Stage, "results">, Stage> = { upload: "extract", extract: "validate", validate: "patrols", patrols: "results" };
    const timer = window.setTimeout(() => setStage(sequence[stage]), stage === "patrols" ? 350 : 180);
    return () => window.clearTimeout(timer);
  }, [record, stage]);

  function onUploaded(next: BidRecord) {
    setRecord(next);
    setStage("extract");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-card/60 p-4" aria-label="Bid processing progress">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {PIPELINE.map((item, index) => {
            const active = index <= lit;
            const complete = index < lit;
            return <div key={item.key} className="flex min-w-[84px] flex-1 items-center gap-1">
              <div className="flex flex-col items-center gap-1.5 px-1">
                <motion.div animate={{ backgroundColor: active ? `${COLORS.cyan}1a` : "rgba(255,255,255,0.04)", borderColor: active ? `${COLORS.cyan}66` : "rgba(255,255,255,0.08)" }} className="flex h-9 w-9 items-center justify-center rounded-lg border">
                  {complete ? <Check className="h-4 w-4 text-cyan" /> : <item.Icon className="h-4 w-4" style={{ color: active ? COLORS.cyan : "rgba(241,255,246,0.35)" }} />}
                </motion.div>
                <span className="whitespace-nowrap text-[10px]" style={{ color: active ? COLORS.text : "rgba(241,255,246,0.35)" }}>{item.label}</span>
              </div>
              {index < PIPELINE.length - 1 && <div className="relative h-0.5 flex-1 overflow-hidden rounded bg-white/8"><motion.div initial={{ width: "0%" }} animate={{ width: index < lit ? "100%" : "0%" }} transition={{ duration: 0.3 }} className="absolute inset-y-0 left-0 bg-cyan" /></div>}
            </div>;
          })}
        </div>
      </div>

      {!record && <UploadDropzone onUploaded={onUploaded} />}
      {record && stage !== "results" && <p aria-live="polite" className="rounded-lg border border-cyan/20 bg-cyan/5 px-4 py-3 text-sm text-text/70">The server has received the PDF. Extracted fields and deterministic checks are being prepared for review.</p>}
      {record && stage === "results" && <RecordBidReview record={record} />}
    </div>
  );
}
