"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSearch, Mail, RefreshCw } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import Tooltip from "@/components/ui/Tooltip";
import { procurementApi, type BidRecord } from "@/lib/api";
import { displayCheckName } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";

type Item = {
  id: string;
  bidId: string;
  icon: typeof Mail;
  color: string;
  title: string;
  meta: string;
  action: boolean;
};

function liveItems(records: BidRecord[]): Item[] {
  return records.flatMap((record) => {
    const entries: Item[] = [];
    if (record.source.has_osha_cert === false)
      entries.push({
        id: `${record.id}-rfi`,
        bidId: record.id,
        icon: Mail,
        color: COLORS.violet,
        title: `Safety certificate needed for ${record.source.vendor_name}`,
        meta: "Open the RFI draft",
        action: true,
      });
    record.scorecard.patrol_results
      .filter((check) => check.status !== "PASS")
      .forEach((check) =>
        entries.push({
          id: `${record.id}-${check.patrol_name}`,
          bidId: record.id,
          icon: FileSearch,
          color: check.status === "FAIL" ? COLORS.rose : COLORS.amber,
          title: `Open ${displayCheckName(check.patrol_name).toLowerCase()} review for ${record.source.vendor_name}`,
          meta: check.reason,
          action: check.status === "FAIL",
        })
      );
    if (record.scorecard.recommendation === "RECOMMENDED")
      entries.push({
        id: `${record.id}-decision`,
        bidId: record.id,
        icon: CheckCircle2,
        color: COLORS.cyan,
        title: `Open decision review for ${record.source.vendor_name}`,
        meta: "Confirm evidence and record review",
        action: false,
      });
    return entries;
  });
}

export default function CaseFilesPanel() {
  const [records, setRecords] = useState<BidRecord[] | null>(null);
  const [source, setSource] = useState<"loading" | "live" | "empty" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadData = useCallback(() => {
    setSource("loading");
    setErrorMessage("");
    procurementApi
      .list()
      .then((items) => {
        setRecords(items);
        setSource(items.length > 0 ? "live" : "empty");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Service connection failed");
        setSource("error");
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = useMemo(() => (records ? liveItems(records) : []), [records]);

  return (
    <Card>
      <CardHeader
        title="Action queue"
        caption="Reviewer tasks requiring verification"
      />
      <ul className="divide-y divide-line/40">
        {source === "loading" && (
          <li className="px-5 py-6 sm:px-6 text-sm font-medium text-text/50">Loading action queue…</li>
        )}

        {source === "error" && (
          <li className="p-5 sm:p-6 space-y-3">
            <p className="text-xs font-medium text-rose">{errorMessage}</p>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan/15 px-3 py-1.5 text-xs font-bold text-cyan hover:bg-cyan/25 tactile-press shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </li>
        )}

        {(source === "live" || source === "empty") &&
          (items.length ? (
            items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/bids/${item.bidId}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6 transition-colors duration-150 hover:bg-cyan/5 dark:hover:bg-cyan/10"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-xs"
                      style={{ backgroundColor: `${item.color}1a`, borderColor: `${item.color}40` }}
                    >
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold leading-snug text-text truncate">{item.title}</span>
                      <span className="mt-0.5 block text-xs font-medium text-text/50 truncate">{item.meta}</span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase border shadow-xs"
                    style={{ color: item.color, backgroundColor: `${item.color}1a`, borderColor: `${item.color}40` }}
                  >
                    Review
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-5 py-6 sm:px-6 text-sm font-medium text-text/50">No actions need review.</li>
          ))}
      </ul>
    </Card>
  );
}
