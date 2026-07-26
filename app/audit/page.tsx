"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AuditRow, appendAudit, downloadCsv, getAudit, subscribeAudit } from "@/lib/audit";
import { BIDS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { PATROL_META } from "@/lib/constants";
import Card, { CardHeader } from "@/components/ui/Card";
import { Download, Lock } from "lucide-react";
import Link from "next/link";

function seed() { for (const bid of BIDS) { const results = runAllPatrols(bid); (["building", "green", "vice", "traffic"] as const).forEach((key) => { const result = results[key]; appendAudit({ bid: bid.vendor, patrol: PATROL_META[key].name, action: result.status, rule: result.rule, evidence: result.evidence.join(" | ") }); }); } }
function statusColor(action: string) { return action.includes("FAIL") ? "text-rose" : action.includes("FLAG") ? "text-amber" : action.includes("PASS") ? "text-cyan" : "text-violet"; }

export default function AuditPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { seed(); setMounted(true); }, []);
  const rows = useSyncExternalStore(subscribeAudit, getAudit, () => [] as AuditRow[]);
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-text"><Lock className="h-5 w-5 text-cyan" /> Activity log</h1><p className="mt-1 text-sm text-text/50">Timestamped checks and reviewer actions.</p></div><button onClick={() => downloadCsv()} className="inline-flex items-center gap-2 rounded-lg bg-cyan/15 px-4 py-2 text-sm font-medium text-cyan transition-colors hover:bg-cyan/25"><Download className="h-4 w-4" /> Export CSV</button></div><Card><CardHeader title={`${rows.length} recorded events`} caption="Sample events remain clearly local to this browser session." right={<Link href="/bids/B" className="text-xs text-blue hover:underline">Open flagged bid →</Link>} /><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40"><th className="px-4 py-2.5">Timestamp</th><th className="px-4 py-2.5">Bid</th><th className="px-4 py-2.5">Compliance check</th><th className="px-4 py-2.5">Action</th><th className="px-4 py-2.5">Rule</th><th className="px-4 py-2.5">Evidence</th></tr></thead><tbody className="font-mono text-[12px]">{!mounted || !rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-text/40">No events yet.</td></tr> : rows.map((row, index) => <tr key={`${row.timestamp}-${index}`} className="border-b border-white/5 align-top hover:bg-white/[0.02]"><td className="whitespace-nowrap px-4 py-2.5 text-text/50">{new Date(row.timestamp).toLocaleTimeString("en-GB")}</td><td className="whitespace-nowrap px-4 py-2.5 text-text/80">{row.bid}</td><td className="whitespace-nowrap px-4 py-2.5 text-text/70">{row.patrol}</td><td className={`whitespace-nowrap px-4 py-2.5 font-bold ${statusColor(row.action)}`}>{row.action}</td><td className="max-w-[280px] px-4 py-2.5 text-text/55">{row.rule}</td><td className="max-w-[320px] px-4 py-2.5 text-text/40">{row.evidence}</td></tr>)}</tbody></table></div></Card></div>;
}
