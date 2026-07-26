"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BidWorkspace from "@/components/bid/BidWorkspace";
import BidReviewWorkspace from "@/components/bid/BidReviewWorkspace";
import Card from "@/components/ui/Card";
import { procurementApi, type BidRecord } from "@/lib/api";
import { BIDS, getBid } from "@/lib/mockData";
import { COLORS } from "@/lib/constants";
import { recommendationLabel, recommendationTone } from "@/lib/recordUtils";

export default function BidDetailClient({ id }: { id: string }) {
  const sample = useMemo(() => getBid(id), [id]);
  const [record, setRecord] = useState<BidRecord | null>(null);
  const [state, setState] = useState<"loading" | "live" | "fallback" | "missing">(id === "new" ? "live" : "loading");

  useEffect(() => {
    if (id === "new") return;
    let active = true;
    procurementApi.get(id).then((value) => { if (active) { setRecord(value); setState("live"); } }).catch(() => { if (active) setState(sample ? "fallback" : "missing"); });
    return () => { active = false; };
  }, [id, sample]);

  if (id === "new") return <div className="space-y-6"><Header title="Upload bid" subtitle="Upload a PDF to extract source fields and run deterministic compliance checks." /><BidWorkspace /></div>;
  if (state === "loading") return <div className="space-y-6"><Header title="Loading bid" subtitle="Retrieving the persisted bid record." /><Card className="p-6 text-sm text-text/55">Loading bid review…</Card></div>;
  if (state === "missing") return <div className="space-y-6"><Header title="Bid not found" subtitle="This record is no longer available from the bid service." /><Card className="p-6 text-sm text-text/55">Return to the comparison workspace to choose another bid.</Card></div>;
  if (record) {
    const color = recommendationTone(record.scorecard.recommendation) === "rose" ? COLORS.rose : recommendationTone(record.scorecard.recommendation) === "amber" ? COLORS.amber : COLORS.cyan;
    return <div className="space-y-6"><Header title={record.source.vendor_name} subtitle={`${record.source.equipment.equipment_type} · ${record.source.equipment.model_number} · ${record.filename}`} badge={recommendationLabel(record.scorecard.recommendation)} color={color} /><BidWorkspace initialRecord={record} /></div>;
  }
  if (!sample) return null;
  const isReject = sample.recommendation === "REJECT";
  return <div className="space-y-6"><Header title={sample.vendor} subtitle={`${sample.equipment_type} · ${sample.model} · ${sample.po_number}`} badge={isReject ? "Do not select" : sample.recommendation === "RECOMMENDED" ? "Ready for decision" : "Needs review"} color={isReject ? COLORS.rose : sample.recommendation === "RECOMMENDED" ? COLORS.cyan : COLORS.amber} /><p className="rounded-lg border border-amber/25 bg-amber/5 px-4 py-2.5 text-sm text-amber/90">Sample fallback is shown because the bid service is unavailable. It cannot record actions or replace an uploaded record.</p><div className="flex gap-2">{BIDS.map((bid) => <Link key={bid.id} href={`/bids/${bid.id}`} className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${bid.id === sample.id ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-white/10 text-text/50 hover:border-white/25 hover:text-text"}`}>{bid.vendor.replace("Vendor ", "V")}</Link>)}</div><BidReviewWorkspace bid={sample} key={sample.id} /></div>;
}

function Header({ title, subtitle, badge, color }: { title: string; subtitle: string; badge?: string; color?: string }) {
  return (
    <div>
      <Link href="/bids" className="mb-3 inline-flex items-center gap-1.5 text-xs text-text/50 hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to comparison
      </Link>
      <p className="page-eyebrow mt-1">Bid review</p>
      <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-text">
        {title}
        {badge && (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase" style={{ color, backgroundColor: `${color}1a` }}>
            {badge}
          </span>
        )}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-text/50">{subtitle}</p>
    </div>
  );
}
