"use client";
import { useState } from "react";
import { Bid } from "@/lib/mockData";
import UploadDropzone from "@/components/bid/UploadDropzone";
import ExtractionStream from "@/components/bid/ExtractionStream";
import VlmCadDemo from "@/components/bid/VlmCadDemo";
import PatrolRunner, { PatrolBundle } from "@/components/bid/PatrolRunner";
import EvidenceBoard from "@/components/bid/EvidenceBoard";
import Docket from "@/components/bid/Docket";
import CaseFile from "@/components/agent/CaseFile";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "@/lib/constants";
import { FileText, ScanText, Braces, Users, ClipboardList, Check } from "lucide-react";

type Stage = "upload" | "extract" | "vlm" | "patrols" | "results";

const PIPELINE = [
  { key: "upload", label: "Vendor PDF", Icon: FileText },
  { key: "extract", label: "Extract data", Icon: ScanText },
  { key: "json", label: "Validate data", Icon: Braces },
  { key: "patrols", label: "Run checks", Icon: Users },
  { key: "results", label: "Review results", Icon: ClipboardList },
] as const;

// Map a stage to how far the pipeline strip has lit up.
const STAGE_INDEX: Record<Stage, number> = {
  upload: 0,
  extract: 1,
  vlm: 2,
  patrols: 3,
  results: 5,
};

export default function BidWorkspace({ bid }: { bid: Bid }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [, setBundle] = useState<PatrolBundle | null>(null);
  const lit = STAGE_INDEX[stage];

  return (
    <div className="space-y-6">
      {/* Pipeline strip */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {PIPELINE.map((p, i) => {
            const active = i <= lit;
            const isDone = i < lit;
            return (
              <div key={p.key} className="flex flex-1 items-center gap-1">
                <div className="flex flex-col items-center gap-1.5 px-1">
                  <motion.div
                    animate={{
                      backgroundColor: active ? `${COLORS.cyan}1a` : "rgba(255,255,255,0.04)",
                      borderColor: active ? `${COLORS.cyan}66` : "rgba(255,255,255,0.08)",
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border"
                  >
                    {isDone ? (
                      <Check className="h-4 w-4 text-cyan" />
                    ) : (
                      <p.Icon
                        className="h-4 w-4"
                        style={{ color: active ? COLORS.cyan : "rgba(248,250,252,0.35)" }}
                      />
                    )}
                  </motion.div>
                  <span
                    className="whitespace-nowrap text-[10px]"
                    style={{ color: active ? COLORS.text : "rgba(241,255,246,0.35)" }}
                  >
                    {p.label}
                  </span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="relative h-0.5 flex-1 overflow-hidden rounded bg-white/8">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: i < lit ? "100%" : "0%" }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-y-0 left-0 bg-cyan"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {stage === "upload" && (
        <UploadDropzone vendor={bid.vendor} onStart={() => setStage("extract")} />
      )}

      <AnimatePresence mode="wait">
        {stage !== "upload" && (
          <motion.div
            key="extract"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <ExtractionStream bid={bid} onComplete={() => setStage((s) => (s === "extract" ? "vlm" : s))} />

            {["vlm", "patrols", "results"].includes(stage) && (
              <VlmCadDemo bid={bid} onComplete={() => setStage((s) => (s === "vlm" ? "patrols" : s))} />
            )}

            {["patrols", "results"].includes(stage) && (
              <PatrolRunner
                bid={bid}
                onComplete={(b) => {
                  setBundle(b);
                  setStage("results");
                }}
              />
            )}

            {stage === "results" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <EvidenceBoard bid={bid} />
                <Docket highlightId={bid.id} />
                <CaseFile bid={bid} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
