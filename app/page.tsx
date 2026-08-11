"use client";

import ActiveBidsTable from "@/components/precinct/ActiveBidsTable";
import CaseFilesPanel from "@/components/precinct/CaseFilesPanel";
import SummaryRow from "@/components/precinct/SummaryRow";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";

export default function ReviewQueuePage() {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="page-eyebrow">Procurement Intelligence</p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold tracking-tight text-text truncate">Bid Review Queue</h1>
          <p className="mt-1 text-xs font-medium text-text/50">
            Automated procurement compliance, risk evaluation, and TCO² calculation
          </p>
        </div>
        <Link href="/bids/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-bold text-on-accent hover:bg-cyan/90 tactile-press shadow-xs">
          <FilePlus2 className="h-4 w-4" />
          Upload Bid
        </Link>
      </div>

      <SummaryRow />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ActiveBidsTable /></div>
        <div><CaseFilesPanel /></div>
      </div>

    </div>
  );
}
