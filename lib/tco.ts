// TCO² scorecard helpers.
// scorecardFromRecord / allScorecardsFromRecords operate on live BidRecord objects.
// scorecard / allScorecards retain the mock-Bid path for offline/demo seeding.
import type { BidRecord } from "@/lib/api";
import { Bid, BIDS } from "./mockData";
import { runAllPatrols } from "./patrols";

export interface ScorecardRow {
  id: string;
  vendor: string;
  upfront_cost_cr: number;
  engineering: "PASS" | "FAIL";
  vendorRisk: "Low" | "Med" | "High";
  carbon: "PASS" | "FAIL";
  scheduleRisk: "Low" | "Med" | "High";
  tco2_cr: number;
  decision: "RECOMMENDED" | "REVIEW_REQUIRED" | "REJECT";
}

function riskBucket(score: number): "Low" | "Med" | "High" {
  if (score >= 7) return "High";
  if (score >= 4) return "Med";
  return "Low";
}

function scheduleBucket(days: number): "Low" | "Med" | "High" {
  if (days > 14) return "High";
  if (days > 7) return "Med";
  return "Low";
}

// ── Live BidRecord path ────────────────────────────────────────────────────────

export function scorecardFromRecord(record: BidRecord): ScorecardRow {
  const find = (fragment: string) =>
    record.scorecard.patrol_results.find((p) =>
      p.patrol_name.toLowerCase().includes(fragment)
    );
  const building = find("building");
  const green = find("green");
  const vice = find("vice");
  const traffic = find("traffic");
  const delayDays =
    typeof traffic?.evidence?.delay_days === "number"
      ? (traffic.evidence.delay_days as number)
      : 0;

  return {
    id: record.id,
    vendor: record.source.vendor_name,
    upfront_cost_cr: record.source.bid_amount_inr != null ? record.source.bid_amount_inr / 10_000_000 : 0,
    engineering: building?.status === "FAIL" ? "FAIL" : "PASS",
    vendorRisk: riskBucket(vice?.risk_score ?? 0),
    carbon: green?.status === "FAIL" ? "FAIL" : "PASS",
    scheduleRisk: scheduleBucket(delayDays),
    tco2_cr: record.scorecard.calculated_tco2_inr != null ? record.scorecard.calculated_tco2_inr / 10_000_000 : 0,
    decision: record.scorecard.recommendation,
  };
}

export function allScorecardsFromRecords(records: BidRecord[]): ScorecardRow[] {
  return records.map(scorecardFromRecord);
}

// ── Mock Bid path (offline seeder / demo fixtures) ─────────────────────────────

export function scorecard(bid: Bid): ScorecardRow {
  const { building, green, vice, traffic } = runAllPatrols(bid);
  const viceRisk = vice.riskScore ?? 0;

  return {
    id: bid.id,
    vendor: bid.vendor,
    upfront_cost_cr: bid.upfront_cost_cr,
    engineering: building.status === "FAIL" ? "FAIL" : "PASS",
    vendorRisk: riskBucket(viceRisk),
    carbon: green.status === "FAIL" ? "FAIL" : "PASS",
    scheduleRisk: scheduleBucket(traffic.p95_days),
    tco2_cr: bid.tco2_cr,
    decision: bid.recommendation === "ACCEPTABLE" ? "REVIEW_REQUIRED" : bid.recommendation,
  };
}

export const allScorecards = (): ScorecardRow[] => BIDS.map(scorecard);
