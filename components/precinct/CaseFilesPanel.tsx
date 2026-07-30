"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSearch, Mail, RefreshCw } from "lucide-react";
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
        title={
          <Tooltip text="Pending reviewer tasks requiring verification before purchase order sign-off.">
            <span>Action queue</span>
          </Tooltip>
        }
      />
      <ul className="divide-y divide-line/40">
        {source === "loading" && (
          <li className="px-4.5 py-6 text-sm font-medium text-text/50">Loading action queue…</li>
        )}

        {source === "error" && (
          <li className="p-4.5 space-y-3">
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
                  className="flex gap-3 px-4.5 py-3.5 transition-colors duration-150 hover:bg-cyan/5 dark:hover:bg-cyan/10"
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-xs"
                    style={{ backgroundColor: `${item.color}1a` }}
                  >
                    <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-snug text-text">{item.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-text/50">{item.meta}</span>
                      {item.action && (
                        <span className="rounded-md bg-violet/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-violet border border-violet/20">
                          action needed
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-4.5 py-6 text-sm font-medium text-text/50">No actions need review.</li>
          ))}
      </ul>
    </Card>
  );
}
