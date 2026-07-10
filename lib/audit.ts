// In-memory, append-only audit log. No edits, no deletes. Resets on refresh.
// A tiny pub/sub so any component can subscribe to new rows.

export interface AuditRow {
  timestamp: string;
  bid: string;
  patrol: string;
  action: string;
  rule: string;
  evidence: string;
}

const log: AuditRow[] = [];
const listeners = new Set<() => void>();
// Dedup guard so React StrictMode double-invokes don't create phantom rows.
const seen = new Set<string>();
// Cached immutable snapshot. Replaced only when the log actually changes so
// useSyncExternalStore sees a stable reference and doesn't loop.
let snapshot: AuditRow[] = [];

export function appendAudit(row: Omit<AuditRow, "timestamp"> & { timestamp?: string }) {
  const key = `${row.bid}|${row.patrol}|${row.action}|${row.rule}`;
  if (seen.has(key)) return;
  seen.add(key);
  log.push({ timestamp: new Date().toISOString(), ...row });
  snapshot = [...log];
  listeners.forEach((l) => l());
}

export function getAudit(): AuditRow[] {
  return snapshot;
}

export function subscribeAudit(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function auditToCsv(): string {
  const headers = ["timestamp", "bid", "patrol", "action", "rule", "evidence"];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of log) {
    lines.push(
      [r.timestamp, r.bid, r.patrol, r.action, r.rule, r.evidence].map(escape).join(",")
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename = "po-lice-audit-log.csv") {
  const csv = auditToCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
