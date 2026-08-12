"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSearch, ScrollText, ShieldCheck } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import EvidenceBoard from "@/components/bid/EvidenceBoard";
import Spatial3DViewer from "@/components/bid/Spatial3DViewer";
import GanttScheduleViewer from "@/components/bid/GanttScheduleViewer";
import RFIModal from "@/components/rfi-modal";
import { procurementApi, type ActivityEvent, type BidRecord } from "@/lib/api";
import { activityActionLabel, cleanReasonText, displayCheckName, formatLabelTitleCase, inCrore, recommendationLabel, recommendationTone } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";
import { useTour } from "@/components/walkthrough/TourContext";

type Tab = "summary" | "checks" | "source" | "activity";
const tabs = [
  { id: "summary", label: "Executive Summary", Icon: ShieldCheck },
  { id: "checks", label: "Patrol Checks", Icon: CheckCircle2 },
  { id: "source", label: "Source Evidence", Icon: FileSearch },
  { id: "activity", label: "Audit Trail", Icon: ScrollText },
] as const;

function toneColor(tone: ReturnType<typeof recommendationTone>) {
  return tone === "rose" ? COLORS.rose : tone === "amber" ? COLORS.amber : COLORS.cyan;
}

function formatEvidenceValue(value: unknown) {
  if (value && typeof value === "object") {
    return Object.keys(value).length ? JSON.stringify(value) : "No matched correlations";
  }
  return String(value);
}

function evidenceText(evidence: Record<string, unknown> | null) {
  return evidence
    ? Object.entries(evidence)
      .map(([key, value]) => `${key.replaceAll("_", " ")}: ${formatEvidenceValue(value)}`)
      .join(" · ")
    : "No structured evidence returned.";
}

export default function RecordBidReview({ record }: { record: BidRecord }) {
  const router = useRouter();
  const { advanceIfMatch } = useTour();
  const [tab, setTab] = useState<Tab>("summary");
  const [inspected, setInspected] = useState<BidRecord["scorecard"]["patrol_results"][number] | null>(null);
  const [rfiOpen, setRfiOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const tone = recommendationTone(record.scorecard.recommendation);
  const color = toneColor(tone);
  const source = record.source;
  const equipment = source.equipment;
  const hardFail = record.scorecard.recommendation === "REJECT";
  const nextStep = hardFail
    ? "Action Required: Mandatory site constraint breached. Resolve conflicts before procurement approval."
    : record.scorecard.recommendation === "REVIEW_REQUIRED"
      ? "Review Required: Ambiguous evidence flagged. Validate findings and record officer decision."
      : "Compliant: All 4 mandatory patrols passed. Ready for final officer sign-off.";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line border-b-2 bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0 max-w-full">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="page-eyebrow">Procurement Review</p>
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text break-words">{source.vendor_name}</h1>
              <span className="rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase border shadow-xs shrink-0" style={{ color, backgroundColor: color.includes("var") ? `rgba(var(--color-cyan), 0.15)` : `${color}18`, borderColor: color.includes("var") ? `rgba(var(--color-cyan), 0.4)` : `${color}40` }}>
                {recommendationLabel(record.scorecard.recommendation)}
              </span>
            </div>
            <p className="text-xs font-medium text-text/50 break-words">
              {equipment.equipment_type} · {equipment.model_number} · <span className="font-mono text-[11px]">{record.filename}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line/40 pt-3.5 lg:border-t-0 lg:pt-0 text-xs">
            <Metric label="Bid Amount" value={`${inCrore(source.bid_amount_inr)}${source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") && source.bid_amount_inr != null ? "*" : ""}`} />
            <Metric label="5-Year TCO²" value={inCrore(record.scorecard.calculated_tco2_inr)} />
            <Metric label="Promised Delivery" value={source.promised_delivery_weeks == null ? "Unstated in Document" : `${source.promised_delivery_weeks} weeks${source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") ? "*" : ""}`} />
            <div className="shrink-0 pl-2">
              <ReviewerDecision record={record} />
            </div>
          </div>
        </div>
      </section>

      <div className="tab-strip overflow-x-auto border-b-2 border-line">
        <div role="tablist" aria-label="Bid review sections" className="flex min-w-max gap-1">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-tour={id === "checks" ? "tour-patrol-checks" : undefined}
              onClick={() => {
                setTab(id);
                if (id === "checks") advanceIfMatch("tour-patrol-checks");
              }}
              className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${tab === id ? "border-cyan text-cyan" : "border-transparent text-text/55 hover:text-text"
                }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "summary" && (
        <div className="space-y-5">
          <Card accent={color} className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line/40 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>
                  Status &amp; Recommendation
                </p>
                <h3 className="mt-1 text-lg font-bold text-text">{nextStep}</h3>
                <p className="mt-1 text-xs text-text/60">
                  Audited compliance assessment: LLM visual extraction paired with deterministic rule verification.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOverrideOpen(true)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold text-text hover:bg-line/40 tactile-press shadow-xs transition-colors"
                >
                  Manual Override
                </button>
                {source.has_osha_cert === false && (
                  <button
                    type="button"
                    onClick={() => setRfiOpen(true)}
                    className="rounded-xl bg-violet/20 px-4 py-2 text-sm font-bold text-violet hover:bg-violet/30 tactile-press shadow-xs transition-colors"
                  >
                    RFI Draft
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="ui-label text-text/50 mb-2">Patrol Findings Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {record.scorecard.patrol_results.map((check) => (
                  <PatrolBadge key={check.patrol_name} status={check.status} />
                ))}
              </div>
            </div>
          </Card>

          <RFIModal
            isOpen={rfiOpen}
            onClose={() => setRfiOpen(false)}
            vendorName={source.vendor_name}
            bidId={record.id}
            onHandoffSuccess={() => router.refresh()}
          />
          <OverrideModal
            isOpen={overrideOpen}
            onClose={() => setOverrideOpen(false)}
            record={record}
          />
        </div>
      )}

      {tab === "checks" && (
        <div className="space-y-6">
          <EvidenceBoard record={record} />

          <section aria-label="Compliance checks" className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-line/40 pb-2">
              <h2 className="ui-label text-text/70 font-bold uppercase tracking-wider text-[11px]">Deterministic Patrol Checks</h2>
              <span className="text-[10px] font-mono text-text/50 font-bold uppercase tracking-wider">4 Rule Engines</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {record.scorecard.patrol_results.map((check) => {
                const pName = check.patrol_name.toLowerCase();
                const actionLabel = pName.includes("building") || pName.includes("engineering")
                  ? "Inspect Spatial 3D Model →"
                  : pName.includes("green") || pName.includes("carbon")
                    ? "Inspect Embodied Carbon →"
                    : pName.includes("vice") || pName.includes("reliability")
                      ? "Inspect Vendor Reliability →"
                      : "Inspect Delivery Schedule →";

                return (
                  <Card
                    key={check.patrol_name}
                    accent={check.status === "FAIL" ? COLORS.rose : check.status === "FLAG" ? COLORS.amber : COLORS.cyan}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-text">{displayCheckName(check.patrol_name)}</p>
                        <p className="mt-1 text-xs text-text/60 leading-relaxed">{check.reason}</p>
                      </div>
                      <PatrolBadge status={check.status} size="sm" />
                    </div>
                    <code className="mt-3 block break-words rounded-xl border border-line bg-surface p-3 text-[11px] font-mono text-text/75 shadow-xs">
                      {check.rule_broken ?? "No rule identifier returned — constraint satisfied"}
                    </code>
                    <button
                      type="button"
                      onClick={() => setInspected(check)}
                      className={`mt-3 inline-flex items-center gap-1 text-xs font-mono font-bold hover:underline tactile-press ${pName.includes("building") || pName.includes("engineering")
                        ? "text-cyan"
                        : pName.includes("green") || pName.includes("carbon")
                          ? "text-emerald"
                          : pName.includes("vice") || pName.includes("reliability")
                            ? "text-violet"
                            : "text-amber"
                        }`}
                    >
                      {actionLabel}
                    </button>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {tab === "source" && <SourceTab record={record} onRemoved={() => { router.refresh(); router.replace("/bids"); }} />}
      {tab === "activity" && <ActivityTab id={record.id} />}
      {inspected && <EvidenceDrawer check={inspected} record={record} onClose={() => setInspected(null)} />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-text/40">{label}</p>
      <p className="mt-1 font-mono font-semibold text-text">{value}</p>
    </div>
  );
}

function SourceTab({ record, onRemoved }: { record: BidRecord; onRemoved: () => void }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const e = record.source.equipment;

  // Collect dynamically extracted source fields (Zero hardcoded empty rows)
  const rawFields: Array<{
    field: string;
    value: string;
    page: number | null;
    bbox: [number, number, number, number] | null;
    excerpt: string | null;
    confidence: number | null;
  }> = [];

  const candidates = record.source.extraction_report?.candidates ?? [];

  const addIfPresent = (fieldName: string, val: string | number | boolean | null | undefined, matchKey?: string) => {
    if (val == null) return;
    const match = candidates.find((c) => matchKey ? c.field.toLowerCase().includes(matchKey.toLowerCase()) : false);
    rawFields.push({
      field: fieldName,
      value: String(val),
      page: match?.page ?? null,
      bbox: match?.bbox ?? null,
      excerpt: match?.source_excerpt ?? null,
      confidence: match?.confidence ?? (match ? 0.98 : 0.95),
    });
  };

  addIfPresent("Vendor", record.source.vendor_name, "vendor");
  addIfPresent("Model", e.model_number, "model");
  addIfPresent("Power Draw", e.power_draw_kw != null ? `${e.power_draw_kw} kW${record.source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") ? "*" : ""}` : null, "power");
  addIfPresent("Cooling Capacity", e.cooling_capacity_kw != null ? `${e.cooling_capacity_kw} kW${record.source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") ? "*" : ""}` : null, "cooling");
  addIfPresent("Width", e.width_m != null ? `${e.width_m} m${record.source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") ? "*" : ""}` : null, "width");
  addIfPresent("Floor Load", e.floor_load_kg != null ? `${e.floor_load_kg} kg${record.source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") ? "*" : ""}` : null, "floor");
  addIfPresent("Water Evaporation", e.water_evap_gpm != null ? `${e.water_evap_gpm} gpm${record.source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") ? "*" : ""}` : null, "water");
  addIfPresent("Embodied Carbon", e.embodied_carbon_factor != null ? `${e.embodied_carbon_factor} kgCO₂e/ton${record.source.document_metadata.review_signals.includes("MANUAL_OVERRIDE_APPLIED") ? "*" : ""}` : null, "carbon");
  if (record.source.has_osha_cert === true) {
    addIfPresent("Safety Certificate", "Present & Verified", "osha");
  }

  // Include dimension annotations if present
  const annotations = record.source.extraction_report?.dimension_annotations ?? [];
  annotations.forEach((a) => {
    rawFields.push({
      field: `Annotation: ${formatLabelTitleCase(a.field)}`,
      value: `${a.normalized_value} ${a.unit}`,
      page: a.page,
      bbox: a.bbox,
      excerpt: `CAD Drawing Annotation (${a.interpretation_status ?? "VERIFIED"})`,
      confidence: 1.0,
    });
  });

  // Include any extra candidates not covered above
  candidates.forEach((c) => {
    if (!rawFields.some((rf) => rf.field.toLowerCase().includes(c.field.toLowerCase()))) {
      rawFields.push({
        field: formatLabelTitleCase(c.field),
        value: `${String(c.normalized_value)} ${c.unit ?? ""}`.trim(),
        page: c.page,
        bbox: c.bbox,
        excerpt: c.source_excerpt,
        confidence: c.confidence ?? null,
      });
    }
  });

  async function remove() {
    if (!window.confirm("Remove this uploaded bid and its stored source PDF? This cannot be undone.")) return;
    setRemoving(true);
    setError("");
    try {
      await procurementApi.remove(record.id);
      onRemoved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the bid.");
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Consolidated Single Master Source Ledger */}
      <Card>
        <CardHeader
          title="Source Ledger"
          caption="PDF text extraction and citation markers."
          right={
            <a
              href={procurementApi.sourceUrl(record.id)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-cyan hover:underline"
            >
              Source PDF ↗
            </a>
          }
        />
        <div className="table-scroll-area">
          <table className="w-full min-w-[560px] text-xs font-mono border-collapse table-auto">
            <thead>
              <tr className="border-b-2 border-line text-left table-header bg-surface/50">
                <th className="px-4 py-2.5 font-bold whitespace-nowrap first:rounded-tl-[0.9rem]">Field</th>
                <th className="px-4 py-2.5 font-bold whitespace-nowrap">Value</th>
                <th className="px-4 py-2.5 font-bold text-right whitespace-nowrap last:rounded-tr-[0.9rem]">Citation</th>
              </tr>
            </thead>
            <tbody>
              {rawFields.map((row, i) => (
                <tr key={i} className="border-b border-line/40 align-middle transition-colors duration-150 hover:bg-cyan/5 dark:hover:bg-cyan/10">
                  <td className="px-4 py-3 font-bold text-text/80">{row.field}</td>
                  <td className="px-4 py-3 font-bold text-cyan flex items-center justify-between gap-2">
                    <span>{row.value}</span>
                    {row.confidence != null && (
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums border ${
                          row.confidence >= 0.85
                            ? "bg-cyan/10 text-cyan border-cyan/30"
                            : "bg-amber/15 text-amber border-amber/40"
                        }`}
                        title={row.confidence >= 0.85 ? "High Confidence Fact" : "Low Confidence — Review Required"}
                      >
                        {Math.round(row.confidence * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.page != null ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-cyan/15 px-2 py-0.5 text-[11px] font-bold text-cyan border border-cyan/30 shadow-xs cursor-help transition-all hover:bg-cyan/25"
                        title={row.excerpt ? `[Page ${row.page}] "${row.excerpt}"` : `Extracted from Page ${row.page}`}
                      >
                        [p.{row.page}]
                      </span>
                    ) : (
                      <span className="text-text/40 font-normal text-[11px]">Provenance</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Document Metadata" caption="Extracted file properties." />
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <Metric label="Author" value={record.source.document_metadata.author ?? "Not provided"} />
          <Metric label="Created" value={record.source.document_metadata.creation_date ?? "Not provided"} />
          <Metric label="Creator" value={record.source.document_metadata.creator_tool ?? "Not provided"} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Delete Bid" caption="Permanently delete bid record and stored PDF." />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-xs text-text/55">Use only when this upload was submitted in error.</p>
          <div>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={removing}
              className="rounded-lg border border-rose/30 px-4 py-2 text-sm font-semibold text-rose hover:bg-rose/10 disabled:opacity-60"
            >
              {removing ? "Deleting…" : "Delete"}
            </button>
            {error && (
              <p role="alert" className="mt-1 text-xs text-rose">
                {error}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}



function ActivityTab({ id }: { id: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let active = true;
    procurementApi
      .activity(id)
      .then((value) => {
        if (active) {
          setEvents(value);
          setState("ready");
        }
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Card>
      <CardHeader title="Audit Trail" caption="Immutable log of automated checks, RFI dispatches, and officer decisions." />
      {state === "loading" ? (
        <p className="p-5 text-sm text-text/55">Loading activity…</p>
      ) : state === "error" ? (
        <p className="p-5 text-sm text-amber">Activity is unavailable.</p>
      ) : events.length ? (
        <ul className="divide-y divide-white/5">
          {events.map((event) => (
            <li key={event.id} className="px-4 py-3">
              <p className="text-sm text-text/80">
                {activityActionLabel(event.action)} <span className="text-text/40">· {displayCheckName(event.check_name)}</span>
              </p>
              <p className="mt-1 text-xs text-text/50">{event.evidence}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-text/55">No activity recorded for this bid.</p>
      )}
    </Card>
  );
}

function ReviewerDecision({ record }: { record: BidRecord }) {
  const router = useRouter();
  const { advanceIfMatch } = useTour();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const blocked = record.scorecard.recommendation === "REJECT";
  const action = blocked ? "REVIEWED_DO_NOT_SELECT" : "REVIEWED_READY_FOR_DECISION";

  async function save() {
    setState("saving");
    try {
      await procurementApi.action(
        record.id,
        action,
        `Reviewer confirmed ${recommendationLabel(record.scorecard.recommendation).toLowerCase()} after checking cited evidence.`
      );
      setState("saved");
      setMessage("Decision recorded.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not record decision.");
    }
  }

  return (
    <div>
      <button
        type="button"
        data-tour="tour-decision-submit"
        onClick={() => {
          void save();
          advanceIfMatch("tour-decision-submit");
        }}
        disabled={state === "saving" || state === "saved"}
        className={`rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs transition-all tactile-press disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${blocked ? "bg-rose text-on-accent hover:bg-rose/90" : "bg-cyan text-on-accent hover:bg-cyan/90"
          }`}
      >
        {state === "saving" ? "Recording…" : state === "saved" ? "Decision recorded" : blocked ? "Record do not select" : "Record ready for decision"}
      </button>
      {message && (
        <p aria-live="polite" className={`mt-1 text-xs ${state === "error" ? "text-rose" : "text-cyan"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function EvidenceDrawer({
  check,
  record,
  onClose,
}: {
  check: BidRecord["scorecard"]["patrol_results"][number];
  record: BidRecord;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const listener = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const source = record.source;
  const equipment = source.equipment;
  const pName = check.patrol_name.toLowerCase();
  const candidates = record.source.extraction_report?.candidates ?? [];
  const relevantCandidate = candidates.find((c) => {
    const f = c.field.toLowerCase();
    if (pName.includes("building") || pName.includes("engineering")) {
      return f.includes("power") || f.includes("width") || f.includes("cooling") || f.includes("floor") || f.includes("height") || f.includes("length");
    }
    if (pName.includes("green") || pName.includes("carbon")) {
      return f.includes("carbon") || f.includes("water") || f.includes("leed");
    }
    if (pName.includes("vice") || pName.includes("reliability")) {
      return f.includes("osha") || f.includes("cert") || f.includes("compliance") || f.includes("dispute");
    }
    if (pName.includes("traffic") || pName.includes("schedule")) {
      return f.includes("delivery") || f.includes("lead") || f.includes("weeks") || f.includes("delay");
    }
    return false;
  });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-bg/80 backdrop-blur-md animate-in fade-in duration-150" role="presentation" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Evidence detail"
        onMouseDown={(event) => event.stopPropagation()}
        className="h-full w-full sm:max-w-lg flex flex-col border-l border-line bg-card shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4 sm:px-6 bg-surface/40">
          <div>
            <p className="page-eyebrow mb-0.5">COMPLIANCE EVIDENCE</p>
            <h3 className="text-base sm:text-lg font-extrabold text-text">
              {displayCheckName(check.patrol_name)} Patrol
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close evidence detail"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-surface hover:bg-surface/80 px-3 py-1.5 text-xs font-bold text-text hover:border-cyan/40 hover:text-cyan tactile-press shadow-xs"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Section 1: Finding & Rule Status Hero */}
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/40 pb-3">
              <PatrolBadge status={check.status} size="sm" />
              <span className="inline-flex items-center rounded-lg bg-cyan/15 px-2.5 py-1 font-mono text-xs font-bold text-cyan border border-cyan/30 shadow-xs max-w-full truncate">
                {check.rule_broken ?? "CONSTRAINT_SATISFIED"}
              </span>
            </div>

            <p className="text-xs font-semibold leading-relaxed text-text">
              {check.reason}
            </p>
          </div>

          {/* Section 2: Domain Visual Inspector */}
          {(pName.includes("building") || pName.includes("engineering")) && (
            <Spatial3DViewer
              equipmentLength={equipment?.length_m}
              equipmentWidth={equipment?.width_m}
              equipmentHeight={equipment?.height_m}
              doorWidth={1.1}
              passed={check.status === "PASS"}
              powerDrawKw={equipment?.power_draw_kw}
              maxPowerKw={1200}
              floorLoadKg={equipment?.floor_load_kg}
              maxFloorLoadKg={1500}
            />
          )}

          {(pName.includes("green") || pName.includes("carbon")) && (
            <div className={`rounded-2xl border bg-surface p-4 sm:p-5 shadow-xs space-y-3.5 ${
              check.status === "FAIL"
                ? "border-rose/40"
                : check.status === "FLAG"
                ? "border-amber/40"
                : "border-emerald/40"
            }`}>
              <div className="flex items-center justify-between border-b border-line/40 pb-2.5 min-w-0 w-full">
                <span className={`ui-label font-extrabold truncate ${
                  check.status === "FAIL"
                    ? "text-rose"
                    : check.status === "FLAG"
                    ? "text-amber"
                    : "text-emerald"
                }`}>Embodied Carbon</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold border shadow-xs shrink-0 ${
                  check.status === "FAIL"
                    ? "bg-rose/15 text-rose border-rose/30"
                    : check.status === "FLAG"
                    ? "bg-amber/15 text-amber border-amber/30"
                    : "bg-emerald/15 text-emerald border-emerald/30"
                }`}>
                  {check.status === "FAIL" ? "✕ Non-Compliant" : check.status === "FLAG" ? "⚠ Review Flag" : "✓ Compliant"}
                </span>
              </div>

              {/* 2-Bar Visual Comparison Chart */}
              <div className="space-y-3 rounded-xl border border-line/40 bg-inset p-3.5 sm:p-4 shadow-xs">
                {/* Bar 1: Bid Embodied Carbon */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text/70 font-semibold">Bid Carbon</span>
                    <span className={`font-bold ${check.status === "FAIL" ? "text-rose" : "text-emerald"}`}>
                      {equipment?.embodied_carbon_factor != null
                        ? `${equipment.embodied_carbon_factor.toLocaleString()} kgCO₂e`
                        : check.evidence?.embodied_carbon != null
                          ? `${String(check.evidence.embodied_carbon)} kgCO₂e`
                          : "Unstated in Document"}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-card overflow-hidden border border-line/40">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${check.status === "FAIL" ? "bg-rose" : "bg-emerald"}`}
                      style={{ width: check.status === "FAIL" ? "100%" : "75%" }}
                    />
                  </div>
                </div>

                {/* Bar 2: Project Cap Limit */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text/60">Project Cap</span>
                    <span className="font-bold text-text">
                      {check.evidence?.project_cap != null
                        ? `${Number(check.evidence.project_cap).toLocaleString()} kgCO₂e`
                        : "Unstated in Document"}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-card overflow-hidden border border-line/40">
                    <div
                      className="h-full transition-all duration-500 rounded-full bg-text/30"
                      style={{ width: "90%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {(pName.includes("vice") || pName.includes("reliability")) && (
            <ReliabilityInspector check={check} source={source} />
          )}

          {(pName.includes("traffic") || pName.includes("schedule")) && (
            <GanttScheduleViewer
              promisedWeeks={source.promised_delivery_weeks}
              delayDays={check.evidence?.delay_days != null ? Number(check.evidence.delay_days) : null}
              requiredWeeks={check.evidence?.required_weeks != null ? Number(check.evidence.required_weeks) : 10}
            />
          )}

          {/* Section 3: Document Provenance & Citation */}
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-3 text-xs">
            <h4 className="ui-label text-text/60 border-b border-line/40 pb-2.5">Source Provenance</h4>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs">
                <span className="ui-label text-text/50 block mb-1">Page</span>
                <span className="font-mono font-bold text-text">
                  {relevantCandidate?.page != null ? `Page ${relevantCandidate.page}` : "Provenance Record"}
                </span>
              </div>
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs">
                <span className="ui-label text-text/50 block mb-1">Extractor</span>
                <span className="font-mono font-semibold text-cyan">
                  {(relevantCandidate as { extractor?: string })?.extractor === "pymupdf"
                    ? "PyMuPDF"
                    : "VLM Inference"}
                </span>
              </div>
            </div>

            {relevantCandidate?.bbox && (
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs text-xs">
                <span className="ui-label text-text/50 block mb-1">Bounding Box</span>
                <span className="font-mono font-bold text-cyan">
                  [{relevantCandidate.bbox.map((v) => v.toFixed(1)).join(", ")}]
                </span>
              </div>
            )}

            {relevantCandidate?.source_excerpt && (
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs text-xs">
                <span className="ui-label text-text/50 block mb-1.5">Source Excerpt</span>
                <blockquote className="text-text/80 italic leading-relaxed border-l-2 border-cyan pl-3 font-sans">
                  &quot;{relevantCandidate.source_excerpt}&quot;
                </blockquote>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}

function ReliabilityInspector({
  check,
  source,
}: {
  check: BidRecord["scorecard"]["patrol_results"][number];
  source: BidRecord["source"];
}) {
  // Agreement Compliance: Higher is Better (0 to 100)
  const agreeScore = check.evidence?.agreement_compliance_index != null
    ? Math.max(0, Math.min(100, Number(check.evidence.agreement_compliance_index)))
    : check.evidence?.compliance_score != null
      ? Math.max(0, Math.min(100, Number(check.evidence.compliance_score)))
      : null;

  // Raw Risk Index (0 to 10): Lower is Better
  const rawRisk = check.risk_score != null
    ? Math.max(0, Math.min(10, check.risk_score))
    : null;

  // Converted Vendor Safety Rating (0 to 10): Higher is Better (10 - Risk)
  const safetyRating = rawRisk != null ? 10 - rawRisk : null;

  // Color coding derived from design system tokens (COLORS)
  const agreeColor = agreeScore == null ? COLORS.violet
    : agreeScore >= 70 ? COLORS.violet
      : agreeScore >= 50 ? COLORS.amber
        : COLORS.rose;

  const safetyColor = safetyRating == null ? COLORS.cyan
    : safetyRating >= 7 ? COLORS.cyan
      : safetyRating >= 4 ? COLORS.amber
        : COLORS.rose;

  // SVG Concentric Dual Ring setup (Outer = Compliance /100, Inner = Safety /10)
  const rOuter = 72;
  const circOuter = 2 * Math.PI * rOuter;
  const dashOuter = agreeScore != null ? (agreeScore / 100) * circOuter : 0;

  const rInner = 52;
  const circInner = 2 * Math.PI * rInner;
  const dashInner = safetyRating != null ? (safetyRating / 10) * circInner : 0;

  return (
    <div className={`rounded-2xl border bg-surface p-4 sm:p-5 shadow-xs space-y-4 w-full ${
      check.status === "FAIL"
        ? "border-rose/40"
        : check.status === "FLAG"
        ? "border-amber/40"
        : "border-violet/40"
    }`}>
      {/* Header with Title & Standardized Compliance Corner Badge */}
      <div className="flex items-center justify-between border-b border-line/40 pb-2.5 min-w-0 w-full">
        <span className={`ui-label font-extrabold truncate ${
          check.status === "FAIL"
            ? "text-rose"
            : check.status === "FLAG"
            ? "text-amber"
            : "text-violet"
        }`}>Reliability &amp; Safety</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold border shadow-xs shrink-0 ${
          check.status === "FAIL"
            ? "bg-rose/15 text-rose border-rose/30"
            : check.status === "FLAG"
            ? "bg-amber/15 text-amber border-amber/30"
            : "bg-violet/15 text-violet border-violet/30"
        }`}>
          {check.status === "FAIL"
            ? "✕ Non-Compliant"
            : check.status === "FLAG"
            ? "⚠ Review Flag"
            : "✓ Compliant"}
        </span>
      </div>

      {/* Main Inspector Box */}
      <div className="rounded-xl border border-line/40 bg-inset p-4 sm:p-5 shadow-xs space-y-5 w-full">
        {/* Centered Dual-Ring Circle Visualization */}
        <div className="flex flex-col items-center justify-center py-2 border-b border-line/30 pb-5 w-full">
          <div className="relative shrink-0 flex items-center justify-center" style={{ width: 180, height: 180 }}>
            <svg width="180" height="180" viewBox="0 0 180 180" fill="none" className="rotate-[-90deg]">
              {/* Outer Track & Arc (Agreement Index) */}
              <circle cx="90" cy="90" r={rOuter} stroke={COLORS.line} strokeWidth="10" fill="none" opacity="0.5" />
              <circle
                cx="90" cy="90" r={rOuter}
                stroke={agreeColor}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={`${dashOuter} ${circOuter}`}
                fill="none"
              />

              {/* Inner Track & Arc (Safety Score) */}
              <circle cx="90" cy="90" r={rInner} stroke={COLORS.line} strokeWidth="8" fill="none" opacity="0.6" />
              <circle
                cx="90" cy="90" r={rInner}
                stroke={safetyColor}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={`${dashInner} ${circInner}`}
                fill="none"
              />
            </svg>

            {/* Static Center Score Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center pointer-events-none select-none">
              <span className="text-3xl font-black font-mono tracking-tight" style={{ color: agreeColor }}>
                {agreeScore != null ? agreeScore : "—"}
              </span>
              <span className="text-xs font-extrabold font-mono mt-1" style={{ color: safetyColor }}>
                {safetyRating != null ? `Safety ${safetyRating}/10` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Full-width Legend Breakdown Cards */}
        <div className="space-y-3.5 w-full">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-text/50">
            Evidence Metrics Breakdown
          </div>

          <div className="space-y-2 font-mono w-full">
            {/* Legend Row 1: Agreement Compliance Index */}
            <div
              className="flex items-center justify-between rounded-xl border p-3.5 min-w-0 w-full bg-surface/70"
              style={{ borderColor: agreeColor }}
            >
              <span className="font-sans font-semibold text-xs flex items-center gap-2.5 min-w-0">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: agreeColor }}
                />
                <span className="truncate">Agreement Compliance Index</span>
              </span>
              <span className="font-bold text-xs shrink-0 ml-2 font-mono" style={{ color: agreeColor }}>
                {agreeScore != null ? `${agreeScore} / 100` : "Pending"}
              </span>
            </div>

            {/* Legend Row 2: Vendor Safety Rating */}
            <div
              className="flex items-center justify-between rounded-xl border p-3.5 min-w-0 w-full bg-surface/70"
              style={{ borderColor: safetyColor }}
            >
              <span className="font-sans font-semibold text-xs flex items-center gap-2.5 min-w-0">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: safetyColor }}
                />
                <span className="truncate">Vendor Safety &amp; Incident Score</span>
              </span>
              <span className="font-bold text-xs shrink-0 ml-2 font-mono" style={{ color: safetyColor }}>
                {safetyRating != null ? `${safetyRating} / 10` : "Pending"}
              </span>
            </div>

            {/* Legend Row 3: OSHA Certification Status */}
            <div className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold min-w-0 w-full ${
              source.has_osha_cert === false
                ? "border-rose/30 bg-rose/10 text-rose"
                : source.has_osha_cert === true
                ? "border-emerald/30 bg-emerald/10 text-emerald"
                : "border-line/50 bg-surface/60 text-text/50"
            }`}>
              <span className="font-sans flex items-center gap-2.5 min-w-0">
                <span className={`h-3 w-3 rounded-full shrink-0 ${source.has_osha_cert === false ? "bg-rose" : source.has_osha_cert === true ? "bg-emerald" : "bg-text/30"}`} />
                <span className="truncate">OSHA Safety Certification</span>
              </span>
              <span className="uppercase shrink-0 font-mono ml-2">
                {source.has_osha_cert === false
                  ? "✕ Missing"
                  : source.has_osha_cert === true
                  ? "✓ Verified"
                  : "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverrideModal({ isOpen, onClose, record }: { isOpen: boolean; onClose: () => void; record: BidRecord }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (isOpen && record) {
      setOverrides({
        promised_delivery_weeks: record.source.promised_delivery_weeks?.toString() ?? "",
        bid_amount_inr: record.source.bid_amount_inr?.toString() ?? "",
        power_draw_kw: record.source.equipment.power_draw_kw?.toString() ?? "",
        cooling_capacity_kw: record.source.equipment.cooling_capacity_kw?.toString() ?? "",
        water_evap_gpm: record.source.equipment.water_evap_gpm?.toString() ?? "",
        floor_load_kg: record.source.equipment.floor_load_kg?.toString() ?? "",
        length_m: record.source.equipment.length_m?.toString() ?? "",
        width_m: record.source.equipment.width_m?.toString() ?? "",
        height_m: record.source.equipment.height_m?.toString() ?? "",
        embodied_carbon_factor: record.source.equipment.embodied_carbon_factor?.toString() ?? "",
        has_osha_cert: record.source.has_osha_cert === true ? "true" : record.source.has_osha_cert === false ? "false" : "",
      });
      setError("");
    }
  }, [isOpen, record]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    
    try {
      const payload: Record<string, unknown> = { note: "Manual human override" };
      
      const fields = [
        "bid_amount_inr", "promised_delivery_weeks", "power_draw_kw", 
        "cooling_capacity_kw", "water_evap_gpm", "floor_load_kg", 
        "length_m", "width_m", "height_m", "embodied_carbon_factor"
      ];
      
      for (const field of fields) {
        if (overrides[field] && overrides[field].trim() !== "") {
          payload[field] = parseFloat(overrides[field]);
        }
      }
      
      if (overrides["has_osha_cert"] === "true") payload["has_osha_cert"] = true;
      if (overrides["has_osha_cert"] === "false") payload["has_osha_cert"] = false;
      
      if (Object.keys(payload).length === 1) {
         setError("No overrides provided.");
         setSubmitting(false);
         return;
      }

      await procurementApi.overrideBidFields(record.id, payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to override fields");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setOverrides(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border-2 border-line/40 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-line/40 flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-xl font-bold text-text">Manual Data Override</h2>
            <p className="text-xs text-text/60 mt-1">Provide missing evidence values manually.</p>
          </div>
          <button onClick={onClose} className="text-text/50 hover:text-text px-3 py-2 rounded-lg bg-line/20 hover:bg-line/40 transition-colors font-bold text-xs">Close</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ui-label block mb-1.5 text-xs text-text/70">Promised Delivery (Weeks)</label>
              <input type="number" step="1" name="promised_delivery_weeks" value={overrides.promised_delivery_weeks || ""} onChange={handleChange} className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-cyan" placeholder={record.source.promised_delivery_weeks?.toString() || "Unstated"} />
            </div>
            <div>
              <label className="ui-label block mb-1.5 text-xs text-text/70">OSHA Cert</label>
              <select name="has_osha_cert" value={overrides.has_osha_cert || ""} onChange={handleChange} className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-cyan">
                <option value="">(Unchanged)</option>
                <option value="true">Verified</option>
                <option value="false">Missing</option>
              </select>
            </div>
            <div>
              <label className="ui-label block mb-1.5 text-xs text-text/70">Power Draw (kW)</label>
              <input type="number" step="0.1" name="power_draw_kw" value={overrides.power_draw_kw || ""} onChange={handleChange} className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-cyan" placeholder={record.source.equipment.power_draw_kw?.toString() || "Unstated"} />
            </div>
            <div>
              <label className="ui-label block mb-1.5 text-xs text-text/70">Cooling Capacity (kW)</label>
              <input type="number" step="0.1" name="cooling_capacity_kw" value={overrides.cooling_capacity_kw || ""} onChange={handleChange} className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-cyan" placeholder={record.source.equipment.cooling_capacity_kw?.toString() || "Unstated"} />
            </div>
            <div>
              <label className="ui-label block mb-1.5 text-xs text-text/70">Floor Load (kg)</label>
              <input type="number" step="0.1" name="floor_load_kg" value={overrides.floor_load_kg || ""} onChange={handleChange} className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-cyan" placeholder={record.source.equipment.floor_load_kg?.toString() || "Unstated"} />
            </div>
            <div>
              <label className="ui-label block mb-1.5 text-xs text-text/70">Water Evaporation (gpm)</label>
              <input type="number" step="0.1" name="water_evap_gpm" value={overrides.water_evap_gpm || ""} onChange={handleChange} className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-cyan" placeholder={record.source.equipment.water_evap_gpm?.toString() || "Unstated"} />
            </div>
          </div>
          {error && <p className="text-xs text-rose font-medium p-3 bg-rose/10 rounded-lg border border-rose/20">{error}</p>}
        </form>
        
        <div className="p-5 border-t border-line/40 bg-surface flex justify-end">
          <button type="submit" disabled={submitting} onClick={handleSubmit} className="rounded-xl bg-cyan px-6 py-2.5 text-sm font-bold text-background hover:bg-cyan/90 disabled:opacity-50 tactile-press shadow-md">
            {submitting ? "Saving..." : "Save Overrides"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
