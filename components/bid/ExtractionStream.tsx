"use client";
import { useEffect, useRef, useState } from "react";
import { Bid, FIELD_CONFIDENCE } from "@/lib/mockData";
import { sleep } from "@/lib/simulate";
import Card, { CardHeader } from "@/components/ui/Card";
import MockBadge from "@/components/ui/MockBadge";
import Tooltip from "@/components/ui/Tooltip";
import { COLORS } from "@/lib/constants";
import { AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const CONFIDENCE_THRESHOLD = 0.85;

// The ordered fields to reveal, with display formatting.
function fieldRows(bid: Bid) {
  return [
    { key: "equipment_type", label: "equipment_type", value: `"${bid.equipment_type}"` },
    { key: "model", label: "model", value: `"${bid.model}"` },
    { key: "power_draw_kw", label: "power_draw_kw", value: String(bid.power_draw_kw) },
    { key: "cooling_capacity_kw", label: "cooling_capacity_kw", value: String(bid.cooling_capacity_kw) },
    { key: "water_evaporation_gpm", label: "water_evaporation_gpm", value: String(bid.water_evaporation_gpm) },
    { key: "floor_load_kg_m2", label: "floor_load_kg_m2", value: String(bid.floor_load_kg_m2) },
    { key: "carbon_intensity_kgco2e", label: "carbon_intensity_kgco2e", value: String(bid.carbon_intensity_kgco2e) },
    { key: "delivery_weeks", label: "delivery_weeks", value: String(bid.delivery_weeks) },
    { key: "has_safety_cert", label: "has_safety_cert", value: String(bid.has_safety_cert) },
    { key: "upfront_cost_cr", label: "upfront_cost_cr", value: `${bid.upfront_cost_cr}` },
  ];
}

export default function ExtractionStream({
  bid,
  onComplete,
}: {
  bid: Bid;
  onComplete: () => void;
}) {
  const rows = fieldRows(bid);
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await sleep(500);
      for (let i = 0; i < rows.length; i++) {
        await sleep(280);
        setRevealed(i + 1);
      }
      await sleep(400);
      setDone(true);
      await sleep(500);
      onComplete();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conf = FIELD_CONFIDENCE[bid.id] ?? {};

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Extracted bid data
            <MockBadge label="LLM MOCKED" />
          </span>
        }
        caption="AI extracts the vendor PDF into validated fields. Fields below the confidence threshold require review before they are used as evidence."
        right={
          done ? (
            <span className="font-mono text-[11px] text-cyan">✓ 10/10 fields</span>
          ) : (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-text/50">
              <Loader2 className="h-3 w-3 animate-spin" /> extracting…
            </span>
          )
        }
      />
      <div className="p-4">
        <div className="rounded-lg border border-white/10 bg-[#071510] p-4 font-mono text-[13px] leading-relaxed">
          <span className="text-text/40">{"{"}</span>
          <div className="pl-4">
            {rows.slice(0, revealed).map((r) => {
              const c = conf[r.key];
              const low = c != null && c < CONFIDENCE_THRESHOLD;
              return (
                <motion.div
                  key={r.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-wrap items-center gap-x-2 py-0.5"
                >
                  <span className="text-blue">&quot;{r.label}&quot;</span>
                  <span className="text-text/40">:</span>
                  <span className={r.value.startsWith('"') ? "text-amber" : "text-cyan"}>
                    {r.value}
                  </span>
                  <span className="text-text/30">,</span>
                  {c != null && (
                    <span
                      className={`ml-1 rounded px-1.5 py-0.5 text-[10px] ${
                        low
                          ? "bg-amber/15 text-amber"
                          : "bg-white/5 text-text/35"
                      }`}
                    >
                      conf {c.toFixed(2)}
                    </span>
                  )}
                  {low && (
                    <Tooltip text="low confidence; confirm before use">
                      <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber/15 px-1.5 py-0.5 text-[10px] font-bold text-amber">
                        <AlertTriangle className="h-2.5 w-2.5" /> review needed
                      </span>
                    </Tooltip>
                  )}
                </motion.div>
              );
            })}
          </div>
          {revealed >= rows.length && <span className="text-text/40">{"}"}</span>}
        </div>

        {done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-start gap-2 rounded-lg border border-amber/25 bg-amber/5 px-3 py-2 text-xs text-amber/90"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <b>Review required:</b>{" "}
              {bid.id === "B" ? (
                <>
                  <code className="font-mono">power_draw_kw</code> was a handwritten
                  annotation on the spec sheet (confidence 0.72). It has been flagged
                  for confirmation before it is used as evidence.
                </>
              ) : (
                <>All fields cleared the 0.85 confidence threshold. No review is required.</>
              )}
            </span>
          </motion.div>
        )}
      </div>
    </Card>
  );
}
