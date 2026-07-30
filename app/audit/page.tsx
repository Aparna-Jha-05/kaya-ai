"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import { procurementApi, type ActivityEvent, type BidRecord } from "@/lib/api";
import { activityActionLabel, displayCheckName } from "@/lib/recordUtils";
import { allScorecardsFromRecords, type ScorecardRow } from "@/lib/tco";
import { COLORS } from "@/lib/constants";

function statusColor(action: string) {
  if (action.includes("FAIL") || action.includes("DO_NOT_SELECT")) return "text-rose";
  if (action.includes("FLAG") || action.includes("RFI")) return "text-amber";
  if (action.includes("PASS") || action.includes("READY")) return "text-cyan";
  return "text-violet";
}

function exportCsv(rows: ActivityEvent[]) {
  const values = [
    ["Timestamp", "Bid ID", "Check", "Action", "Rule", "Evidence"],
    ...rows.map((ev) => [ev.timestamp, ev.bid_id, ev.check_name, ev.action, ev.rule, ev.evidence]),
  ];
  const csv = values.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "po-lice-activity.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function passFailCell(value: "PASS" | "FAIL" | "FLAG") {
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
        value === "FAIL" ? "bg-rose/15 text-rose" : value === "FLAG" ? "bg-amber/15 text-amber" : "bg-cyan/10 text-cyan"
      }`}
    >
      {value}
    </span>
  );
}

function riskCell(value: "Low" | "Med" | "High" | "Unknown") {
  const color = value === "High" ? "text-rose" : value === "Low" ? "text-cyan" : "text-amber";
  return <span className={`font-mono text-xs font-semibold ${color}`}>{value}</span>;
}

function decisionCell(value: ScorecardRow["decision"]) {
  const color = value === "REJECT" ? COLORS.rose : value === "RECOMMENDED" ? COLORS.cyan : COLORS.amber;
  const label = value === "REJECT" ? "Do not select" : value === "RECOMMENDED" ? "Ready" : "Needs review";
  return (
    <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color, backgroundColor: `${color}18` }}>
      {label}
    </span>
  );
}

export default function AuditPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [records, setRecords] = useState<BidRecord[]>([]);
  const [evState, setEvState] = useState<"loading" | "ready" | "offline">("loading");
  const [recState, setRecState] = useState<"loading" | "ready" | "offline">("loading");

  const loadData = useCallback(() => {
    setEvState("loading");
    setRecState("loading");
    procurementApi
      .activity()
      .then((items) => {
        setEvents(items);
        setEvState("ready");
      })
      .catch(() => setEvState("offline"));

    procurementApi
      .list()
      .then((items) => {
        setRecords(items);
        setRecState("ready");
      })
      .catch(() => setRecState("offline"));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scorecards = allScorecardsFromRecords(records);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-eyebrow">System audit</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Activity log</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text/50">
            Timestamped compliance checks, reviewer actions, and bid scorecard summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(evState === "offline" || recState === "offline") && (
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-sm font-semibold text-amber hover:bg-amber/20"
            >
              <RefreshCw className="h-4 w-4" /> Retry connection
            </button>
          )}
          <button
            type="button"
            onClick={() => exportCsv(events)}
            disabled={evState !== "ready" || events.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan/15 px-4 py-2 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Compliance Scorecard Summary */}
      <Card>
        <CardHeader
          title={recState === "ready" ? `${scorecards.length} bid scorecard${scorecards.length === 1 ? "" : "s"}` : "Compliance scorecard"}
          caption="Per-bid summary of all four patrol results and 5-year TCO²."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[20%] min-w-[150px]" />
              <col className="w-[11%] whitespace-nowrap" />
              <col className="w-[11%] whitespace-nowrap" />
              <col className="w-[11%] whitespace-nowrap" />
              <col className="w-[11%] whitespace-nowrap" />
              <col className="w-[11%] whitespace-nowrap" />
              <col className="w-[12%] whitespace-nowrap" />
              <col className="w-[13%] whitespace-nowrap" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 table-header text-left">
                <th className="px-4 py-2.5">Vendor</th>
                <th className="px-4 py-2.5">Upfront</th>
                <th className="px-4 py-2.5">Engineering</th>
                <th className="px-4 py-2.5">Carbon</th>
                <th className="px-4 py-2.5">Vendor risk</th>
                <th className="px-4 py-2.5">Schedule risk</th>
                <th className="px-4 py-2.5">5-yr TCO²</th>
                <th className="px-4 py-2.5">Decision</th>
              </tr>
            </thead>
            <tbody>
              {recState === "loading" ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-text/40">
                    Loading scorecard…
                  </td>
                </tr>
              ) : recState === "offline" ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-rose">
                    Scorecard service connection failed. Click &quot;Retry connection&quot; above.
                  </td>
                </tr>
              ) : scorecards.length ? (
                scorecards.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 align-middle hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-text">{row.vendor}</td>
                    <td className="px-4 py-3 font-mono text-text/80">
                      {row.upfront_cost_cr == null ? "—" : `₹${row.upfront_cost_cr.toFixed(2)} Cr`}
                    </td>
                    <td className="px-4 py-3">{passFailCell(row.engineering)}</td>
                    <td className="px-4 py-3">{passFailCell(row.carbon)}</td>
                    <td className="px-4 py-3">{riskCell(row.vendorRisk)}</td>
                    <td className="px-4 py-3">{riskCell(row.scheduleRisk)}</td>
                    <td className="px-4 py-3 font-mono text-text/80">
                      {row.tco2_cr == null ? "—" : `₹${row.tco2_cr.toFixed(2)} Cr`}
                    </td>
                    <td className="px-4 py-3">{decisionCell(row.decision)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-text/40">
                    No submitted bids yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Activity Event Log */}
      {evState === "offline" && (
        <p className="rounded-lg border border-amber/25 bg-amber/5 px-4 py-2.5 text-sm text-amber/90">
          The activity service is unavailable. Click &quot;Retry connection&quot; above when the service is online.
        </p>
      )}
      <Card>
        <CardHeader
          title={evState === "ready" ? `${events.length} recorded events` : "Recorded events"}
          caption={evState === "ready" ? "Export includes the server-recorded activity currently shown." : "Connect the activity service to view and export events."}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[18%] min-w-[150px]" />
              <col className="w-[12%] min-w-[90px]" />
              <col className="w-[18%] min-w-[130px]" />
              <col className="w-[12%] min-w-[100px]" />
              <col className="w-[15%] min-w-[110px]" />
              <col className="w-[25%] min-w-[200px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 table-header text-left">
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Bid</th>
                <th className="px-4 py-2.5">Compliance check</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Rule</th>
                <th className="px-4 py-2.5">Evidence</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              {evState === "loading" ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text/40">
                    Loading activity…
                  </td>
                </tr>
              ) : events.length ? (
                events.map((ev) => (
                  <tr key={ev.id} className="border-b border-white/5 align-top hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-text/50">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-text/80">{ev.bid_id}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-text/70">{displayCheckName(ev.check_name)}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 font-bold ${statusColor(ev.action)}`}>{activityActionLabel(ev.action)}</td>
                    <td className="max-w-[280px] px-4 py-2.5 text-text/55">{ev.rule}</td>
                    <td className="max-w-[320px] px-4 py-2.5 text-text/40">{ev.evidence}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text/40">
                    No server-recorded events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
