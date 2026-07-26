"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSearch, Mail } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import { procurementApi, type BidRecord } from "@/lib/api";
import { BIDS } from "@/lib/mockData";
import { displayCheckName } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";

type Item = { id: string; bidId: string; icon: typeof Mail; color: string; title: string; meta: string; action: boolean };
function liveItems(records: BidRecord[]): Item[] { return records.flatMap((record) => { const entries: Item[] = []; if (record.source.has_osha_cert === false) entries.push({ id: `${record.id}-rfi`, bidId: record.id, icon: Mail, color: COLORS.violet, title: `Safety certificate needed for ${record.source.vendor_name}`, meta: "Open the RFI draft", action: true }); record.scorecard.patrol_results.filter((check) => check.status !== "PASS").forEach((check) => entries.push({ id: `${record.id}-${check.patrol_name}`, bidId: record.id, icon: FileSearch, color: check.status === "FAIL" ? COLORS.rose : COLORS.amber, title: `Open ${displayCheckName(check.patrol_name).toLowerCase()} review for ${record.source.vendor_name}`, meta: check.reason, action: check.status === "FAIL" })); if (record.scorecard.recommendation === "RECOMMENDED") entries.push({ id: `${record.id}-decision`, bidId: record.id, icon: CheckCircle2, color: COLORS.cyan, title: `Open decision review for ${record.source.vendor_name}`, meta: "Confirm evidence and record review", action: false }); return entries; }); }
function fallbackItems(): Item[] { return [{ id: "B-rfi", bidId: "B", icon: Mail, color: COLORS.violet, title: "Safety certificate needed for Vendor B", meta: "Sample RFI draft awaiting review", action: true }, { id: "B-reliability", bidId: "B", icon: FileSearch, color: COLORS.amber, title: "Review Vendor B delivery record", meta: "Sample evidence only", action: false }, { id: "A-decision", bidId: "A", icon: CheckCircle2, color: COLORS.cyan, title: "Vendor A ready for decision", meta: "Sample bid", action: false }]; }

export default function CaseFilesPanel() {
  const [records, setRecords] = useState<BidRecord[] | null>(null);
  const [source, setSource] = useState<"loading" | "live" | "fallback">("loading");
  useEffect(() => { let active = true; procurementApi.list().then((items) => { if (active) { setRecords(items); setSource("live"); } }).catch(() => active && setSource("fallback")); return () => { active = false; }; }, []);
  const items = useMemo(() => records ? liveItems(records) : source === "fallback" ? fallbackItems() : [], [records, source]);
  return <Card><CardHeader title="Action queue" caption={source === "fallback" ? "Sample fallback. Connect the bid service to act on persisted records." : "Items that need reviewer attention before a purchase order can progress."} /><ul className="divide-y divide-white/5">{source === "loading" ? <li className="px-4 py-6 text-sm text-text/50">Loading action queue…</li> : items.length ? items.map((item) => <li key={item.id}><Link href={`/bids/${item.bidId}`} className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${item.color}1a` }}><item.icon className="h-3.5 w-3.5" style={{ color: item.color }} /></span><span className="min-w-0"><span className="block text-xs leading-snug text-text/85">{item.title}</span><span className="mt-1 flex items-center gap-2"><span className="text-[11px] text-text/40">{item.meta}</span>{item.action && <span className="rounded bg-violet/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-violet">action needed</span>}</span></span></Link></li>) : <li className="px-4 py-6 text-sm text-text/50">No actions need review.</li>}</ul></Card>;
}
