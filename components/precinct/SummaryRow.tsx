"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertOctagon, FileCheck2, FileWarning, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Tooltip from "@/components/ui/Tooltip";
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

  const activeMetrics = metrics || { total: 0, failures: 0, missingDocs: 0, offline: true };

  const cards = [
    {
      label: "Total Active Bids",
      value: activeMetrics.total,
      color: COLORS.cyan,
      Icon: FileCheck2,
      help: "Procurement bids currently ingested and evaluated.",
    },
    {
      label: "Constraint Failures",
      value: activeMetrics.failures,
      color: COLORS.rose,
      Icon: AlertOctagon,
      help: "Bids exceeding engineering limits or carbon budget thresholds.",
    },
    {
      label: "Pending Documentation",
      value: activeMetrics.missingDocs,
      color: COLORS.amber,
      Icon: FileWarning,
      help: "Bids missing safety, OSHA, or compliance certificates.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} accent={card.color} className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Tooltip text={card.help}>
                  <span className="ui-label text-text/60 hover:text-text transition-colors truncate">{card.label}</span>
                </Tooltip>
              </div>
              <div className="mt-3 font-mono text-3xl sm:text-4xl font-extrabold tabular-nums" style={{ color: card.color }}>
                {loading ? "…" : card.value}
              </div>
            </div>
            <card.Icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: card.color }} />
          </div>
        </Card>
      ))}
    </div>
  );
}
