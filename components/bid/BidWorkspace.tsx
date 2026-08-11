"use client";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { Braces, Check, ClipboardList, FileText, ScanText, Users } from "lucide-react";
import { motion } from "framer-motion";
import UploadDropzone from "@/components/bid/UploadDropzone";
import RecordBidReview from "@/components/bid/RecordBidReview";
import { COLORS } from "@/lib/constants";
import type { BidRecord } from "@/lib/api";

type Stage = "upload" | "results";

const PIPELINE = [
  { key: "upload", label: "Vendor PDF", Icon: FileText },
  { key: "extract", label: "Extract Data", Icon: ScanText },
  { key: "validate", label: "Validate Data", Icon: Braces },
  { key: "patrols", label: "Run Patrols", Icon: Users },
  { key: "results", label: "Review Results", Icon: ClipboardList },
] as const;

const STAGE_INDEX: Record<Stage, number> = { upload: 0, results: 4 };

export default function BidWorkspace({ initialRecord }: { initialRecord?: BidRecord }) {
  const router = useRouter();
  const record = initialRecord;
  const stage: Stage = record ? "results" : "upload";
  const lit = STAGE_INDEX[stage];
  const [displayLit, setDisplayLit] = useState(0);

  useEffect(() => {
    if (lit === 0) return;
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      setDisplayLit(current);
      if (current >= lit) clearInterval(id);
    }, 350);
    return () => clearInterval(id);
  }, [lit]);

  function onUploaded(next: BidRecord) {
    router.replace(`/bids/${next.id}`);
  }

  const progressPercent = `${(displayLit / (PIPELINE.length - 1)) * 100}%`;

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl border border-line border-b-2 bg-card p-5 shadow-xs" aria-label="Bid processing progress">
        <div className="relative flex items-center justify-between">
          <div className="absolute inset-x-[18px] top-[18px] h-0.5 bg-line/60 z-0">
            <motion.div
              initial={false}
              animate={{ width: progressPercent }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full bg-cyan shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            />
          </div>

          {PIPELINE.map((item, index) => {
            const active = index <= displayLit;
            const complete = index < displayLit;
            return (
              <div key={item.key} className="relative z-10 flex flex-col items-center gap-1.5 px-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                    active
                      ? "border-cyan/50 bg-card text-cyan ring-4 ring-cyan/10 shadow-xs"
                      : "border-line bg-surface text-text/40"
                  }`}
                >
                  {complete ? <Check className="h-4 w-4 text-cyan" /> : <item.Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-bold tracking-tight transition-colors ${active ? "text-text" : "text-text/40"}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!record && <UploadDropzone onUploaded={onUploaded} />}
      {record && <RecordBidReview record={record} />}
    </div>
  );
}
