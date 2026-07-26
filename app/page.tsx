"use client";

import ActiveBidsTable from "@/components/precinct/ActiveBidsTable";
import CaseFilesPanel from "@/components/precinct/CaseFilesPanel";
import SummaryRow from "@/components/precinct/SummaryRow";

export default function ReviewQueuePage() {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-blue">Review queue</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Prioritise procurement decisions</h1>
          <p className="mt-1 max-w-2xl text-sm text-text/50">
            IIT Smart Campus Phase 1 · chilled-water plant. Start with items that need action, then compare bids or inspect a single bid.
          </p>
        </div>
        <p className="text-xs text-text/40">Demonstration review set</p>
      </div>

      <SummaryRow />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ActiveBidsTable /></div>
        <div><CaseFilesPanel /></div>
      </div>

    </div>
  );
}
