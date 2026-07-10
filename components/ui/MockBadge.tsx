// Transparency badge: place on anything simulated. Scoring plus per the source
// doc's "wired vs mocked" table.
export default function MockBadge({ label = "MOCKED" }: { label?: string }) {
  return (
    <span
      title="Simulated for this proposal-stage demo — not wired to a live service."
      className="inline-flex items-center gap-1 rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber"
    >
      <span className="h-1 w-1 rounded-full bg-amber" />
      {label}
    </span>
  );
}
