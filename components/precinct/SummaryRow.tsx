"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertOctagon, FileCheck2, FileWarning, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import { procurementApi, type BidRecord } from "@/lib/api";
import { hasHardFailure } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";

type Metrics = { total: number; failures: number; missingDocs: number; offline: boolean };
function fromRecords(records: BidRecord[]): Metrics {
  return {
    total: records.length,
    failures: records.filter(hasHardFailure).length,
    missingDocs: records.filter((record) => record.source.has_osha_cert === false).length,
    offline: records.length === 0,
  };
}

export default function SummaryRow() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);
    procurementApi
      .list()
      .then((records) => {
        setMetrics(fromRecords(records));
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose/30 bg-rose/10 p-4 text-sm text-rose flex items-center justify-between">
        <span>Service offline or starting up: {error}</span>
        <button
          type="button"
          onClick={fetchMetrics}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose/20 px-3 py-1.5 text-xs font-semibold text-rose hover:bg-rose/30"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry connection
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: "Submitted bids",
      value: metrics?.total,
      color: COLORS.text,
      Icon: FileCheck2,
      sub: metrics?.offline ? "no service connection" : "in the current review set",
    },
    {
      label: "Hard-limit failures",
      value: metrics?.failures,
      color: COLORS.rose,
      Icon: AlertOctagon,
      sub: "engineering or carbon constraint exceeded",
    },
    {
      label: "Documents missing",
      value: metrics?.missingDocs,
      color: COLORS.amber,
      Icon: FileWarning,
      sub: "safety certificates not on record",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} accent={card.color} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-text/45">{card.label}</div>
              <div className="mt-2 font-mono text-4xl font-bold tabular-nums" style={{ color: card.color }}>
                {loading ? "…" : (metrics ? card.value : "—")}
              </div>
              <div className="mt-1 text-xs text-text/40">{card.sub}</div>
            </div>
            <card.Icon className="h-5 w-5" style={{ color: card.color }} />
          </div>
        </Card>
      ))}
    </div>
  );
}
