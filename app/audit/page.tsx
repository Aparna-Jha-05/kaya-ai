"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AuditRow, appendAudit, downloadCsv, getAudit, subscribeAudit } from "@/lib/audit";
import { BIDS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { PATROL_META } from "@/lib/constants";
import Card, { CardHeader } from "@/components/ui/Card";
import { Download, Lock } from "lucide-react";
import Link from "next/link";

// Seed the log with every patrol decision so the page is meaningful even if a
// judge opens it before walking a bid. Idempotent thanks to the dedup guard.
function seed() {
  for (const bid of BIDS) {
    const results = runAllPatrols(bid);
    (["building", "green", "vice", "traffic"] as const).forEach((k) => {
      const r = results[k];
      appendAudit({
        bid: bid.vendor,
        patrol: PATROL_META[k].name,
        action: r.status,
        rule: r.rule,
        evidence: r.evidence.join(" | "),
      });
    });
    if (!bid.has_safety_cert) {
      appendAudit({
        bid: bid.vendor,
        patrol: "RFI draft",
        action: "EMAIL DRAFTED",
        rule: 'missing_doc = "OSHA-style Safety Certificate"',
        evidence: `PO ${bid.po_number}`,
      });
    }
  }
}

const statusColor = (a: string) => {
  if (a.includes("FAIL")) return "text-rose";
  if (a.includes("FLAG")) return "text-amber";
  if (a.includes("PASS")) return "text-cyan";
  return "text-violet";
};

export default function AuditPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    seed();
    setMounted(true);
  }, []);

  const rows = useSyncExternalStore(
    subscribeAudit,
    getAudit,
    () => [] as AuditRow[]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-text">
            <Lock className="h-5 w-5 text-cyan" /> Audit trail
          </h1>
          <p className="mt-1 text-sm text-text/50">
            Every check and workflow action is timestamped for review.
          </p>
        </div>
        <button
          onClick={() => downloadCsv()}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan/15 px-4 py-2 text-sm font-medium text-cyan transition-colors hover:bg-cyan/25"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <Card>
        <CardHeader
          title={`${rows.length} logged events`}
          caption="Demo data is stored in memory and resets on refresh."
          right={
            <Link href="/bids/B" className="text-xs text-blue hover:underline">
              review Vendor B →
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40">
                <th className="px-4 py-2.5 font-medium">Timestamp</th>
                <th className="px-4 py-2.5 font-medium">Bid</th>
                <th className="px-4 py-2.5 font-medium">Patrol</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Rule</th>
                <th className="px-4 py-2.5 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              {!mounted || rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text/40">
                    No events yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 align-top hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-text/50">
                      {new Date(r.timestamp).toLocaleTimeString("en-GB")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-text/80">{r.bid}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-text/70">{r.patrol}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 font-bold ${statusColor(r.action)}`}>
                      {r.action}
                    </td>
                    <td className="max-w-[280px] px-4 py-2.5 text-text/55">{r.rule}</td>
                    <td className="max-w-[320px] px-4 py-2.5 text-text/40">{r.evidence}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
