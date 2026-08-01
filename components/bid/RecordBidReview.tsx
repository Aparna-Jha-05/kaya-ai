"use client";

import { useEffect, useRef, useState } from "react";
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

type Tab = "summary" | "checks" | "source" | "activity";
const tabs = [
  { id: "summary", label: "Summary", Icon: ShieldCheck },
  { id: "checks", label: "Compliance & Impact", Icon: CheckCircle2 },
  { id: "source", label: "Source data", Icon: FileSearch },
  { id: "activity", label: "Activity", Icon: ScrollText },
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
  const [tab, setTab] = useState<Tab>("summary");
  const [inspected, setInspected] = useState<BidRecord["scorecard"]["patrol_results"][number] | null>(null);
  const [rfiOpen, setRfiOpen] = useState(false);
  const tone = recommendationTone(record.scorecard.recommendation);
  const color = toneColor(tone);
  const source = record.source;
  const equipment = source.equipment;
  const hardFail = record.scorecard.recommendation === "REJECT";
  const nextStep = hardFail
    ? "Resolve the failed requirements before selecting this bid."
    : record.scorecard.recommendation === "REVIEW_REQUIRED"
      ? "Review flagged evidence and record the appropriate decision."
      : "Confirm the evidence, then record a reviewer decision.";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line border-b-2 bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0 max-w-full">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="page-eyebrow">Bid review</p>
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
            <Metric label="Upfront cost" value={inCrore(source.bid_amount_inr)} />
            <Metric label="5-year TCO²" value={inCrore(record.scorecard.calculated_tco2_inr)} />
            <Metric label="Delivery" value={source.promised_delivery_weeks == null ? "Not provided" : `${source.promised_delivery_weeks} weeks`} />
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
              onClick={() => setTab(id)}
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
          <Card accent={color} className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>
              Status
            </p>
            <h3 className="mt-1 text-lg font-semibold text-text">{nextStep}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text/60">
              The result is produced by deterministic checks. LLMs extract and explain; code decides.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {record.scorecard.patrol_results.map((check) => (
                <PatrolBadge key={check.patrol_name} status={check.status} />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Reviewer action" caption="Human review is required before any procurement action is recorded." />
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text/65">
                {source.has_osha_cert === false
                  ? "A required safety certificate is missing. Review the RFI draft."
                  : "Confirm the cited evidence before recording the review."}
              </p>
              <div className="flex flex-wrap gap-2">
                {source.has_osha_cert === false && (
                  <button
                    type="button"
                    onClick={() => setRfiOpen(true)}
                    className="rounded-xl bg-violet/20 px-4 py-2 text-sm font-bold text-violet hover:bg-violet/30 tactile-press shadow-xs transition-colors"
                  >
                    Review RFI draft
                  </button>
                )}
                <ReviewerDecision record={record} />
              </div>
            </div>
          </Card>

          <RFIModal
            isOpen={rfiOpen}
            onClose={() => setRfiOpen(false)}
            vendorName={source.vendor_name}
            bidId={record.id}
          />
        </div>
      )}

      {tab === "checks" && (
        <div className="space-y-5">
          <EvidenceBoard record={record} />
          <section aria-label="Compliance checks" className="grid gap-4 lg:grid-cols-2">
            {record.scorecard.patrol_results.map((check) => {
              const pName = check.patrol_name.toLowerCase();
              const actionLabel = pName.includes("building") || pName.includes("engineering")
                ? "Inspect evidence & 3D spatial model →"
                : pName.includes("green") || pName.includes("carbon")
                  ? "Inspect carbon evidence & cap →"
                  : pName.includes("vice") || pName.includes("reliability")
                    ? "Inspect reliability & safety evidence →"
                    : "Inspect schedule & lead time evidence →";

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
                          ? "text-purple"
                          : "text-amber"
                      }`}
                  >
                    {actionLabel}
                  </button>
                </Card>
              );
            })}
          </section>
        </div>
      )}

      {tab === "source" && <SourceTab record={record} onRemoved={() => router.replace("/bids")} />}
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
    });
  };

  addIfPresent("Vendor", record.source.vendor_name, "vendor");
  addIfPresent("Model", e.model_number, "model");
  addIfPresent("Power Draw", e.power_draw_kw != null ? `${e.power_draw_kw} kW` : null, "power");
  addIfPresent("Cooling Capacity", e.cooling_capacity_kw != null ? `${e.cooling_capacity_kw} kW` : null, "cooling");
  addIfPresent("Width", e.width_m != null ? `${e.width_m} m` : null, "width");
  addIfPresent("Floor Load", e.floor_load_kg != null ? `${e.floor_load_kg} kg` : null, "floor");
  addIfPresent("Water Evaporation", e.water_evap_gpm != null ? `${e.water_evap_gpm} gpm` : null, "water");
  addIfPresent("Embodied Carbon", e.embodied_carbon_factor != null ? `${e.embodied_carbon_factor} kgCO₂e/ton` : null, "carbon");
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
          title="Extracted Source Ledger"
          caption="Consolidated PDF text extraction and traceable citation markers."
          right={
            <a
              href={procurementApi.sourceUrl(record.id)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-cyan hover:underline"
            >
              Open Source PDF ↗
            </a>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs font-mono border-collapse table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[45%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-line text-left table-header bg-surface/50">
                <th className="px-4 py-2.5 font-bold whitespace-nowrap first:rounded-tl-[0.9rem]">Extracted Field</th>
                <th className="px-4 py-2.5 font-bold whitespace-nowrap">Normalized Value</th>
                <th className="px-4 py-2.5 font-bold text-right whitespace-nowrap last:rounded-tr-[0.9rem]">Source Citation</th>
              </tr>
            </thead>
            <tbody>
              {rawFields.map((row, i) => (
                <tr key={i} className="border-b border-line/40 align-middle transition-colors duration-150 hover:bg-cyan/5 dark:hover:bg-cyan/10">
                  <td className="px-4 py-3 font-bold text-text/80">{row.field}</td>
                  <td className="px-4 py-3 font-bold text-cyan">{row.value}</td>
                  <td className="px-4 py-3 text-right">
                    {row.page != null ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-cyan/15 px-2 py-0.5 text-[11px] font-bold text-cyan border border-cyan/30 shadow-xs cursor-help transition-all hover:bg-cyan/25"
                        title={row.excerpt ? `[Page ${row.page}] "${row.excerpt}"` : `Extracted from Page ${row.page}`}
                      >
                        [p.{row.page}]
                      </span>
                    ) : (
                      <span className="text-text/40 font-normal text-[11px]">Source Provenance</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Document metadata" caption="Captured from the document where available." />
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <Metric label="Author" value={record.source.document_metadata.author ?? "Not provided"} />
          <Metric label="Created" value={record.source.document_metadata.creation_date ?? "Not provided"} />
          <Metric label="Creator" value={record.source.document_metadata.creator_tool ?? "Not provided"} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Remove uploaded bid" caption="This deletes the persisted record, activity, and source PDF." />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-xs text-text/55">Use only when this upload was submitted in error.</p>
          <div>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={removing}
              className="rounded-lg border border-rose/30 px-4 py-2 text-sm font-semibold text-rose hover:bg-rose/10 disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove bid"}
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

function ViceSquadCard({ record }: { record: BidRecord }) {
  const vice = record.scorecard.patrol_results.find((p) => p.patrol_name.toLowerCase().includes("vice") || p.patrol_name.toLowerCase().includes("reliability"));
  if (!vice || vice.status === "PASS") return null;
  const entries = vice.evidence ? Object.entries(vice.evidence) : [];
  const riskColor = vice.risk_score != null && vice.risk_score >= 7 ? COLORS.rose : vice.risk_score != null && vice.risk_score >= 4 ? COLORS.amber : COLORS.cyan;

  return (
    <Card accent={COLORS.violet}>
      <CardHeader
        title="Reliability Patrol — Vendor integrity signals"
        caption="Deterministic vendor integrity and compliance index findings. Requires reviewer interpretation."
      />
      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line/60 bg-surface/60 p-4">
          {vice.risk_score != null && (
            <div className="shrink-0">
              <p className="ui-label text-violet">Vendor Risk Score</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className="font-mono text-2xl font-black tabular-nums"
                  style={{ color: riskColor }}
                >
                  {vice.risk_score}
                </span>
                <span className="font-mono text-xs font-extrabold text-text/40">/10</span>
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1 sm:border-l sm:border-line/60 sm:pl-4">
            <p className="ui-label text-text/60">Patrol Finding</p>
            <p className="mt-0.5 text-sm font-medium text-text leading-snug">{cleanReasonText(vice.reason)}</p>
          </div>
        </div>

        {entries.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {entries
              .filter(([k]) => !(k.includes("index") || k.includes("score")))
              .map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-card p-4 shadow-xs">
                  <dt className="ui-label text-text/60">{formatLabelTitleCase(k)}</dt>
                  <dd className="mt-1 font-mono text-xs font-semibold text-text">{formatEvidenceValue(v)}</dd>
                </div>
              ))}
          </dl>
        )}
      </div>
    </Card>
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
      <CardHeader title="Bid activity" caption="Recorded checks and reviewer actions for this bid." />
      {state === "loading" ? (
        <p className="p-5 text-sm text-text/55">Loading activity…</p>
      ) : state === "error" ? (
        <p className="p-5 text-sm text-amber">Activity is unavailable. No events are inferred.</p>
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
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not record decision.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void save()}
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
              <span className="inline-flex items-center rounded-lg bg-cyan/15 px-2.5 py-1 font-mono text-xs font-bold text-cyan border border-cyan/30 shadow-xs">
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
            />
          )}

          {(pName.includes("green") || pName.includes("carbon")) && (
            <div className="rounded-2xl border border-emerald/40 bg-surface p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="ui-label text-emerald font-extrabold">Embodied Carbon vs Cap</span>
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono font-bold shadow-xs border ${check.status === "FAIL"
                  ? "bg-rose/15 text-rose border-rose/30"
                  : "bg-emerald/15 text-emerald border-emerald/30"
                  }`}>
                  {check.status === "FAIL" ? "✕ Cap Exceeded" : "✓ Within Limit"}
                </span>
              </div>

              {/* 2-Bar Visual Comparison Chart */}
              <div className="space-y-3 rounded-xl border border-emerald/30 bg-inset p-3.5 sm:p-4 shadow-xs">
                {/* Bar 1: Bid Embodied Carbon */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text/70 font-semibold">Bid Embodied Carbon</span>
                    <span className={`font-bold ${check.status === "FAIL" ? "text-rose" : "text-emerald"}`}>
                      {equipment?.embodied_carbon_factor != null
                        ? `${equipment.embodied_carbon_factor.toLocaleString()} kgCO₂e`
                        : check.evidence?.embodied_carbon != null
                          ? `${String(check.evidence.embodied_carbon)} kgCO₂e`
                          : "Pending Amber Extraction"}
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
                    <span className="text-text/60">Project Cap Limit</span>
                    <span className="font-bold text-text">
                      {check.evidence?.project_cap != null
                        ? `${Number(check.evidence.project_cap).toLocaleString()} kgCO₂e`
                        : "Pending Amber Constraint"}
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

          {(pName.includes("vice") || pName.includes("reliability")) && (() => {
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

            // Color coding: Both metrics share unified polarity (Green/Purple = High/Good, Red = Low/Poor)
            const agreeColor = agreeScore == null ? "#a78bfa"
              : agreeScore >= 70 ? "#a78bfa"
                : agreeScore >= 50 ? "#f59e0b"
                  : "#f43f5e";

            const safetyColor = safetyRating == null ? "#06b6d4"
              : safetyRating >= 7 ? "#06b6d4"
                : safetyRating >= 4 ? "#f59e0b"
                  : "#f43f5e";

            // SVG Concentric Dual Ring setup (Outer = Compliance /100, Inner = Safety /10)
            const rOuter = 34;
            const circOuter = 2 * Math.PI * rOuter;
            const dashOuter = agreeScore != null ? (agreeScore / 100) * circOuter : 0;

            const rInner = 24;
            const circInner = 2 * Math.PI * rInner;
            const dashInner = safetyRating != null ? (safetyRating / 10) * circInner : 0;

            return (
              <div className="rounded-2xl border border-purple/40 bg-surface p-4 sm:p-5 shadow-xs space-y-3.5">
                <span className="ui-label text-purple font-extrabold">Reliability &amp; Safety Index</span>

                <div className="rounded-xl border border-purple/30 bg-inset p-4 shadow-xs flex items-center gap-5">
                  {/* Concentric Dual-Ring Radial Gauge (Unified Positive Polarity: Both Outer & Inner Arcs Fill for Good Quality) */}
                  <div className="relative shrink-0 flex items-center justify-center" style={{ width: 92, height: 92 }}>
                    <svg width="92" height="92" viewBox="0 0 92 92" fill="none" className="rotate-[-90deg]">
                      {/* Outer Track & Arc (Agreement Compliance /100 - Higher is Better) */}
                      <circle cx="46" cy="46" r={rOuter} stroke="#3b0764" strokeWidth="6" fill="none" opacity="0.3" />
                      <circle
                        cx="46" cy="46" r={rOuter}
                        stroke={agreeColor} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${dashOuter} ${circOuter}`} fill="none"
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                      />
                      {/* Inner Track & Arc (Vendor Safety Rating /10 - Higher is Better) */}
                      <circle cx="46" cy="46" r={rInner} stroke="#1e1b4b" strokeWidth="5" fill="none" opacity="0.4" />
                      <circle
                        cx="46" cy="46" r={rInner}
                        stroke={safetyColor} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={`${dashInner} ${circInner}`} fill="none"
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                      />
                    </svg>

                    {/* Concentric Center Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                      <span className="text-[14px] font-black font-mono" style={{ color: agreeColor }}>
                        {agreeScore != null ? agreeScore : "—"}
                      </span>
                      <span className="text-[9px] font-bold font-mono mt-0.5" style={{ color: safetyColor }}>
                        {safetyRating != null ? `${safetyRating}/10` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Consolidated Metrics Side Breakdown with Correct Polarity Semantics */}
                  <div className="flex-1 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between border-b border-line/30 pb-1.5">
                      <span className="text-text/60 font-sans text-[11px] font-medium flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: agreeColor }} />
                        Agreement Compliance
                      </span>
                      <span className="font-bold" style={{ color: agreeColor }}>
                        {agreeScore != null ? `${agreeScore}/100` : "Pending"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-line/30 pb-1.5">
                      <span className="text-text/60 font-sans text-[11px] font-medium flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: safetyColor }} />
                        Vendor Safety Rating
                      </span>
                      <span className="font-bold" style={{ color: safetyColor }}>
                        {safetyRating != null ? `${safetyRating}/10` : "Pending"}
                      </span>
                    </div>

                    <div className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold flex items-center justify-between ${source.has_osha_cert === false
                        ? "border-rose/30 bg-rose/10 text-rose"
                        : source.has_osha_cert === true
                          ? "border-purple/30 bg-purple/10 text-purple"
                          : "border-line/50 bg-surface/60 text-text/50"
                      }`}>
                      <span className="font-sans">OSHA Certificate</span>
                      <span className="uppercase">
                        {source.has_osha_cert === false ? "✕ Missing"
                          : source.has_osha_cert === true ? "✓ Verified"
                            : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          {(pName.includes("traffic") || pName.includes("schedule")) && (
            <GanttScheduleViewer
              promisedWeeks={source.promised_delivery_weeks}
              delayDays={check.evidence?.delay_days != null ? Number(check.evidence.delay_days) : null}
              requiredWeeks={check.evidence?.required_weeks != null ? Number(check.evidence.required_weeks) : 10}
            />
          )}

          {/* Section 3: Document Provenance & Citation */}
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-3 text-xs">
            <h4 className="ui-label text-text/60 border-b border-line/40 pb-2.5">Document Provenance & Source Citation</h4>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs">
                <span className="ui-label text-text/50 block mb-1">Source Page</span>
                <span className="font-mono font-bold text-text">
                  {relevantCandidate?.page != null ? `Page ${relevantCandidate.page}` : "Document Provenance"}
                </span>
              </div>
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs">
                <span className="ui-label text-text/50 block mb-1">Extractor Engine</span>
                <span className="font-mono font-semibold text-cyan">
                  {(relevantCandidate as { extractor?: string })?.extractor === "pymupdf"
                    ? "PyMuPDF Direct Extraction"
                    : "Amber AI / VLM Inference Engine"}
                </span>
              </div>
            </div>

            {relevantCandidate?.bbox && (
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs text-xs">
                <span className="ui-label text-text/50 block mb-1">Bounding Box Coordinates</span>
                <span className="font-mono font-bold text-cyan">
                  [{relevantCandidate.bbox.map((v) => v.toFixed(1)).join(", ")}]
                </span>
              </div>
            )}

            {relevantCandidate?.source_excerpt && (
              <div className="rounded-xl border border-line/60 bg-inset p-3 shadow-xs text-xs">
                <span className="ui-label text-text/50 block mb-1.5">Extracted Source Excerpt</span>
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
