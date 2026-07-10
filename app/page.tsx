import SummaryRow from "@/components/precinct/SummaryRow";
import ActiveBidsTable from "@/components/precinct/ActiveBidsTable";
import CaseFilesPanel from "@/components/precinct/CaseFilesPanel";
import MockBadge from "@/components/ui/MockBadge";

export default function PrecinctPage() {
  return (
    <div className="space-y-6">
      {/* Hero / thesis line */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            The Precinct
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text/50">
            Amber&apos;s procurement enforcement layer for{" "}
            <span className="text-text/80">IIT Smart Campus Phase 1</span> — a data
            center chilled-water plant. LLM extracts and explains; deterministic
            SQL/math validates.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text/40">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green" /> Kaya / Amber webhook
          </span>
          <MockBadge />
        </div>
      </div>

      <SummaryRow />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActiveBidsTable />
        </div>
        <div className="lg:col-span-1">
          <CaseFilesPanel />
        </div>
      </div>
    </div>
  );
}
