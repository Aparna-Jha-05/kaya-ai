"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import TCOSlider from "@/components/tco-slider";
import { procurementApi, type BidRecord, type CheckStatus } from "@/lib/api";
import { displayCheckName, inCrore, recommendationLabel, recommendationTone } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";

const TcoChart = dynamic(() => import("@/components/bid/TcoChart"), {
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center text-xs text-text/40">Loading cost comparison…</div>,
});

type SourceState = "loading" | "live" | "error";
type Comparable = {
  id: string;
  vendor: string;
  model: string;
  equipment: string;
  upfront: number | null;
  cost: number | null;
  recommendation: "REJECT" | "REVIEW_REQUIRED" | "RECOMMENDED";
  checks: Array<{ name: string; status: CheckStatus; risk: number | null; reason: string }>;
};
type StateFilter = "all" | Comparable["recommendation"];
type ComplianceFilter = "all" | "eligible" | "has-failure";

function fromRecord(record: BidRecord): Comparable {
  return {
    id: record.id,
    vendor: record.source.vendor_name,
    model: record.source.equipment.model_number,
    equipment: record.source.equipment.equipment_type,
    upfront: record.source.bid_amount_inr,
    cost: record.scorecard.calculated_tco2_inr,
    recommendation: record.scorecard.recommendation,
    checks: record.scorecard.patrol_results.map((check) => ({
      name: displayCheckName(check.patrol_name),
      status: check.status,
      risk: check.risk_score,
      reason: check.reason,
    })),
  };
}

function check(bid: Comparable, name: string) {
  return bid.checks.find((value) => value.name === name);
}
function hasFailure(bid: Comparable) {
  return bid.checks.some((value) => value.status === "FAIL" && (value.name === "Engineering" || value.name === "Carbon"));
}
function status(bid: Comparable, name: string): CheckStatus {
  return check(bid, name)?.status ?? "FLAG";
}
function label(filter: ComplianceFilter) {
  return filter === "eligible" ? "Hard checks passed" : filter === "has-failure" ? "Hard failure present" : "All compliance states";
}

export default function BidPortfolio() {
  const [records, setRecords] = useState<BidRecord[] | null>(null);
  const [sourceState, setSourceState] = useState<SourceState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [compliance, setCompliance] = useState<ComplianceFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("");
  const [scenario, setScenario] = useState<{ id: string; cost: number } | null>(null);

  const loadBids = useCallback(() => {
    setSourceState("loading");
    setErrorMessage("");
    procurementApi
      .list()
      .then((items) => {
        setRecords(items);
        setSourceState("live");
        setSelectedIds(items.slice(0, 3).map((item) => item.id));
        setActiveId(items[0]?.id ?? "");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Could not retrieve bids");
        setSourceState("error");
      });
  }, []);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  const bids = useMemo(() => (records ? records.map(fromRecord) : []), [records]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return bids.filter(
      (bid) =>
        (!normalized || `${bid.vendor} ${bid.model} ${bid.equipment}`.toLowerCase().includes(normalized)) &&
        (stateFilter === "all" || bid.recommendation === stateFilter) &&
        (compliance === "all" || (compliance === "eligible" ? !hasFailure(bid) : hasFailure(bid)))
    );
  }, [bids, compliance, query, stateFilter]);

  const selected = filtered.filter((bid) => selectedIds.includes(bid.id));
  const active = selected.find((bid) => bid.id === activeId) ?? selected[0];
  const shownCost = (bid: Comparable) => (scenario?.id === bid.id ? scenario.cost : bid.cost);

  const toggle = (id: string) =>
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });

  const updateScenario = useCallback(
    (costCr: number) => {
      if (active) setScenario({ id: active.id, cost: costCr * 10_000_000 });
    },
    [active]
  );

  const reset = () => {
    setQuery("");
    setStateFilter("all");
    setCompliance("all");
  };
  const resetNeeded = query || stateFilter !== "all" || compliance !== "all";

  if (sourceState === "loading") {
    return (
      <Card className="p-8 text-center text-sm text-text/50">
        Loading portfolio bids for comparison…
      </Card>
    );
  }

  if (sourceState === "error") {
    return (
      <Card className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-rose">Failed to load portfolio bids</p>
        <p className="text-xs text-text/55 max-w-md mx-auto">{errorMessage}</p>
        <button
          type="button"
          onClick={loadBids}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan/15 px-4 py-2 text-xs font-semibold text-cyan hover:bg-cyan/25"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry loading portfolio
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Comparison setup"
          caption="Filter bids, then select up to three to compare."
          right={<span className="font-mono text-xs text-cyan">{selected.length} shown · {selectedIds.length}/3 selected</span>}
        />
        <div className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_210px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/40" />
              <span className="sr-only">Find a bid</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find vendor, model, or equipment"
                className="h-10 w-full rounded-lg border border-white/10 bg-inset pl-9 pr-3 text-sm text-text placeholder:text-text/35 focus:border-cyan/50 focus:outline-none"
              />
            </label>
            <label>
              <span className="sr-only">Review state</span>
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value as StateFilter)}
                className="h-10 w-full rounded-lg border border-white/10 bg-inset px-3 text-sm text-text focus:border-cyan/50 focus:outline-none"
              >
                <option value="all">Any review state</option>
                <option value="RECOMMENDED">Ready for decision</option>
                <option value="REVIEW_REQUIRED">Needs review</option>
                <option value="REJECT">Do not select</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Compliance result</span>
              <select
                value={compliance}
                onChange={(event) => setCompliance(event.target.value as ComplianceFilter)}
                className="h-10 w-full rounded-lg border border-white/10 bg-inset px-3 text-sm text-text focus:border-cyan/50 focus:outline-none"
              >
                <option value="all">Any compliance result</option>
                <option value="eligible">Hard checks passed</option>
                <option value="has-failure">Hard failure present</option>
              </select>
            </label>
            <button
              type="button"
              onClick={reset}
              disabled={!resetNeeded}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-text/60 hover:border-white/25 hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Bids available for comparison">
            {filtered.map((bid) => {
              const selectedItem = selectedIds.includes(bid.id);
              const disabled = !selectedItem && selectedIds.length >= 3;
              return (
                <label
                  key={bid.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    selectedItem
                      ? "border-cyan/50 bg-cyan/10 text-cyan"
                      : "border-white/10 text-text/60 hover:border-white/25 hover:text-text"
                  } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedItem}
                    disabled={disabled}
                    onChange={() => toggle(bid.id)}
                    className="accent-[#38BDF8]"
                  />
                  <span>{bid.vendor}</span>
                  <span className="text-text/40">· {bid.model}</span>
                </label>
              );
            })}
            {filtered.length === 0 && <p className="py-2 text-xs text-text/50">No bids match these filters.</p>}
          </div>
        </div>
      </Card>

      {selected.length ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <Card>
            <CardHeader
              title="Bid comparison"
              caption={`Showing ${selected.length} selected bid${selected.length === 1 ? "" : "s"}. Select a row to inspect it.`}
              right={
                <span className="inline-flex items-center gap-1.5 text-xs text-text/50">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-blue" /> {label(compliance)}
                </span>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40">
                    <th className="px-4 py-3 font-medium">Bid</th>
                    <th className="px-4 py-3 font-medium">Upfront cost</th>
                    <th className="px-4 py-3 font-medium">Engineering</th>
                    <th className="px-4 py-3 font-medium">Carbon</th>
                    <th className="px-4 py-3 font-medium">Vendor reliability</th>
                    <th className="px-4 py-3 font-medium">Schedule impact</th>
                    <th className="px-4 py-3 font-medium">5-year cost</th>
                    <th className="px-4 py-3 font-medium">Review state</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((bid) => {
                    const activeRow = bid.id === active?.id;
                    const risk = check(bid, "Vendor reliability")?.risk;
                    const tone = recommendationTone(bid.recommendation);
                    const color = tone === "rose" ? COLORS.rose : tone === "amber" ? COLORS.amber : COLORS.cyan;
                    return (
                      <tr
                        key={bid.id}
                        onClick={() => setActiveId(bid.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveId(bid.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect ${bid.vendor}`}
                        className={`cursor-pointer border-b border-white/5 ${activeRow ? "bg-cyan/[0.06]" : "hover:bg-white/[0.025]"}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-text">{bid.vendor}</p>
                          <p className="mt-0.5 text-xs text-text/40">{bid.model}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-text/80">{inCrore(bid.upfront)}</td>
                        <td className="px-4 py-3">
                          <PatrolBadge status={status(bid, "Engineering")} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <PatrolBadge status={status(bid, "Carbon")} size="sm" />
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: risk != null && risk > 6 ? COLORS.rose : COLORS.cyan }}>
                          {risk == null ? "—" : `${risk}/10`}
                        </td>
                        <td className="px-4 py-3">
                          <PatrolBadge status={status(bid, "Schedule impact")} size="sm" />
                        </td>
                        <td className="px-4 py-3 font-mono text-text/80">{inCrore(shownCost(bid))}</td>
                        <td className="px-4 py-3">
                          <span className="rounded px-2 py-1 text-[10px] font-bold uppercase" style={{ color, backgroundColor: `${color}18` }}>
                            {recommendationLabel(bid.recommendation)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {active && active.upfront != null && (
              <div className="border-t border-white/10 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-cyan">Cost scenario</p>
                <p className="mt-1 text-xs text-text/55">Adjust commercial assumptions; the bid service recalculates the result.</p>
                <div className="mt-3">
                  <TCOSlider key={active.id} baseCapexCr={(active.upfront ?? 0) / 10_000_000} onTCOChange={updateScenario} />
                </div>
              </div>
            )}

            <div className="p-4">
              <TcoChart
                data={selected.map((bid) => ({
                  vendor: bid.vendor,
                  Upfront: (bid.upfront ?? 0) / 10_000_000,
                  "5-year cost": (shownCost(bid) ?? 0) / 10_000_000,
                }))}
              />
            </div>
          </Card>
          {active && <Inspector bid={active} />}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-sm font-medium text-text">
            {filtered.length === 0 && !resetNeeded ? "No submitted bids yet." : "No selected bids match the current filters."}
          </p>
          <p className="mt-2 text-xs text-text/55">
            {filtered.length === 0 && !resetNeeded
              ? "Upload a PDF to extract source fields and run the deterministic compliance checks."
              : "Clear filters or select an available bid to restore the comparison."}
          </p>
          {filtered.length === 0 && !resetNeeded ? (
            <Link href="/bids/new" className="mt-5 inline-flex items-center rounded-lg bg-cyan/15 px-4 py-2 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25">
              Upload first bid
            </Link>
          ) : null}
        </Card>
      )}
    </div>
  );
}

function Inspector({ bid }: { bid: Comparable }) {
  const color = recommendationTone(bid.recommendation) === "rose" ? COLORS.rose : recommendationTone(bid.recommendation) === "amber" ? COLORS.amber : COLORS.cyan;
  return (
    <Card accent={color} className="h-fit p-5 xl:sticky xl:top-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text/40">Selected bid</p>
      <h2 className="mt-1 text-lg font-semibold text-text">{bid.vendor}</h2>
      <p className="mt-1 text-sm text-text/55">{bid.model}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-xs">
        <Metric label="Review state" value={recommendationLabel(bid.recommendation)} />
        <Metric label="5-year cost" value={inCrore(bid.cost)} />
        <Metric label="Vendor reliability" value={check(bid, "Vendor reliability")?.risk == null ? "Not provided" : `${check(bid, "Vendor reliability")?.risk}/10`} />
        <Metric label="Schedule impact" value={check(bid, "Schedule impact")?.status ?? "Review"} />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text/60">
        {bid.checks.map((value) => value.reason).join(" ")}
      </p>
      <Link href={`/bids/${bid.id}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan hover:underline">
        Open bid review <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-text/40">{label}</p>
      <p className="mt-1 font-mono text-xs font-semibold text-text">{value}</p>
    </div>
  );
}
