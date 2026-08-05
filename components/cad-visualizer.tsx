interface ComparisonProps {
  measured: number | null;
  limit: number | null;
  measuredLabel: string;
  limitLabel: string;
  unit: string;
}

function Comparison({ measured, limit, measuredLabel, limitLabel, unit }: ComparisonProps) {
  if (measured == null || limit == null) {
    return (
      <section className="rounded-xl border border-amber/30 bg-amber/5 p-4" aria-label={`${measuredLabel} comparison unavailable`}>
        <p className="text-xs font-bold text-amber">Comparison unavailable</p>
        <p className="mt-1 text-xs text-text/55">The submitted value or recorded constraint is missing. No result is inferred.</p>
      </section>
    );
  }

  const scale = Math.max(measured, limit, 0.01);
  const exceeds = measured > limit;
  const measuredWidth = `${Math.max(4, (measured / scale) * 100)}%`;
  const limitWidth = `${Math.max(4, (limit / scale) * 100)}%`;

  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-label={`${measuredLabel} compared with ${limitLabel}`}>
      <p className={`text-xs font-bold ${exceeds ? "text-rose" : "text-cyan"}`}>
        {exceeds ? `${measuredLabel} exceeds the recorded limit` : `${measuredLabel} is within the recorded limit`}
      </p>
      <div className="mt-4 space-y-3 font-mono text-[11px]">
        <div>
          <div className="mb-1 flex justify-between gap-3 text-text/65"><span>{measuredLabel}</span><span>{measured.toFixed(2)} {unit}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-card"><div className={`h-full rounded-full ${exceeds ? "bg-rose" : "bg-cyan"}`} style={{ width: measuredWidth }} /></div>
        </div>
        <div>
          <div className="mb-1 flex justify-between gap-3 text-text/65"><span>{limitLabel}</span><span>{limit.toFixed(2)} {unit}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-text/35" style={{ width: limitWidth }} /></div>
        </div>
      </div>
    </section>
  );
}

export default function CADVisualizer({ widthM, doorLimitM }: { widthM: number | null; doorLimitM: number | null }) {
  return <Comparison measured={widthM} limit={doorLimitM} measuredLabel="Equipment width" limitLabel="Door clearance" unit="m" />;
}

export function ScheduleVisualizer({ promisedWeeks, maximumWeeks }: { promisedWeeks: number | null; maximumWeeks: number | null }) {
  return <Comparison measured={promisedWeeks} limit={maximumWeeks} measuredLabel="Promised delivery" limitLabel="Maximum delivery" unit="weeks" />;
}
