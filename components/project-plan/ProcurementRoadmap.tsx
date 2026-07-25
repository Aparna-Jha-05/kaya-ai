"use client";

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";

const MILESTONES = [
  { title: "Select compliant equipment", condition: "Depends on bid decision", owner: "Procurement reviewer", output: "Selected bid and decision rationale" },
  { title: "Issue purchase order", condition: "Requires approved RFI or selected bid", owner: "Procurement lead", output: "Authorized purchase order" },
  { title: "Confirm delivery commitment", condition: "Requires vendor acceptance", owner: "Supplier manager", output: "Confirmed delivery milestone" },
];

export default function ProcurementRoadmap() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = MILESTONES[selectedIndex];

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><Card><CardHeader title="Procurement decision roadmap" caption="One shared roadmap updates its detail panel as the selected milestone changes." /><ol className="divide-y divide-white/5">{MILESTONES.map((milestone, index) => <li key={milestone.title}><button type="button" onClick={() => setSelectedIndex(index)} className={`flex w-full gap-4 px-4 py-4 text-left transition-colors ${selectedIndex === index ? "bg-blue/[0.08]" : "hover:bg-white/[0.025]"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue/10 font-mono text-xs text-blue">{index + 1}</span><span><span className="block text-sm font-medium text-text">{milestone.title}</span><span className="mt-1 block text-xs text-text/55">{milestone.condition} · {milestone.owner}</span></span></button></li>)}</ol></Card><Card accent="#60A5FA" className="p-5"><p className="font-mono text-[10px] uppercase tracking-wider text-text/40">Selected milestone</p><h2 className="mt-1 text-lg font-semibold text-text">{selected.title}</h2><dl className="mt-5 space-y-4 border-y border-white/10 py-4 text-sm"><div><dt className="text-xs text-text/40">Entry condition</dt><dd className="mt-1 text-text/75">{selected.condition}</dd></div><div><dt className="text-xs text-text/40">Owner</dt><dd className="mt-1 text-text/75">{selected.owner}</dd></div><div><dt className="text-xs text-text/40">Expected output</dt><dd className="mt-1 text-text/75">{selected.output}</dd></div></dl><p className="mt-4 text-xs leading-relaxed text-text/55">Dates, dependencies, and float are not available in the current source data, so this remains a decision roadmap rather than a Gantt chart.</p></Card></div>;
}
