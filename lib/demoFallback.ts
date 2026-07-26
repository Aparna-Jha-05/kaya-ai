import { BIDS, type Bid } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import type { ComplianceCheck, LiveBid } from "@/lib/api";

const checkName = { building: "BUILDING_PATROL", green: "GREEN_PATROL", vice: "VICE_SQUAD", traffic: "TRAFFIC_CONTROL" } as const;

function sampleBid(bid: Bid): LiveBid {
  const checks = runAllPatrols(bid);
  const patrol_results = (Object.entries(checks) as [keyof typeof checkName, typeof checks.building][]).map(([key, result]) => ({
    patrol_name: checkName[key], status: result.status, risk_score: result.riskScore ?? null, reason: result.detail,
    rule_broken: result.rule, evidence: { sample_evidence: result.evidence },
  } satisfies ComplianceCheck));
  return { id: `sample-${bid.id}`, filename: "Sample scenario — no uploaded document", submitted_at: "", is_sample: true,
    source: { vendor_name: bid.vendor, bid_amount_inr: bid.upfront_cost_cr * 10_000_000, promised_delivery_weeks: bid.delivery_weeks, has_osha_cert: bid.has_safety_cert,
      equipment: { equipment_type: bid.equipment_type, manufacturer: bid.vendor, model_number: bid.model, power_draw_kw: bid.power_draw_kw, cooling_capacity_kw: bid.cooling_capacity_kw, width_m: undefined, embodied_carbon_factor: bid.carbon_intensity_kgco2e }, extracted_clauses: [], document_metadata: {} },
    scorecard: { patrol_results, calculated_tco2_inr: bid.tco2_cr * 10_000_000, recommendation: bid.recommendation === "REJECT" ? "REJECT" : bid.recommendation === "RECOMMENDED" ? "RECOMMENDED" : "REVIEW_REQUIRED" },
  };
}

export const sampleBids = BIDS.map(sampleBid);
export const sampleBidById = (id: string) => sampleBids.find((bid) => bid.id === id);
