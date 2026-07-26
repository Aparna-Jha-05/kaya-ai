"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BidWorkspace from "@/components/bid/BidWorkspace";
import Card from "@/components/ui/Card";
import { procurementApi, type BidRecord } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { recommendationLabel, recommendationTone } from "@/lib/recordUtils";

export default function BidDetailClient({ id }: { id: string }) {
  const [record, setRecord] = useState<BidRecord | null>(null);
  const [state, setState] = useState<"loading" | "live" | "missing">(id === "new" ? "live" : "loading");

  useEffect(() => {
    if (id === "new") return;
    let active = true;
    procurementApi.get(id)
      .then((value) => { if (active) { setRecord(value); setState("live"); } })
      .catch(() => { if (active) setState("missing"); });
    return () => { active = false; };
  }, [id]);

  if (id === "new") return <div className="space-y-6"><Header title="Upload bid" subtitle="Upload a PDF to extract source fields and run deterministic compliance checks." /><BidWorkspace /></div>;
  if (state === "loading") return <div className="space-y-6"><Header title="Loading bid" subtitle="Retrieving the persisted bid record." /><Card className="p-6 text-sm text-text/55">Loading bid review…</Card></div>;
  if (state === "missing") return <div className="space-y-6"><Header title="Bid not found" subtitle="This record is no longer available. It may have been removed or the service is offline." /><Card className="p-6 text-sm text-text/55">Return to the comparison workspace to choose another bid.</Card></div>;
  if (record) {
    const color = recommendationTone(record.scorecard.recommendation) === "rose" ? COLORS.rose : recommendationTone(record.scorecard.recommendation) === "amber" ? COLORS.amber : COLORS.cyan;
    return <div className="space-y-6"><Header title={record.source.vendor_name} subtitle={`${record.source.equipment.equipment_type} · ${record.source.equipment.model_number} · ${record.filename}`} badge={recommendationLabel(record.scorecard.recommendation)} color={color} /><BidWorkspace initialRecord={record} /></div>;
  }
  return null;
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
