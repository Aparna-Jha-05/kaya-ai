// Used once beside an action or result that depends on simulated infrastructure.
export default function MockBadge({ label = "SIMULATED" }: { label?: string }) {
  return (
    <span
      title="This action is simulated in the current demonstration build."
      className="inline-flex items-center gap-1 rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber"
    >
      <span className="h-1 w-1 rounded-full bg-amber" />
      {label}
    </span>
  );
}
