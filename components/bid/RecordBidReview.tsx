"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSearch, Network, ScrollText, ShieldCheck } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import EvidenceBoard from "@/components/bid/EvidenceBoard";
import RFIModal from "@/components/rfi-modal";
import CADVisualizer, { ScheduleVisualizer } from "@/components/cad-visualizer";
import { procurementApi, type ActivityEvent, type BidRecord } from "@/lib/api";
import { activityActionLabel, cleanReasonText, displayCheckName, inCrore, recommendationLabel, recommendationTone } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";

type Tab = "summary" | "source" | "checks" | "impact" | "activity";
const tabs = [
  { id: "summary", label: "Summary", Icon: ShieldCheck },
  { id: "source", label: "Source data", Icon: FileSearch },
  { id: "checks", label: "Checks", Icon: CheckCircle2 },
  { id: "impact", label: "Impact", Icon: Network },
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

function evidenceNumber(evidence: Record<string, unknown> | null, key: string) {
  const value = evidence?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default function RecordBidReview({ record }: { record: BidRecord }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("summary");
  const [inspected, setInspected] = useState<BidRecord["scorecard"]["patrol_results"][number] | null>(null);
  const [rfiOpen, setRfiOpen] = useState(false);
  const [privilegedActionsEnabled, setPrivilegedActionsEnabled] = useState(false);
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

  useEffect(() => {
    procurementApi.readiness().then((readiness) => setPrivilegedActionsEnabled(readiness.public_read_only === false)).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line border-b-2 bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0 max-w-full">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="page-eyebrow">Bid review</p>
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text break-words">{source.vendor_name}</h1>
              <span className="rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase shadow-xs shrink-0" style={{ color, backgroundColor: `${color}18` }}>
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
              className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                tab === id ? "border-cyan text-cyan" : "border-transparent text-text/55 hover:text-text"
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
            <CardHeader
              title="Reviewer action"
              caption={privilegedActionsEnabled ? "Human review is required before any procurement action is recorded." : "The public demo allows inspection and draft generation; privileged approval actions are protected."}
            />
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
                    className="rounded-lg bg-violet/20 px-4 py-2 text-sm font-semibold text-violet hover:bg-violet/30"
                  >
                    Review RFI draft
                  </button>
                )}
                <ReviewerDecision record={record} enabled={privilegedActionsEnabled} />
              </div>
            </div>
          </Card>

          <RFIModal
            isOpen={rfiOpen}
            onClose={() => setRfiOpen(false)}
            vendorName={source.vendor_name}
            bidId={record.id}
            approvalDisabled={!privilegedActionsEnabled}
            findings={record.scorecard.patrol_results
              .filter((check) => check.status !== "PASS")
              .map((check) => `${displayCheckName(check.patrol_name)}: ${check.reason}`)}
          />
        </div>
      )}

      {tab === "source" && <SourceTab record={record} onRemoved={() => router.replace("/bids")} />}

      {tab === "checks" && (
        <section aria-label="Compliance checks" className="grid gap-4 lg:grid-cols-2">
          {record.scorecard.patrol_results.map((check) => (
            <Card
              key={check.patrol_name}
              accent={check.status === "FAIL" ? COLORS.rose : check.status === "FLAG" ? COLORS.amber : COLORS.cyan}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{displayCheckName(check.patrol_name)}</p>
                  <p className="mt-1 text-xs text-text/55">{check.reason}</p>
                </div>
                <PatrolBadge status={check.status} size="sm" />
              </div>
              <code className="mt-3 block break-words rounded bg-inset px-3 py-2 text-[10px] text-text/60">
                {check.rule_broken ?? "No rule identifier returned"}
              </code>
              <button
                type="button"
                onClick={() => setInspected(check)}
                className="mt-3 text-xs font-medium text-cyan hover:underline"
              >
                Inspect evidence & geometry
              </button>
            </Card>
          ))}
        </section>
      )}

      {tab === "impact" && <EvidenceBoard record={record} />}
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
  const [canRemove, setCanRemove] = useState(false);
  const [error, setError] = useState("");
  const e = record.source.equipment;
  const fields = [
    ["Vendor", record.source.vendor_name],
    ["Model", e.model_number],
    ["Power draw", e.power_draw_kw == null ? "Not provided" : `${e.power_draw_kw} kW`],
    ["Cooling capacity", e.cooling_capacity_kw == null ? "Not provided" : `${e.cooling_capacity_kw} kW`],
    ["Width", e.width_m == null ? "Not provided" : `${e.width_m} m`],
    ["Embodied carbon", e.embodied_carbon_factor == null ? "Not provided" : `${e.embodied_carbon_factor} kgCO₂e/ton`],
    ["Safety certificate", record.source.has_osha_cert == null ? "Not provided" : record.source.has_osha_cert ? "Present" : "Missing"],
  ];

  const candidates = record.source.extraction_report?.candidates ?? [];
  const annotations = record.source.extraction_report?.dimension_annotations ?? [];

  useEffect(() => setCanRemove(procurementApi.canRemove(record.id)), [record.id]);

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
      <Card>
        <CardHeader
          title="Extracted source data"
          caption="Confirm extracted document values against the source PDF before acting."
          right={
            <a href={procurementApi.sourceUrl(record.id)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cyan hover:underline">
              Open source PDF
            </a>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm border-collapse table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[72%]" />
            </colgroup>
            <tbody>
              {fields.map(([label, value]) => (
                <tr key={label} className="border-b border-line/40 hover:bg-cyan/5 transition-colors">
                  <th className="px-4 py-3 text-left font-bold text-text/60 first:rounded-tl-[0.9rem]">{label}</th>
                  <td className="px-4 py-3 font-mono font-semibold text-text">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Extracted Candidates & Evidence Location */}
      {candidates.length > 0 && (
        <Card>
          <CardHeader
            title="Extracted PDF text regions"
            caption="Traceable source excerpts and page location details extracted from the PDF text layer."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs font-mono border-collapse table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[24%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-line text-left table-header bg-surface/50">
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap first:rounded-tl-[0.9rem]">Field</th>
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap">Value</th>
                  <th className="px-4 py-2.5 font-bold text-center whitespace-nowrap">Page</th>
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap">Bounding Box</th>
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap last:rounded-tr-[0.9rem]">Source Excerpt</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i} className="border-b border-line/40 align-top transition-colors duration-150 hover:bg-cyan/5 dark:hover:bg-cyan/10">
                    <td className="px-4 py-2.5 font-bold text-cyan truncate">{c.field}</td>
                    <td className="px-4 py-2.5 text-text font-semibold truncate">{String(c.normalized_value)} {c.unit ?? ""}</td>
                    <td className="px-4 py-2.5 text-text/60 text-center">{c.page ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {c.bbox ? (
                        <span className="rounded-md bg-cyan/10 px-1.5 py-0.5 font-bold text-cyan border border-cyan/20">
                          [{c.bbox.map((v) => v.toFixed(1)).join(", ")}]
                        </span>
                      ) : (
                        <span className="rounded-md bg-surface px-1.5 py-0.5 text-text/40 border border-line">
                          Region unavailable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text/60 max-w-[260px] truncate">{c.source_excerpt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dimension Annotations (if present) */}
      {annotations.length > 0 && (
        <Card accent={COLORS.amber}>
          <CardHeader
            title="Detected dimension annotations"
            caption="Parsed drawing text annotations — detected text only, not full CAD/BIM model geometry."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs font-mono border-collapse table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[26%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-line text-left table-header bg-surface/50">
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap first:rounded-tl-[0.9rem]">Annotation Field</th>
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap">Value</th>
                  <th className="px-4 py-2.5 font-bold text-center whitespace-nowrap">Page</th>
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap">Coordinates</th>
                  <th className="px-4 py-2.5 font-bold whitespace-nowrap last:rounded-tr-[0.9rem]">Status</th>
                </tr>
              </thead>
              <tbody>
                {annotations.map((a, i) => (
                  <tr key={i} className="border-b border-line/40 align-top transition-colors duration-150 hover:bg-cyan/5 dark:hover:bg-cyan/10">
                    <td className="px-4 py-2.5 font-bold text-amber">{a.field}</td>
                    <td className="px-4 py-2.5 text-text font-semibold">{a.normalized_value} {a.unit}</td>
                    <td className="px-4 py-2.5 text-text/60 text-center">Page {a.page}</td>
                    <td className="px-4 py-2.5 text-text/70">[{a.bbox.map((v) => v.toFixed(1)).join(", ")}]</td>
                    <td className="px-4 py-2.5 text-text/50">{a.interpretation_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Document metadata" caption="Captured from the document where available." />
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <Metric label="Author" value={record.source.document_metadata.author ?? "Not provided"} />
          <Metric label="Created" value={record.source.document_metadata.creation_date ?? "Not provided"} />
          <Metric label="Creator" value={record.source.document_metadata.creator_tool ?? "Not provided"} />
        </div>
      </Card>

      <ViceSquadCard record={record} />

      {canRemove && (
        <Card>
          <CardHeader title="Remove uploaded bid" caption="This deletes the persisted record, activity, and source PDF." />
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-xs text-text/55">Available only for uploads created in this browser session.</p>
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
      )}
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
              <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-violet">Vendor Risk Score</p>
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
            <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-text/40">Patrol Finding</p>
            <p className="mt-0.5 text-sm font-medium text-text leading-snug">{cleanReasonText(vice.reason)}</p>
          </div>
        </div>

        {entries.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {entries.map(([k, v]) => {
              const isScoreIndex = typeof v === "number" && (k.includes("index") || k.includes("score"));
              const scoreVal = isScoreIndex ? Number(v) : 0;
              const indexTone = k === "agreement_compliance_index"
                ? scoreVal === 0 ? COLORS.emerald : scoreVal < 50 ? COLORS.amber : COLORS.rose
                : scoreVal < 70 ? COLORS.rose : scoreVal < 85 ? COLORS.amber : COLORS.emerald;

              return (
                <div key={k} className="rounded-xl border border-line bg-card p-4 shadow-xs space-y-2">
                  <dt className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-text/50">
                      {k.replaceAll("_", " ")}
                    </span>
                    {isScoreIndex && (
                      <span className="font-mono text-xs font-black tabular-nums" style={{ color: indexTone }}>
                        {scoreVal}/100
                      </span>
                    )}
                  </dt>
                  <dd>
                    {isScoreIndex ? (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="h-2 w-full rounded-full bg-surface border border-line/40 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, scoreVal))}%`, backgroundColor: indexTone }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-text">
                        {formatEvidenceValue(v)}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
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

function ReviewerDecision({ record, enabled }: { record: BidRecord; enabled: boolean }) {
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
        disabled={!enabled || state === "saving" || state === "saved"}
        className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
          blocked ? "bg-rose/15 text-rose hover:bg-rose/25" : "bg-cyan/15 text-cyan hover:bg-cyan/25"
        }`}
      >
        {!enabled ? "Protected in public demo" : state === "saving" ? "Recording…" : state === "saved" ? "Decision recorded" : blocked ? "Record do not select" : "Record ready for decision"}
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.classList.add("scroll-locked");
    const listener = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      document.body.classList.remove("scroll-locked");
    };
  }, [onClose]);

  const candidates = record.source.extraction_report?.candidates ?? [];
  const relevantFields = check.patrol_name.includes("BUILDING")
    ? ["equipment.power_draw_kw", "equipment.width_m"]
    : check.patrol_name.includes("GREEN")
    ? ["equipment.embodied_carbon_factor"]
    : check.patrol_name.includes("TRAFFIC")
    ? ["promised_delivery_weeks"]
    : [];
  const relevantCandidates = candidates.filter((candidate) => relevantFields.includes(candidate.field));

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs" role="presentation" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Evidence detail"
        onMouseDown={(event) => event.stopPropagation()}
        className="fixed right-0 top-0 bottom-0 z-[101] flex w-full max-w-md flex-col border-l border-line bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4 bg-surface/30">
          <div>
            <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-cyan">Evidence & Location Detail</p>
            <h3 className="mt-0.5 text-base font-extrabold text-text">{displayCheckName(check.patrol_name)}</h3>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-xl border border-line bg-surface hover:bg-surface/80 px-3 py-1.5 text-xs font-extrabold text-text/80 hover:text-text tactile-press shadow-xs">
            Close
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text/50">Patrol Result</p>
            <p className="mt-2 text-sm text-text/80">{check.reason}</p>
          </section>

          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text/50">Measured Value vs Constraint Limit</p>
            <p className="mt-2 break-words text-sm font-mono text-text/80">{evidenceText(check.evidence)}</p>
          </section>

          {check.patrol_name === "BUILDING_PATROL" && (
            <CADVisualizer
              widthM={evidenceNumber(check.evidence, "width_m")}
              doorLimitM={evidenceNumber(check.evidence, "door_limit_m")}
            />
          )}

          {check.patrol_name === "TRAFFIC_CONTROL" && (
            <ScheduleVisualizer
              promisedWeeks={evidenceNumber(check.evidence, "promised_delivery_weeks")}
              maximumWeeks={evidenceNumber(check.evidence, "maximum_delivery_weeks")}
            />
          )}

          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text/50">Rule Identifier</p>
            <code className="mt-2 block break-words rounded-xl border border-line bg-surface p-3 text-xs text-text/75 shadow-xs">
              {check.rule_broken ?? "No rule exception — constraint satisfied"}
            </code>
          </section>

          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text/50">Source Location & Geometry</p>
            <div className="mt-2 space-y-2">
              {relevantCandidates.length ? relevantCandidates.map((candidate) => (
                <div key={candidate.field} className="space-y-2 rounded-xl border border-line bg-surface p-3.5 text-xs font-mono shadow-xs">
                  <p className="font-bold text-cyan">{candidate.field}</p>
                  <div className="flex justify-between">
                    <span className="text-text/50">Page:</span>
                    <span className="text-text/80">{candidate.page != null ? `Page ${candidate.page}` : "Document text"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-text/50">Geometry Region:</span>
                    <span className={candidate.bbox ? "text-right text-cyan font-bold" : "text-text/40"}>
                      {candidate.bbox ? `[${candidate.bbox.map((value) => value.toFixed(1)).join(", ")}]` : "Region unavailable"}
                    </span>
                  </div>
                  <div className="border-t border-line/50 pt-2">
                    <span className="block text-[10px] text-text/50 uppercase font-bold">Cited Excerpt:</span>
                    <p className="mt-1 text-text/80 italic">&quot;{candidate.source_excerpt}&quot;</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-line bg-surface p-3.5 text-xs font-mono text-text/50 shadow-xs">
                  No source text region supports this deterministic rule result.
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
