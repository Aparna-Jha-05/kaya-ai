// TCO² scorecard helpers — REAL math over the mock bid values.
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
  decision: "RECOMMENDED" | "ACCEPTABLE" | "REJECT";
}

function riskBucket(score: number): "Low" | "Med" | "High" {
  if (score >= 7) return "High";
  if (score >= 4) return "Med";
  return "Low";
}

function scheduleBucket(p95: number): "Low" | "Med" | "High" {
  if (p95 > 14) return "High";
  if (p95 > 7) return "Med";
  return "Low";
}

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
    decision: bid.recommendation,
  };
}

export const allScorecards = (): ScorecardRow[] => BIDS.map(scorecard);

// Data shape for the recharts grouped bar: upfront vs 5-year TCO².
export const tcoChartData = () =>
  BIDS.map((b) => ({
    vendor: b.vendor.replace("Vendor ", "V"),
    Upfront: b.upfront_cost_cr,
    "5-Year TCO²": b.tco2_cr,
  }));
