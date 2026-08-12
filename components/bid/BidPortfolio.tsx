"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import Tooltip from "@/components/ui/Tooltip";
import TCOSlider from "@/components/tco-slider";
import { procurementApi, type BidRecord, type CheckStatus } from "@/lib/api";
import { cleanReasonText, displayCheckName, formatCroreValue, getPatrolCategory, inCrore, recommendationLabel, recommendationTone } from "@/lib/recordUtils";
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
  const targetCategory = getPatrolCategory(name);
  return bid.checks.find((value) => getPatrolCategory(value.name) === targetCategory);
}
function hasFailure(bid: Comparable) {
  return bid.checks.some((value) => value.status === "FAIL" && (getPatrolCategory(value.name) === "engineering" || getPatrolCategory(value.name) === "carbon"));
}
function status(bid: Comparable, name: string): CheckStatus {
  return check(bid, name)?.status ?? "FLAG";
}
function label(filter: ComplianceFilter) {
  return filter === "eligible" ? "Mandatory constraints satisfied" : filter === "has-failure" ? "Mandatory constraint breach" : "All compliance states";
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
        const comparisonDefaults = [...items]
          .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
          .slice(0, 3);
        setRecords(items);
        setSourceState("live");
        setSelectedIds(comparisonDefaults.map((item) => item.id));
        setActiveId(comparisonDefaults[0]?.id ?? "");
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

  const activeIdToUse = active?.id;
  const updateScenario = useCallback(
    (costCr: number) => {
      if (activeIdToUse) setScenario({ id: activeIdToUse, cost: costCr * 10_000_000 });
    },
    [activeIdToUse]
  );

  const reset = () => {
    setQuery("");
    setStateFilter("all");
    setCompliance("all");
  };
  const resetNeeded = query || stateFilter !== "all" || compliance !== "all";

  if (sourceState === "loading") {
    return (
      <Card className="p-8 text-center text-sm text-text/50 min-h-[400px] flex items-center justify-center font-medium">
        Loading portfolio bids for comparison…
      </Card>
    );
  }

  if (sourceState === "error") {
    // Rely on global ConnectionFooter for single consistent Retry button
  }

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-x-clip">
      <Card className="min-w-0 max-w-full">
        <CardHeader
          title="Comparison Setup"
          caption="Filter and select up to 3 bids for side-by-side analysis."
          right={<span className="font-mono text-xs font-extrabold text-cyan">{selectedIds.length}/3 selected</span>}
        />
        <div className="p-5 sm:p-6 space-y-4 min-w-0 max-w-full">
          <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_180px_auto] min-w-0 max-w-full">
            <label className="relative min-w-0 max-w-full block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/40" />
              <span className="sr-only">Find a bid</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find vendor, model, or equipment"
                className="h-10 w-full min-w-0 max-w-full rounded-xl border border-line bg-surface pl-9 pr-3.5 text-sm font-medium text-text placeholder:text-text/40 focus:border-cyan focus:ring-1 focus:ring-cyan/50 focus:outline-none shadow-xs truncate"
              />
            </label>
            <label className="min-w-0 max-w-full block">
              <span className="sr-only">Status filter</span>
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value as StateFilter)}
                className="h-10 w-full min-w-0 max-w-full rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-text focus:border-cyan focus:ring-1 focus:ring-cyan/50 focus:outline-none shadow-xs truncate"
              >
                <option value="all">All Statuses</option>
                <option value="RECOMMENDED">RECOMMENDED</option>
                <option value="REVIEW_REQUIRED">REVIEW REQUIRED</option>
                <option value="REJECT">REJECT</option>
              </select>
            </label>
            <label className="min-w-0 max-w-full block">
              <span className="sr-only">Patrol filter</span>
              <select
                value={compliance}
                onChange={(event) => setCompliance(event.target.value as ComplianceFilter)}
                className="h-10 w-full min-w-0 max-w-full rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-text focus:border-cyan focus:ring-1 focus:ring-cyan/50 focus:outline-none shadow-xs truncate"
              >
                <option value="all">All Patrol Results</option>
                <option value="eligible">Mandatory Constraints Satisfied</option>
                <option value="has-failure">Mandatory Constraint Breach</option>
              </select>
            </label>
            <button
              type="button"
              onClick={reset}
              disabled={!resetNeeded}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line px-3.5 text-xs font-bold text-text/70 hover:border-cyan/40 hover:text-text tactile-press disabled:cursor-not-allowed disabled:opacity-35 shadow-xs"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          </div>

          <div className="pt-1.5 flex flex-wrap gap-2.5" aria-label="Bids available for comparison">
            {filtered.map((bid) => {
              const selectedItem = selectedIds.includes(bid.id);
              const disabled = !selectedItem && selectedIds.length >= 3;
              return (
                <label
                  key={bid.id}
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                    selectedItem
                      ? "border-cyan bg-cyan/15 text-cyan ring-1 ring-cyan/40 shadow-xs"
                      : "border-line text-text/70 hover:border-cyan/40 hover:text-text shadow-xs"
                  } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer tactile-press"}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedItem}
                    disabled={disabled}
                    onChange={() => {
                      toggle(bid.id);
                      setActiveId(bid.id);
                      setScenario(null);
                    }}
                    className="accent-cyan"
                  />
                  <span>{bid.vendor}</span>
                </label>
              );
            })}
            {filtered.length === 0 && <p className="py-2 text-xs text-text/50">No bids match these filters.</p>}
          </div>
        </div>
      </Card>

      {selected.length ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px] min-w-0 max-w-full">
          <Card className="min-w-0 max-w-full">
            <CardHeader
              title="Bid Comparison"
              caption="Side-by-side compliance checks and TCO² scenario analysis."
              right={
                <span className="inline-flex items-center gap-1.5 text-xs text-text/50 font-medium">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-blue" /> {label(compliance)}
                </span>
              }
            />
            <div className="table-scroll-area table-max-3 min-w-0 max-w-full">
              <table className="w-full min-w-[720px] text-sm border-collapse table-auto">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b-2 border-line table-header">
                    <th className="px-4 py-3 text-left font-bold whitespace-nowrap first:rounded-tl-[0.9rem]">Vendor</th>
                    <th className="px-4 py-3 text-right font-bold whitespace-nowrap">Upfront (INR)</th>
                    <th className="px-4 py-3 text-center font-bold whitespace-nowrap">
                      <Tooltip text="Hard limit check. Validates power draw, cooling plant capacity balance, door clearance, warranty, and structural floor load tolerance.">
                        <span>Building Patrol</span>
                      </Tooltip>
                    </th>
                    <th className="px-4 py-3 text-center font-bold whitespace-nowrap">
                      <Tooltip text="Hard limit check. Validates embodied carbon emissions factor and water evaporation rate against site environmental caps.">
                        <span>Green Patrol</span>
                      </Tooltip>
                    </th>
                    <th className="px-4 py-3 text-center font-bold whitespace-nowrap">
                      <Tooltip text="Vendor risk score (0-10) calculated from historical performance metrics.">
                        <span>Vice Squad</span>
                      </Tooltip>
                    </th>
                    <th className="px-4 py-3 text-center font-bold whitespace-nowrap">
                      <Tooltip text="Schedule impact estimation calculating late delivery risk in days.">
                        <span>Traffic Control</span>
                      </Tooltip>
                    </th>
                    <th className="px-4 py-3 text-right font-bold whitespace-nowrap">5-Yr TCO² (INR)</th>
                    <th className="px-4 py-3 text-center font-bold whitespace-nowrap last:rounded-tr-[0.9rem]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((bid) => {
                    const activeRow = bid.id === active?.id;
                    const risk = check(bid, "Reliability")?.risk;
                    const tone = recommendationTone(bid.recommendation);
                    const color = tone === "rose" ? COLORS.rose : tone === "amber" ? COLORS.amber : COLORS.cyan;
                    return (
                      <tr
                        key={bid.id}
                        onClick={() => {
                          setActiveId(bid.id);
                          setScenario(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveId(bid.id);
                            setScenario(null);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect ${bid.vendor}`}
                        className={`cursor-pointer border-b border-line/40 transition-colors duration-150 ${activeRow ? "bg-cyan/10 font-medium" : "hover:bg-cyan/5 dark:hover:bg-cyan/10"}`}
                      >
                        <td className="px-4 py-3 text-left">
                          <p className="font-semibold text-text truncate">{bid.vendor}</p>
                          <p className="mt-0.5 text-xs text-text/45 truncate">{bid.model}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-text">{formatCroreValue(bid.upfront)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <PatrolBadge status={status(bid, "Engineering")} size="sm" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <PatrolBadge status={status(bid, "Carbon")} size="sm" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          <div className="flex justify-center">
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold font-mono tabular-nums border shadow-xs"
                              style={{
                                color: risk != null && risk > 6 ? COLORS.rose : COLORS.cyan,
                                backgroundColor: risk != null && risk > 6 ? `${COLORS.rose}1f` : `${COLORS.cyan}1f`,
                                borderColor: risk != null && risk > 6 ? `${COLORS.rose}50` : `${COLORS.cyan}50`,
                              }}
                            >
                              {risk == null ? "—" : `${risk}/10`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <PatrolBadge status={status(bid, "Schedule")} size="sm" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-text">{formatCroreValue(shownCost(bid))}</td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const varName = recommendationTone(bid.recommendation) === "rose" ? "--color-rose" : recommendationTone(bid.recommendation) === "amber" ? "--color-amber" : "--color-cyan";
                            return (
                              <div className="flex justify-center">
                                <span
                                  className="rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase border shadow-xs"
                                  style={{
                                    color: `rgb(var(${varName}))`,
                                    backgroundColor: `rgba(var(${varName}), 0.15)`,
                                    borderColor: `rgba(var(${varName}), 0.45)`,
                                  }}
                                >
                                  {recommendationLabel(bid.recommendation)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {active && active.upfront != null && (
              <div className="border-t border-line p-4">
                <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
                  <div className="mb-3 text-xs font-bold text-text/70">
                    Interactive cost scenario
                  </div>
                  <TCOSlider key={active.id} baseCapexCr={(active.upfront ?? 0) / 10_000_000} onTCOChange={updateScenario} />
                </div>
              </div>
            )}

            <div className="p-4">
              <TcoChart
                data={selected.map((bid) => ({
                  vendor: bid.vendor,
                  Upfront: (bid.upfront ?? 0) / 10_000_000,
                  "5-year TCO²": (shownCost(bid) ?? 0) / 10_000_000,
                  recommendation: bid.recommendation,
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
            <Link href="/bids/new" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-bold text-on-accent hover:bg-cyan/90 tactile-press shadow-xs">
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
    <Card accent={ color } className="h-fit p-5 xl:sticky xl:top-[81px] max-h-[calc(100vh-100px)] overflow-y-auto overflow-x-hidden space-y-4 min-w-0 max-w-full">
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-cyan">Selected bid inspector</p>
        <h2 className="mt-1 text-lg font-extrabold text-text">{bid.vendor}</h2>
        <p className="mt-0.5 text-xs font-medium text-text/50">{bid.equipment} · {bid.model}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-y border-line py-3.5 text-xs">
        <Metric label="Status" value={recommendationLabel(bid.recommendation)} />
        <Metric label="5-Year TCO²" value={inCrore(bid.cost)} />
        <Metric
          label="Reliability"
          value={
            check(bid, "vice")?.risk != null
              ? `${check(bid, "vice")?.risk}/10 Risk`
              : "Audit Active"
          }
        />
        <Metric
          label="Schedule"
          value={
            check(bid, "traffic")?.status === "FAIL"
              ? "Critical Delay"
              : check(bid, "traffic")?.status === "FLAG"
              ? "Schedule Flag"
              : "On Schedule"
          }
        />
      </div>

      <p className="text-xs leading-relaxed text-text/60">
        {bid.checks.map((value) => cleanReasonText(value.reason)).filter(Boolean).join(" ")}
      </p>

      <div>
        <Link href={`/bids/${bid.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan hover:underline tactile-press">
          Open Bid Review <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-text/40">{label}</p>
      <p className="mt-1 font-mono text-xs font-bold text-text">{value}</p>
    </div>
  );
}
