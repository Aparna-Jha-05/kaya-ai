// -----------------------------------------------------------------------------
// MOCKED LAYER — this file stands in for the LLM extraction output + PostgreSQL.
// In production these values come from document intelligence + Amber's Project
// Graph. For the demo they are hardcoded. The math in patrols.ts is REAL.
// -----------------------------------------------------------------------------

export interface SiteConstraints {
  substation_power_limit_kw: number;
  cooling_cap_max_kw: number;
  water_evap_cap_gpm: number;
  floor_load_limit_kg_m2: number;
  carbon_budget_kgco2e: number;
  max_delivery_weeks: number;
}

// From "Amber's Project Graph" — IIT Smart Campus Phase 1, data center chilled-water plant.
export const SITE: SiteConstraints = {
  substation_power_limit_kw: 1200,
  cooling_cap_max_kw: 3500,
  water_evap_cap_gpm: 400,
  floor_load_limit_kg_m2: 1500,
  carbon_budget_kgco2e: 850000,
  max_delivery_weeks: 16,
};

export interface VendorHistory {
  late_deliveries: number;
  total_deliveries: number;
  disputes: number;
}

export interface Bid {
  id: string;
  vendor: string;
  equipment_type: string;
  model: string;
  power_draw_kw: number;
  cooling_capacity_kw: number;
  water_evaporation_gpm: number;
  floor_load_kg_m2: number;
  carbon_intensity_kgco2e: number;
  delivery_weeks: number;
  has_safety_cert: boolean;
  upfront_cost_cr: number;
  tco2_cr: number;
  vendor_history: VendorHistory;
  recommendation: "RECOMMENDED" | "ACCEPTABLE" | "REJECT";
  po_number: string;
}

export const BIDS: Bid[] = [
  {
    id: "A",
    vendor: "Vendor A",
    equipment_type: "Industrial Chiller",
    model: "Model A",
    power_draw_kw: 1150,
    cooling_capacity_kw: 3400,
    water_evaporation_gpm: 380,
    floor_load_kg_m2: 1400,
    carbon_intensity_kgco2e: 800000,
    delivery_weeks: 15,
    has_safety_cert: true,
    upfront_cost_cr: 4.2,
    tco2_cr: 6.0,
    vendor_history: { late_deliveries: 1, total_deliveries: 6, disputes: 0 },
    recommendation: "RECOMMENDED",
    po_number: "PO-2026-A-0417",
  },
  {
    id: "B",
    vendor: "Vendor B",
    equipment_type: "Industrial Chiller",
    model: "Model B (substituted)",
    power_draw_kw: 1400, // over 1200 -> Building Patrol FAIL
    cooling_capacity_kw: 3450,
    water_evaporation_gpm: 460, // over 400
    floor_load_kg_m2: 1620, // over 1500
    carbon_intensity_kgco2e: 920000, // over 850000 -> Green Patrol FAIL
    delivery_weeks: 18, // over 16
    has_safety_cert: false, // missing safety certificate -> Case Files trigger
    upfront_cost_cr: 3.8, // cheapest upfront
    tco2_cr: 6.8, // most expensive over 5 years
    vendor_history: { late_deliveries: 3, total_deliveries: 5, disputes: 1 },
    recommendation: "REJECT",
    po_number: "PO-2026-B-0418",
  },
  {
    id: "C",
    vendor: "Vendor C",
    equipment_type: "Industrial Chiller",
    model: "Model C",
    power_draw_kw: 1180,
    cooling_capacity_kw: 3480,
    water_evaporation_gpm: 395,
    floor_load_kg_m2: 1480,
    carbon_intensity_kgco2e: 830000,
    delivery_weeks: 16,
    has_safety_cert: true,
    upfront_cost_cr: 4.5,
    tco2_cr: 6.0,
    vendor_history: { late_deliveries: 2, total_deliveries: 6, disputes: 0 },
    recommendation: "ACCEPTABLE",
    po_number: "PO-2026-C-0419",
  },
];

export const getBid = (id: string): Bid | undefined =>
  BIDS.find((b) => b.id.toLowerCase() === id.toLowerCase());

// EPD carbon lookup (mock) — Green Patrol falls back to this when a bid omits a
// carbon value. Keyed by model.
export interface EpdRow {
  carbon_intensity_kgco2e: number;
  water_usage_l_cycle: number;
}

export const EPD_TABLE: Record<string, EpdRow> = {
  "Model A": { carbon_intensity_kgco2e: 800000, water_usage_l_cycle: 1200 },
  "Model B (substituted)": { carbon_intensity_kgco2e: 920000, water_usage_l_cycle: 1650 },
  "Model C": { carbon_intensity_kgco2e: 830000, water_usage_l_cycle: 1300 },
};

// Vendor history docs (mock RAG corpus) — what the Vice Squad "retrieves".
export const VENDOR_DOCS: Record<string, string[]> = {
  A: [
    "Delivery log FY24: 5 of 6 POs delivered on or before ROJ.",
    "Compliance file: OSHA-style safety certificate on record, valid through 2027.",
    "No open disputes. Escrow record clean.",
  ],
  B: [
    "Delay notice PO-2023-B-0091: chiller delivered 4 weeks past ROJ.",
    "Delay notice PO-2023-B-0112: substituted compressor unit, 3 weeks late.",
    "Delay notice PO-2024-B-0203: shipment held at port, 2 weeks late.",
    "Dispute record: contested penalty clause on PO-2024-B-0203, unresolved.",
    "Compliance file: OSHA-style Safety Certificate NOT ON RECORD — flagged missing.",
  ],
  C: [
    "Delivery log FY24: 4 of 6 POs on time, 2 minor delays under 1 week.",
    "Compliance file: safety certificate valid through 2026.",
    "No open disputes.",
  ],
};

// Extraction confidence per field (mock document-intelligence output). One
// Vendor B field is deliberately low to demo the human-in-the-loop path.
export const FIELD_CONFIDENCE: Record<string, Record<string, number>> = {
  A: {
    power_draw_kw: 0.98,
    cooling_capacity_kw: 0.97,
    water_evaporation_gpm: 0.95,
    floor_load_kg_m2: 0.94,
    carbon_intensity_kgco2e: 0.92,
    delivery_weeks: 0.99,
    has_safety_cert: 0.99,
  },
  B: {
    power_draw_kw: 0.72, // handwritten annotation on the spec sheet -> low confidence
    cooling_capacity_kw: 0.96,
    water_evaporation_gpm: 0.9,
    floor_load_kg_m2: 0.93,
    carbon_intensity_kgco2e: 0.88,
    delivery_weeks: 0.97,
    has_safety_cert: 0.99,
  },
  C: {
    power_draw_kw: 0.97,
    cooling_capacity_kw: 0.96,
    water_evaporation_gpm: 0.95,
    floor_load_kg_m2: 0.94,
    carbon_intensity_kgco2e: 0.93,
    delivery_weeks: 0.98,
    has_safety_cert: 0.99,
  },
};

// CAD footprint dimensions the VLM "reads" off the drawing (mock).
export const CAD_DIMS: Record<string, { footprint_m: string; weight_kg_m2: number }> = {
  A: { footprint_m: "3.2 × 2.1", weight_kg_m2: 1400 },
  B: { footprint_m: "3.6 × 2.4", weight_kg_m2: 1620 },
  C: { footprint_m: "3.3 × 2.2", weight_kg_m2: 1480 },
};
