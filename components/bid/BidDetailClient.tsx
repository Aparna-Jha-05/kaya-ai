"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import BidWorkspace from "@/components/bid/BidWorkspace";
import Card from "@/components/ui/Card";
import { procurementApi, type BidRecord } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { recommendationLabel, recommendationTone } from "@/lib/recordUtils";

export default function BidDetailClient({ id }: { id: string }) {
  const [record, setRecord] = useState<BidRecord | null>(null);
  const [state, setState] = useState<"loading" | "live" | "missing" | "error">(id === "new" ? "live" : "loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadBid = useCallback(() => {
    if (id === "new") return;
    setState("loading");
    setErrorMessage("");
    procurementApi
      .get(id)
      .then((value) => {
        setRecord(value);
        setState("live");
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Could not load bid";
        setErrorMessage(msg);
        if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          setState("missing");
        } else {
          setState("error");
        }
      });
  }, [id]);

  useEffect(() => {
    loadBid();
  }, [loadBid]);

  if (id === "new")
    return (
      <div className="space-y-6">
        <Header
          title="Upload bid"
          subtitle="Upload a PDF to extract source fields and run deterministic compliance checks."
        />
        <BidWorkspace />
      </div>
    );

  if (state === "loading")
    return (
      <div className="space-y-6">
        <Header title="Loading bid" subtitle="Retrieving the persisted bid record." />
        <Card className="p-6 text-sm text-text/55">Loading bid review…</Card>
      </div>
    );

  if (state === "error")
    return (
      <div className="space-y-6">
        <Header
          title="Bid Review"
          subtitle="Connecting to compliance verification service..."
        />
      </div>
    );

  if (state === "missing")
    return (
      <div className="space-y-6">
        <Header
          title="Bid not found"
          subtitle="This record is no longer available in the active queue."
        />
      </div>
    );

  if (record) {
    return (
      <div className="space-y-4">
        <BidWorkspace initialRecord={record} />
      </div>
    );
  }

  return null;
}

function Header({
  title,
  subtitle,
  badge,
  color,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  color?: string;
}) {
  return (
    <div>
      <Link href="/bids" className="mb-3 inline-flex items-center gap-1.5 text-xs text-text/50 hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolio
      </Link>
      <p className="page-eyebrow mt-1">Procurement Review</p>
      <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-text">
        {title}
        {badge && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase border shadow-xs"
            style={
              color
                ? {
                    color,
                    backgroundColor: color.includes("var")
                      ? `rgba(var(--color-cyan), 0.15)`
                      : `${color}1a`,
                    borderColor: color.includes("var")
                      ? `rgba(var(--color-cyan), 0.4)`
                      : `${color}40`,
                  }
                : undefined
            }
          >
            {badge}
          </span>
        )}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-text/50">{subtitle}</p>
    </div>
  );
}
