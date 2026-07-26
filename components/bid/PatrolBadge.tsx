import { STATUS_COLOR, Status } from "@/lib/constants";
import { statusText } from "@/lib/recordUtils";
import { Check, X, AlertTriangle } from "lucide-react";

const ICON = {
  PASS: Check,
  FAIL: X,
  FLAG: AlertTriangle,
};

export default function PatrolBadge({
  status,
  size = "md",
}: {
  status: Status;
  size?: "sm" | "md";
}) {
  const color = STATUS_COLOR[status];
  const Icon = ICON[status];
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";
  const icon = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-bold uppercase tracking-[0.06em] ${pad}`}
      style={{
        color,
        backgroundColor: `${color}1a`,
        border: `1px solid ${color}55`,
      }}
    >
      <Icon className={icon} strokeWidth={3} />
      {statusText(status)}
    </span>
  );
}
