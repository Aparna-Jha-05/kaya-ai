import type { BidRecord, CheckStatus } from "@/lib/api";

export function recommendationLabel(value: BidRecord["scorecard"]["recommendation"]) {
  if (value === "REJECT") return "Do not select";
  if (value === "RECOMMENDED") return "Ready for decision";
  return "Needs review";
}

export function recommendationTone(value: BidRecord["scorecard"]["recommendation"]) {
  return value === "REJECT" ? "rose" : value === "RECOMMENDED" ? "cyan" : "amber";
}

export function displayCheckName(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("building") || normalized.includes("engineering")) return "Engineering";
  if (normalized.includes("green") || normalized.includes("carbon")) return "Carbon";
  if (normalized.includes("vice") || normalized.includes("reliability")) return "Reliability";
  if (normalized.includes("traffic") || normalized.includes("schedule")) return "Schedule";
  return name;
}

export function recordCheck(record: BidRecord, name: string) {
  const normalized = name.toLowerCase();
  return record.scorecard.patrol_results.find((check) => check.patrol_name.toLowerCase().includes(normalized));
}

export function hasHardFailure(record: BidRecord) {
  return record.scorecard.patrol_results.some((check) => {
    const name = check.patrol_name.toLowerCase();
    return check.status === "FAIL" && (name.includes("building") || name.includes("engineering") || name.includes("green") || name.includes("carbon"));
  });
}

export function statusText(status: CheckStatus) {
  return status === "PASS" ? "Pass" : status === "FAIL" ? "Fail" : "Review";
}

export function activityActionLabel(action: string) {
  if (action === "RFI_DRAFT_APPROVED") return "RFI draft approved";
  if (action === "REVIEWED_DO_NOT_SELECT") return "Do not select recorded";
  if (action === "REVIEWED_READY_FOR_DECISION") return "Ready-for-decision review recorded";
  return statusText(action as CheckStatus);
}

export function getPatrolCategory(name: string): "engineering" | "carbon" | "reliability" | "schedule" {
  const normalized = name.toLowerCase();
  if (normalized.includes("building") || normalized.includes("engineering")) return "engineering";
  if (normalized.includes("green") || normalized.includes("carbon")) return "carbon";
  if (normalized.includes("vice") || normalized.includes("reliability")) return "reliability";
  return "schedule";
}

export function formatCrore(value: number | null | undefined, fallback = "—") {
  return value == null ? fallback : `${(value / 10_000_000).toFixed(2)} Cr`;
}

export const inCrore = (value: number | null | undefined) => formatCrore(value, "Not provided");
export const formatCroreValue = (value: number | null | undefined) => formatCrore(value, "—");

export function cleanReasonText(reason: string | null | undefined) {
  if (!reason) return "";
  return reason.replace(/^Agreement Compliance Index:\s*\d+(\.\d+)?(\/\d+)?\.\s*/i, "").trim();
}

export function formatLabelTitleCase(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
