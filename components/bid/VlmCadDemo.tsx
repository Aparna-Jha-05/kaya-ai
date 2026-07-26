"use client";
import { useEffect, useRef, useState } from "react";
import { Bid, CAD_DIMS, SITE } from "@/lib/mockData";
import { sleep } from "@/lib/simulate";
import Card, { CardHeader } from "@/components/ui/Card";
import MockBadge from "@/components/ui/MockBadge";
import PatrolBadge from "@/components/bid/PatrolBadge";
import { COLORS } from "@/lib/constants";
import { ScanLine } from "lucide-react";
import { motion } from "framer-motion";

export default function VlmCadDemo({
  bid,
  onComplete,
}: {
  bid: Bid;
  onComplete: () => void;
}) {
  const dims = CAD_DIMS[bid.id];
  const [scanning, setScanning] = useState(true);
  const [read, setRead] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await sleep(1600);
      setScanning(false);
      setRead(true);
      await sleep(900);
      onComplete();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pass = dims.weight_kg_m2 <= SITE.floor_load_limit_kg_m2;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-blue" /> Vision-Language Model · Stage 1
            <MockBadge label="VLM MOCKED" />
          </span>
        }
        caption="Reads dimensions straight off the CAD drawing, then checks the equipment's floor load against the structural limit."
      />
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        {/* CAD screenshot */}
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-surface">
          <div className="absolute left-2 top-2 z-10 rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-text/50">
            chiller_footprint_rev-{bid.id}.dwg
          </div>
          <svg viewBox="0 0 320 200" className="h-full w-full">
            {/* room outline */}
            <rect x="20" y="20" width="280" height="160" fill="none" stroke={COLORS.blue} strokeOpacity="0.35" strokeWidth="1.5" />
            {/* chiller footprint */}
            <rect x="70" y="60" width="150" height="90" fill={COLORS.blue} fillOpacity="0.08" stroke={COLORS.blue} strokeWidth="1.5" />
            <rect x="70" y="60" width="150" height="90" fill="none" stroke={COLORS.blue} strokeOpacity="0.4" strokeDasharray="4 3" strokeWidth="1" />
            {/* dimension lines */}
            <line x1="70" y1="45" x2="220" y2="45" stroke={COLORS.text} strokeOpacity="0.3" strokeWidth="0.75" />
            <text x="145" y="41" fill={COLORS.text} fillOpacity="0.5" fontSize="9" textAnchor="middle" fontFamily="monospace">
              {dims.footprint_m.split(" × ")[0]} m
            </text>
            <line x1="235" y1="60" x2="235" y2="150" stroke={COLORS.text} strokeOpacity="0.3" strokeWidth="0.75" />
            <text x="248" y="108" fill={COLORS.text} fillOpacity="0.5" fontSize="9" textAnchor="middle" fontFamily="monospace">
              {dims.footprint_m.split(" × ")[1]} m
            </text>
            <text x="145" y="110" fill={COLORS.blue} fontSize="10" textAnchor="middle" fontFamily="monospace" opacity="0.7">
              CHILLER UNIT
            </text>
            {/* scanning line */}
            {scanning && (
              <motion.line
                x1="20" x2="300" y1="20" y2="20"
                stroke={COLORS.cyan}
                strokeWidth="2"
                initial={{ y1: 20, y2: 20 }}
                animate={{ y1: [20, 180, 20], y2: [20, 180, 20] }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
                style={{ filter: `drop-shadow(0 0 4px ${COLORS.cyan})` }}
              />
            )}
          </svg>
        </div>

        {/* extracted output */}
        <div className="flex flex-col justify-center gap-3">
          {scanning ? (
            <div className="flex items-center gap-2 font-mono text-sm text-text/50">
              <span className="h-2 w-2 animate-ping rounded-full bg-cyan" />
              reading drawing geometry…
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 font-mono text-sm">
              <Row label="footprint" value={`${dims.footprint_m} m`} />
              <Row label="floor_load_kg_m2 (read)" value={String(dims.weight_kg_m2)} />
              <Row label="floor_load_limit_kg_m2" value={String(SITE.floor_load_limit_kg_m2)} muted />
              <div className="!mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-surface px-3 py-2">
                <span className="text-xs text-text/60">Structural tolerance</span>
                <PatrolBadge status={pass ? "PASS" : "FAIL"} />
              </div>
              {!pass && (
                <p className="text-xs text-rose/90">
                  {dims.weight_kg_m2} &gt; {SITE.floor_load_limit_kg_m2} kg/m² — floor-load
                  breach. Structural sign-off required.
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-blue/80">{label}</span>
      <span className={muted ? "text-text/40" : "text-text"}>{value}</span>
    </div>
  );
}
