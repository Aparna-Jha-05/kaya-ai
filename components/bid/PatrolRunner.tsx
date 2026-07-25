"use client";
import { useEffect, useRef, useState } from "react";
import { Bid } from "@/lib/mockData";
import { runAllPatrols, PatrolResult, TrafficResult } from "@/lib/patrols";
import { sleep } from "@/lib/simulate";
import { PATROL_META, COLORS } from "@/lib/constants";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import MockBadge from "@/components/ui/MockBadge";
import Tooltip from "@/components/ui/Tooltip";
import { appendAudit } from "@/lib/audit";
import { Building2, Leaf, ShieldAlert, Truck, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICONS = { Building2, Leaf, ShieldAlert, Truck };

export interface PatrolBundle {
  building: PatrolResult;
  green: PatrolResult;
  vice: PatrolResult;
  traffic: TrafficResult;
}

const ORDER: (keyof PatrolBundle)[] = ["building", "green", "vice", "traffic"];

export default function PatrolRunner({
  bid,
  onComplete,
}: {
  bid: Bid;
  onComplete: (bundle: PatrolBundle) => void;
}) {
  const results = useRef(runAllPatrols(bid) as PatrolBundle);
  const [active, setActive] = useState(-1); // index currently "running"
  const [revealed, setRevealed] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      for (let i = 0; i < ORDER.length; i++) {
        setActive(i);
        await sleep(750); // "running"
        setRevealed(i + 1);
        setActive(-1);
        // Append to immutable audit log as each patrol decides.
        const key = ORDER[i];
        const r = results.current[key];
        const meta = PATROL_META[key];
        appendAudit({
          bid: bid.vendor,
          patrol: meta.name,
          action: r.status,
          rule: r.rule,
          evidence: r.evidence.join(" | "),
        });
        await sleep(300);
      }
      await sleep(300);
      onComplete(results.current);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader
        title="Compliance checks"
        caption="Each result is calculated from extracted bid data and fixed rules. AI does not decide pass or fail."
        right={
          revealed < ORDER.length ? (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-text/50">
              <Loader2 className="h-3 w-3 animate-spin" /> {revealed}/4 run
            </span>
          ) : (
            <span className="font-mono text-[11px] text-green">✓ 4/4 complete</span>
          )
        }
      />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {ORDER.map((key, i) => {
          const meta = PATROL_META[key];
          const r = results.current[key];
          const Icon = ICONS[meta.icon as keyof typeof ICONS];
          const isActive = active === i;
          const isRevealed = revealed > i;
          const isTraffic = key === "traffic";

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: isRevealed || isActive ? 1 : 0.35 }}
              className="relative overflow-hidden rounded-lg border bg-[#071510]"
              style={{
                borderColor: isActive
                  ? meta.color
                  : isRevealed
                  ? `${meta.color}44`
                  : "rgba(255,255,255,0.08)",
                boxShadow: isActive ? `0 0 16px ${meta.color}40` : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${meta.color}1a` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-text">
                      <Tooltip term={meta.name}>{meta.name}</Tooltip>
                    </div>
                    <div className="text-[10px] text-text/40">{meta.caption}</div>
                  </div>
                </div>
                <div className="shrink-0">
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: meta.color }} />
                  ) : isRevealed ? (
                    <PatrolBadge status={r.status} size="sm" />
                  ) : (
                    <span className="font-mono text-[10px] text-text/30">queued</span>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isRevealed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-white/5 px-3 py-2.5"
                  >
                    <p className="text-xs text-text/70">{r.detail}</p>
                    <code
                      className="mt-2 block break-words rounded bg-black/30 px-2 py-1.5 font-mono text-[10.5px]"
                      style={{ color: `${meta.color}dd` }}
                    >
                      {r.rule}
                    </code>

                    {isTraffic && (
                      <div className="mt-2 flex items-center gap-3">
                        <TrafficReadout r={results.current.traffic} />
                      </div>
                    )}

                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="mt-2 flex items-center gap-1 text-[10px] text-text/40 hover:text-text/70"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${expanded === i ? "rotate-180" : ""}`}
                      />
                      {key === "vice" ? "retrieved evidence" : "evidence"}
                    </button>
                    <AnimatePresence>
                      {expanded === i && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-1.5 space-y-1 overflow-hidden"
                        >
                          {r.evidence.map((e, j) => (
                            <li key={j} className="flex gap-1.5 text-[11px] text-text/55">
                              <span style={{ color: meta.color }}>›</span>
                              <span className="font-mono">{e}</span>
                            </li>
                          ))}
                          {isTraffic && (
                            <li className="flex items-center gap-1.5 pt-1 text-[11px] text-text/55">
                              <span style={{ color: COLORS.blue }}>›</span>
                              <span>planning handoff pending</span>
                              <MockBadge />
                            </li>
                          )}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

function TrafficReadout({ r }: { r: TrafficResult }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-md border border-blue/25 bg-blue/5 px-2.5 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-blue/70">
        delay exposure
      </span>
      <span className="font-mono text-xs text-text">
        p50 <b className="text-blue">{r.p50_days}d</b> · p95{" "}
        <b className="text-blue">{r.p95_days}d</b>
      </span>
    </div>
  );
}
