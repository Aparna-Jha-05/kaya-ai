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
    <section className="rounded-xl border border-line bg-card p-5" aria-labelledby="clearance-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-rose">Dimension Annotation Clearance Check</p>
          <h3 id="clearance-heading" className="mt-1 text-base font-semibold text-text">Equipment width exceeds the access limit</h3>
          <p className="mt-1 text-xs text-text/55">Extracted from detected PDF text regions or dimension annotations and compared with the recorded door clearance.</p>
        </div>
        <span className="shrink-0 rounded border border-rose/50 bg-rose/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-rose">Fail</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Metric label="Equipment width" value={`${initialWidthM.toFixed(2)} m`} tone="rose" />
        <Metric label="Door clearance" value={`${doorLimitM.toFixed(2)} m`} />
      </div>

      <div className="relative mt-4 flex h-56 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-inset">
        <div className="absolute inset-y-4 left-1/2 w-[190px] -translate-x-1/2 border-x-2 border-dashed border-text/30">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-inset px-1.5 py-0.5 font-mono text-[10px] text-text/55">Door clearance: {doorLimitM.toFixed(2)} m</span>
        </div>
        <div className="relative flex h-[130px] flex-col justify-between rounded border-2 border-rose bg-rose/10 p-2 shadow-[0_0_20px_rgba(244,63,94,0.2)]" style={{ width: `${widthPx}px` }}>
          <span className="w-fit rounded bg-rose px-1.5 py-0.5 text-[10px] font-bold text-on-accent">Extracted width: {initialWidthM.toFixed(2)} m</span>
          <span className="font-mono text-[10px] font-bold text-rose">Exceeds limit by {(initialWidthM - doorLimitM).toFixed(2)} m</span>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "text" }: { label: string; value: string; tone?: "text" | "rose" }) {
  return <div className="rounded-lg border border-white/10 bg-inset px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-text/40">{label}</p><p className={`mt-1 font-mono text-sm font-semibold ${tone === "rose" ? "text-rose" : "text-text"}`}>{value}</p></div>;
}
