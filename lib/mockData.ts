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

export function createFallbackBidRecord(filename?: string, customVendor?: string) {
  const name = (filename || customVendor || "Uploaded Bid").replace(/\.pdf$/i, "").replaceAll("_", " ");
  const isB = name.toLowerCase().includes("b") || name.toLowerCase().includes("cooltech");
  const isC = name.toLowerCase().includes("c") || name.toLowerCase().includes("carrier");
  const vendorName = customVendor || (isB ? "Vendor B (CoolTech)" : isC ? "Vendor C (Carrier)" : name.toLowerCase().includes("vendor") ? name : `Vendor (${name})`);
  const id = `uploaded-${Date.now()}`;

  return {
    id,
    filename: filename || `${vendorName.replaceAll(" ", "_")}.pdf`,
    submitted_at: new Date().toISOString(),
    source_document: {
      project_id: "PRJ-POLICE-01",
      storage_reference: `bids/${id}.pdf`,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      original_filename: filename || `${vendorName.replaceAll(" ", "_")}.pdf`,
      media_type: "application/pdf",
      byte_length: 245820,
      uploader_identity: "DEMO_OFFICER",
      ingestion_time: new Date().toISOString(),
      integrity_signals: [],
    },
    assessment_version: 1,
    assessment_history: [],
    source: {
      vendor_name: vendorName,
      bid_amount_inr: isB ? 38_000_000 : isC ? 45_000_000 : 42_000_000,
      promised_delivery_weeks: isB ? 18 : isC ? 16 : 15,
      has_osha_cert: isB ? false : true,
      extracted_clauses: [
        "Warranty: 5 years full coverage on compressor and heat exchanger.",
        "Limitation of Liability: Liability capped at contract value.",
        "Payment Terms: 30 days net upon milestone completion.",
      ],
      document_metadata: {
        author: "Procurement Officer",
        creation_date: new Date().toISOString(),
        modification_date: new Date().toISOString(),
        creator_tool: "PO-LICE Client Extractor",
        producer: "PyMuPDF / PO-LICE",
        is_encrypted: false,
        parser_warnings: [],
        review_signals: isB ? ["SAFETY_CERTIFICATE_MISSING", "POWER_DRAW_OVER_LIMIT"] : [],
      },
      extraction_report: {
        candidates: [
          {
            field: "power_draw_kw",
            raw_value: isB ? "1400 kW" : "1150 kW",
            normalized_value: isB ? 1400 : 1150,
            unit: "kW",
            source_excerpt: "Power Draw: 1,150 kW",
            page: 1,
            bbox: [100, 200, 300, 220] as [number, number, number, number],
            page_width: 612,
            page_height: 792,
            page_rotation: 0,
            coordinate_system: "PDF_POINTS",
            accepted: true,
          },
        ],
        dimension_annotations: [
          {
            field: "dimensions",
            normalized_value: 4.2,
            unit: "m",
            source_excerpt: "Length: 4.2m, Width: 2.1m, Height: 2.2m",
            page: 2,
            bbox: [100, 300, 400, 320] as [number, number, number, number],
            page_width: 612,
            page_height: 792,
            page_rotation: 0,
            coordinate_system: "PDF_POINTS",
            interpretation_status: "VERIFIED",
          },
        ],
        issues: [],
      },
      equipment: {
        equipment_type: "Industrial Chiller",
        manufacturer: vendorName,
        model_number: isB ? "Model B (substituted)" : isC ? "Model C" : "Model A",
        power_draw_kw: isB ? 1400 : isC ? 1180 : 1150,
        cooling_capacity_kw: isB ? 3450 : isC ? 3480 : 3400,
        water_evap_gpm: isB ? 460 : isC ? 395 : 380,
        floor_load_kg: isB ? 1620 : isC ? 1480 : 1400,
        length_m: 4.2,
        width_m: isB ? 2.1 : 1.8,
        height_m: 2.2,
        embodied_carbon_factor: isB ? 920000 : isC ? 830000 : 800000,
      },
    },
    scorecard: {
      calculated_tco2_inr: isB ? 68_000_000 : 60_000_000,
      recommendation: (isB ? "REJECT" : isC ? "REVIEW_REQUIRED" : "RECOMMENDED") as "REJECT" | "REVIEW_REQUIRED" | "RECOMMENDED",
      patrol_results: [
        {
          patrol_name: "BUILDING_PATROL",
          status: (isB ? "FAIL" : "PASS") as "FAIL" | "PASS",
          risk_score: null,
          reason: isB ? "Power draw exceeds substation limit (1,400 kW > 1,200 kW)." : "Extracted dimensions and contractual warranty within constraint envelope.",
          rule_broken: isB ? "CONSTRAINT_ENVELOPE_BREACH" : null,
          evidence: { power_draw_kw: isB ? 1400 : 1150, limit_kw: 1200 },
        },
        {
          patrol_name: "GREEN_PATROL",
          status: (isB ? "FAIL" : "PASS") as "FAIL" | "PASS",
          risk_score: null,
          reason: isB ? "Embodied carbon exceeds project cap (920,000 kgCO2e > 850,000 kgCO2e)." : "Carbon evidence within configured budget.",
          rule_broken: isB ? "LEED_CARBON_FACTOR_BREACH" : null,
          evidence: { embodied_carbon_factor: isB ? 920000 : 800000, cap: 850000 },
        },
        {
          patrol_name: "VICE_SQUAD",
          status: (isB ? "FLAG" : "PASS") as "FLAG" | "PASS",
          risk_score: isB ? 8 : 3,
          reason: isB ? "Agreement Compliance Index: 65/100. Safety certificate is missing." : "No deterministic integrity correlation found.",
          rule_broken: isB ? "AGREEMENT_OR_INTEGRITY_REVIEW" : null,
          evidence: { agreement_compliance_index: isB ? 65 : 95 },
        },
        {
          patrol_name: "TRAFFIC_CONTROL",
          status: (isB ? "FLAG" : "PASS") as "FLAG" | "PASS",
          risk_score: null,
          reason: isB ? "Float-aware schedule exposure is 14 days." : "Delivery commitment within milestone limits.",
          rule_broken: isB ? "DYNAMIC_REVALIDATION_TRIGGER" : null,
          evidence: { delay_days: isB ? 14 : 0 },
        },
      ],
    },
  };
}
