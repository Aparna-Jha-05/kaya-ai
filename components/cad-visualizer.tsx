interface CADVisualizerProps {
  initialWidthM?: number;
  doorLimitM?: number;
}

export default function CADVisualizer({
  initialWidthM = 2.1,
  doorLimitM = 1.9,
}: CADVisualizerProps) {
  const widthPx = Math.round(initialWidthM * 100);

  return (
    <section className="rounded-2xl border border-line border-b-2 bg-card p-5 shadow-xs" aria-labelledby="clearance-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-rose font-bold">Spatial Clearance Check</p>
          <h3 id="clearance-heading" className="mt-1 text-base font-bold text-text">Equipment Width Exceeds Door Limit</h3>
          <p className="mt-1 text-xs text-text/60 font-medium">Extracted CAD dimension annotation compared against site access limit.</p>
        </div>
        <span className="shrink-0 rounded-lg border border-rose/50 bg-rose/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-rose shadow-xs">Fail</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Metric label="Equipment Width" value={`${initialWidthM.toFixed(2)} m`} tone="rose" />
        <Metric label="Access Limit" value={`${doorLimitM.toFixed(2)} m`} />
      </div>

      <div className="relative mt-4 flex h-56 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface/50">
        <div className="absolute inset-y-4 left-1/2 w-[55%] max-w-[280px] -translate-x-1/2 border-x-2 border-dashed border-text/30">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-text/70 shadow-xs">Door clearance: {doorLimitM.toFixed(2)} m</span>
        </div>
        <div className="relative flex h-[130px] flex-col justify-between rounded-xl border-2 border-rose bg-rose/10 p-2.5 shadow-[0_0_20px_rgba(244,63,94,0.2)]" style={{ width: `${widthPx}px` }}>
          <span className="w-fit rounded-md bg-rose px-2 py-0.5 text-[10px] font-extrabold text-on-accent shadow-xs">Extracted width: {initialWidthM.toFixed(2)} m</span>
          <span className="font-mono text-[10px] font-bold text-rose">Exceeds limit by {(initialWidthM - doorLimitM).toFixed(2)} m</span>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "text" }: { label: string; value: string; tone?: "text" | "rose" }) {
  return <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-xs"><p className="text-[10px] font-bold uppercase tracking-wider text-text/50">{label}</p><p className={`mt-1 font-mono text-sm font-bold ${tone === "rose" ? "text-rose" : "text-text"}`}>{value}</p></div>;
}
