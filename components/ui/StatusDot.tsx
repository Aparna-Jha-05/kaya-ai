import { STATUS_COLOR, Status } from "@/lib/constants";

export default function StatusDot({ status }: { status: Status }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  );
}
