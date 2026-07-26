"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, FileCheck2, FileWarning } from "lucide-react";
import Card from "@/components/ui/Card";
import { procurementApi, type BidRecord } from "@/lib/api";
import { BIDS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { hasHardFailure } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";

type Metrics = { total: number; failures: number; missingDocs: number; fallback: boolean };
function fallback(): Metrics { return { total: BIDS.length, failures: BIDS.filter((bid) => { const checks = runAllPatrols(bid); return checks.building.status === "FAIL" || checks.green.status === "FAIL"; }).length, missingDocs: BIDS.filter((bid) => !bid.has_safety_cert).length, fallback: true }; }
function fromRecords(records: BidRecord[]): Metrics { return { total: records.length, failures: records.filter(hasHardFailure).length, missingDocs: records.filter((record) => record.source.has_osha_cert === false).length, fallback: false }; }

export default function SummaryRow() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  useEffect(() => { let active = true; procurementApi.list().then((records) => active && setMetrics(fromRecords(records))).catch(() => active && setMetrics(fallback())); return () => { active = false; }; }, []);
  const cards = [{ label: "Submitted bids", value: metrics?.total, color: COLORS.text, Icon: FileCheck2, sub: metrics?.fallback ? "sample fallback set" : "in the current review set" }, { label: "Hard-limit failures", value: metrics?.failures, color: COLORS.rose, Icon: AlertOctagon, sub: "engineering or carbon constraint exceeded" }, { label: "Documents missing", value: metrics?.missingDocs, color: COLORS.amber, Icon: FileWarning, sub: "safety certificates not on record" }];
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{cards.map((card) => <Card key={card.label} accent={card.color} className="p-4"><div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-wide text-text/45">{card.label}</div><div className="mt-2 font-mono text-4xl font-bold tabular-nums" style={{ color: card.color }}>{metrics ? card.value : "—"}</div><div className="mt-1 text-xs text-text/40">{card.sub}</div></div><card.Icon className="h-5 w-5" style={{ color: card.color }} /></div></Card>)}</div>;
}
