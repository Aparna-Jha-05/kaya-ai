import { STATUS_COLOR, Status } from "@/lib/constants";
import { statusText } from "@/lib/recordUtils";
import { Check, X, AlertTriangle } from "lucide-react";

const ICON = {
  PASS: Check,
  FAIL: X,
  FLAG: AlertTriangle,
};

const COLOR_VAR: Record<Status, string> = {
  PASS: "--color-cyan",
  FAIL: "--color-rose",
  FLAG: "--color-amber",
};

export default function PatrolBadge({
  status,
  size = "md",
}: {
  status: Status;
  size?: "sm" | "md";
}) {
  const varName = COLOR_VAR[status];
  const Icon = ICON[status];
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg font-mono font-extrabold uppercase tracking-[0.08em] shadow-xs transition-all ${pad}`}
      style={{
        color: `rgb(var(${varName}))`,
        backgroundColor: `rgba(var(${varName}), 0.15)`,
        border: `1.5px solid rgba(var(${varName}), 0.45)`,
      }}
    >
      <Icon className={icon} strokeWidth={3} />
      {statusText(status)}
    </span>
  );
}
