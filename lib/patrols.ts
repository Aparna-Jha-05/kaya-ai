// -----------------------------------------------------------------------------
// REAL LAYER — the four patrols are genuine deterministic TypeScript.
// "LLM extracts, math decides." No randomness in pass/fail (Traffic Control uses
// a real Monte Carlo for the delay ESTIMATE only, never for the pass/fail gate).
// -----------------------------------------------------------------------------

import { Bid, EPD_TABLE, SITE, VENDOR_DOCS } from "./mockData";
import type { Status } from "./constants";

export interface PatrolResult {
  key: "building" | "green" | "vice" | "traffic";
  status: Status;
  detail: string;
  rule: string;
  evidence: string[];
}

// --- Patrol 1: Building Patrol -----------------------------------------------
export function buildingPatrol(bid: Bid): PatrolResult {
  const checks: { ok: boolean; rule: string }[] = [
    {
      ok: bid.power_draw_kw <= SITE.substation_power_limit_kw,
      rule: `power_draw_kw (${bid.power_draw_kw}) > substation_power_limit_kw (${SITE.substation_power_limit_kw})`,
    },
    {
      ok: bid.cooling_capacity_kw <= SITE.cooling_cap_max_kw,
      rule: `cooling_capacity_kw (${bid.cooling_capacity_kw}) > cooling_cap_max_kw (${SITE.cooling_cap_max_kw})`,
    },
    {
      ok: bid.water_evaporation_gpm <= SITE.water_evap_cap_gpm,
      rule: `water_evaporation_gpm (${bid.water_evaporation_gpm}) > water_evap_cap_gpm (${SITE.water_evap_cap_gpm})`,
    },
    {
      ok: bid.floor_load_kg_m2 <= SITE.floor_load_limit_kg_m2,
      rule: `floor_load_kg_m2 (${bid.floor_load_kg_m2}) > floor_load_limit_kg_m2 (${SITE.floor_load_limit_kg_m2})`,
    },
  ];

  const breaches = checks.filter((c) => !c.ok);
  const status: Status = breaches.length > 0 ? "FAIL" : "PASS";

  return {
    key: "building",
    status,
    detail:
      status === "PASS"
        ? "All engineering limits satisfied."
        : `${breaches.length} hard engineering limit${breaches.length > 1 ? "s" : ""} breached.`,
    rule: breaches.length > 0 ? breaches[0].rule : "all limits within spec",
    evidence: breaches.map((b) => b.rule),
  };
}

// --- Patrol 2: Green Patrol --------------------------------------------------
export function greenPatrol(bid: Bid): PatrolResult {
  // Bids carry the carbon value; if absent, fall back to EPD lookup.
  let carbon = bid.carbon_intensity_kgco2e;
  let source = "bid";
  if (carbon == null || Number.isNaN(carbon)) {
    carbon = EPD_TABLE[bid.model]?.carbon_intensity_kgco2e ?? 0;
    source = "EPD lookup";
  }

  const over = carbon > SITE.carbon_budget_kgco2e;
  const status: Status = over ? "FAIL" : "PASS";
  const delta = carbon - SITE.carbon_budget_kgco2e;

  return {
    key: "green",
    status,
    detail: over
      ? `Embodied carbon ${carbon.toLocaleString()} kgCO₂e exceeds budget by ${delta.toLocaleString()} kgCO₂e.`
      : `Embodied carbon ${carbon.toLocaleString()} kgCO₂e is within the ${SITE.carbon_budget_kgco2e.toLocaleString()} kgCO₂e budget.`,
    rule: `carbon_intensity_kgco2e (${carbon.toLocaleString()}) ${over ? ">" : "≤"} carbon_budget_kgco2e (${SITE.carbon_budget_kgco2e.toLocaleString()})`,
    evidence: [`carbon source: ${source}`, `budget: ${SITE.carbon_budget_kgco2e.toLocaleString()} kgCO₂e`],
  };
}

// --- Patrol 3: Vice Squad ----------------------------------------------------
export function viceSquad(bid: Bid): PatrolResult {
  const docs = VENDOR_DOCS[bid.id] ?? [];
  const missing_cert = bid.has_insurance_cert ? 0 : 1;
  const { late_deliveries, disputes } = bid.vendor_history;

  // Deterministic score. Vendor B: 3*2 + 1*3 + 1*4 = 13 -> capped 10.
  const raw = late_deliveries * 2 + disputes * 3 + missing_cert * 4;
  const risk = Math.min(10, raw);
  const status: Status = risk > 6 ? "FLAG" : "PASS";

  return {
    key: "vice",
    status,
    detail: `Reliability risk ${risk}/10 — ${late_deliveries} late of ${bid.vendor_history.total_deliveries} deliveries, ${disputes} dispute${disputes === 1 ? "" : "s"}${missing_cert ? ", missing safety cert" : ""}.`,
    rule: `risk = min(10, late(${late_deliveries})*2 + disputes(${disputes})*3 + missing_cert(${missing_cert})*4) = ${risk}`,
    evidence: docs,
  };
}

// --- Patrol 4: Traffic Control ----------------------------------------------
// Real base delay + a real Monte Carlo (~1000 iterations) for delay propagation.
export interface TrafficResult extends PatrolResult {
  base_delay_weeks: number;
  p50_days: number;
  p95_days: number;
}

// Deterministic PRNG (mulberry32) so the Monte Carlo is reproducible for a demo
// while still being a genuine stochastic simulation.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function trafficControl(bid: Bid, viceRisk: number): TrafficResult {
  const base_delay_weeks = Math.max(0, bid.delivery_weeks - SITE.max_delivery_weeks);
  const base_delay_days = base_delay_weeks * 7;

  // Reliability prior from the Vice Squad score. The raw contractual slip is
  // partly absorbed by schedule float; a reliable vendor recovers more of it, a
  // risky one lets it propagate. Tuned so Vendor B (base 2wk, risk 10) lands at
  // p50 ~12 days with p95 > 14 (FLAG), while on-time vendors stay near zero.
  const propagationFactor = 0.45 + 0.04 * viceRisk; // risk 10 -> 0.85
  const meanDays = base_delay_days * propagationFactor; // B: 14 * 0.85 = 11.9
  const sigma = 2.5 + 0.35 * viceRisk; // risk 10 -> 6.0 days of spread
  const ITER = 1000;
  const rng = mulberry32(0x50 * bid.id.charCodeAt(0) + bid.delivery_weeks);

  const samples: number[] = [];
  for (let i = 0; i < ITER; i++) {
    // Box-Muller normal draw around the propagated mean, clamped non-negative.
    const u = rng();
    const v = rng();
    const gauss = Math.sqrt(-2 * Math.log(u + 1e-9)) * Math.cos(2 * Math.PI * v);
    const propagated = Math.max(0, meanDays + gauss * sigma);
    samples.push(propagated);
  }
  samples.sort((a, b) => a - b);
  const p50_days = Math.round(samples[Math.floor(ITER * 0.5)]);
  const p95_days = Math.round(samples[Math.floor(ITER * 0.95)]);

  // Pass/fail gate is deterministic: FLAG when p95 > 14 days.
  const status: Status = p95_days > 14 ? "FLAG" : "PASS";

  return {
    key: "traffic",
    status,
    base_delay_weeks,
    p50_days,
    p95_days,
    detail:
      base_delay_weeks > 0
        ? `Base slip ${base_delay_weeks} week(s). Monte Carlo delay exposure: p50 ~${p50_days}d, p95 ~${p95_days}d.`
        : `Delivery within ROJ window. Residual exposure p50 ~${p50_days}d, p95 ~${p95_days}d.`,
    rule: `base_delay_weeks = delivery_weeks(${bid.delivery_weeks}) - max_delivery_weeks(${SITE.max_delivery_weeks}) = ${base_delay_weeks}; FLAG when p95 > 14d`,
    evidence: [
      `Monte Carlo: ${ITER} iterations`,
      `reliability prior from Vice Squad risk = ${viceRisk}/10 (propagation ${propagationFactor.toFixed(2)}×)`,
      `p50 = ${p50_days}d, p95 = ${p95_days}d`,
    ],
  };
}

// Run every patrol for a bid, in the correct order (Vice feeds Traffic).
export function runAllPatrols(bid: Bid) {
  const building = buildingPatrol(bid);
  const green = greenPatrol(bid);
  const vice = viceSquad(bid);
  const viceRisk = parseInt(vice.rule.split("= ").pop() || "0", 10);
  const traffic = trafficControl(bid, viceRisk);
  return { building, green, vice, traffic };
}
