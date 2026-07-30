import type { ActivityEvent, BidRecord, RFIDraftResponse, SimulationResponse, SupplierProfile, AuditLogEntry } from "./api";
import { createFallbackBidRecord } from "./mockData";

export interface SiteConstraintsState {
  version: number;
  max_substation_kw: number;
  max_door_width_m: number;
  max_embodied_carbon_kg: number;
  project_id: string;
}

// Initial seed bids matching demo fixtures
const initialBids: BidRecord[] = [
  {
    ...createFallbackBidRecord("VendorA_Trane_Chiller_Bid.pdf", "Trane Solutions Pvt Ltd"),
    id: "BID-2026-A01",
    officer_decision: "UNDECIDED",
    version: 1,
  },
  {
    ...createFallbackBidRecord("VendorB_CoolTech_Chiller_Bid.pdf", "CoolTech Global Solutions"),
    id: "BID-2026-B02",
    officer_decision: "UNDECIDED",
    version: 1,
  },
  {
    ...createFallbackBidRecord("VendorC_Carrier_Chiller_Bid.pdf", "Carrier HVAC India Ltd"),
    id: "BID-2026-C03",
    officer_decision: "UNDECIDED",
    version: 1,
  },
];

const initialActivity: ActivityEvent[] = [
  {
    id: "ACT-001",
    bid_id: "BID-2026-A01",
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    check_name: "BUILDING_PATROL",
    action: "PASS",
    rule: "Power draw 1,150 kW <= 1,200 kW limit",
    evidence: "Extracted technical specification sheet",
  },
  {
    id: "ACT-002",
    bid_id: "BID-2026-B02",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    check_name: "BUILDING_PATROL",
    action: "FAIL",
    rule: "Power draw 1,400 kW > 1,200 kW limit",
    evidence: "Spec sheet line item #14",
  },
  {
    id: "ACT-003",
    bid_id: "BID-2026-B02",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    check_name: "VICE_SQUAD",
    action: "FLAG",
    rule: "Safety certificate missing; 3 late deliveries on record",
    evidence: "RAG corpus query output",
  },
];

const initialRfis: RFIDraftResponse[] = [];

let siteConstraints: SiteConstraintsState = {
  version: 1,
  max_substation_kw: 1200,
  max_door_width_m: 2.2,
  max_embodied_carbon_kg: 850000,
  project_id: "PRJ-POLICE-01",
};

// Global in-memory singleton state
const store = globalThis as unknown as {
  __policeBids?: BidRecord[];
  __policeActivity?: ActivityEvent[];
  __policeRfis?: RFIDraftResponse[];
  __policeConstraints?: SiteConstraintsState;
};

if (!store.__policeBids) {
  store.__policeBids = initialBids;
}
if (!store.__policeActivity) {
  store.__policeActivity = initialActivity;
}
if (!store.__policeRfis) {
  store.__policeRfis = initialRfis;
}
if (!store.__policeConstraints) {
  store.__policeConstraints = siteConstraints;
}

export const backendStore = {
  getBids(): BidRecord[] {
    return store.__policeBids!;
  },

  getBid(id: string): BidRecord | undefined {
    return store.__policeBids!.find((b) => b.id.toLowerCase() === id.toLowerCase());
  },

  addBid(filename: string, customVendor?: string): BidRecord {
    const raw = createFallbackBidRecord(filename, customVendor);
    const newBid: BidRecord = {
      ...raw,
      id: `BID-${Date.now().toString(36).toUpperCase()}`,
      officer_decision: "UNDECIDED",
      version: 1,
    };
    store.__policeBids!.unshift(newBid);

    // Record activity event
    const event: ActivityEvent = {
      id: `ACT-${Date.now().toString(36).toUpperCase()}`,
      bid_id: newBid.id,
      timestamp: new Date().toISOString(),
      check_name: "INGESTION_AUDIT",
      action: "BID_UPLOADED",
      rule: "PDF uploaded and analyzed by patrol engine",
      evidence: `File: ${filename}`,
    };
    store.__policeActivity!.unshift(event);

    return newBid;
  },

  removeBid(id: string): boolean {
    const idx = store.__policeBids!.findIndex((b) => b.id.toLowerCase() === id.toLowerCase());
    if (idx !== -1) {
      store.__policeBids!.splice(idx, 1);
      return true;
    }
    return false;
  },

  addActivityAction(bidId: string, action: string, note: string): ActivityEvent {
    const event: ActivityEvent = {
      id: `ACT-${Date.now().toString(36).toUpperCase()}`,
      bid_id: bidId,
      timestamp: new Date().toISOString(),
      check_name: "REVIEWER_ACTION",
      action,
      rule: "Human officer reviewer action",
      evidence: note || "Reviewer action recorded",
    };
    store.__policeActivity!.unshift(event);
    return event;
  },

  getActivity(bidId?: string): ActivityEvent[] {
    if (!bidId) return store.__policeActivity!;
    return store.__policeActivity!.filter((e) => e.bid_id.toLowerCase() === bidId.toLowerCase());
  },

  updateOfficerDecision(bidId: string, decision: BidRecord["officer_decision"], expectedVersion: number, reason: string): BidRecord {
    const bid = this.getBid(bidId);
    if (!bid) throw new Error("Bid not found");
    if (bid.version !== expectedVersion) {
      throw new Error(`Stale version: expected ${expectedVersion}, but bid version is ${bid.version}`);
    }
    bid.officer_decision = decision;
    bid.version += 1;

    this.addActivityAction(bidId, `DECISION_${decision}`, reason || `Officer decision updated to ${decision}`);
    return bid;
  },

  getConstraints(): SiteConstraintsState {
    return store.__policeConstraints!;
  },

  updateConstraints(expectedVersion: number, max_substation_kw: number, max_door_width_m: number, max_embodied_carbon_kg: number): SiteConstraintsState {
    const cur = store.__policeConstraints!;
    if (cur.version !== expectedVersion) {
      throw new Error(`Stale version: expected ${expectedVersion}, current version is ${cur.version}`);
    }
    cur.version += 1;
    cur.max_substation_kw = max_substation_kw;
    cur.max_door_width_m = max_door_width_m;
    cur.max_embodied_carbon_kg = max_embodied_carbon_kg;

    // Dynamic re-evaluation of bids
    for (const bid of store.__policeBids!) {
      const power = bid.source.equipment.power_draw_kw ?? 0;
      const carbon = bid.source.equipment.embodied_carbon_factor ?? 0;

      for (const patrol of bid.scorecard.patrol_results) {
        if (patrol.patrol_name === "BUILDING_PATROL") {
          if (power > max_substation_kw) {
            patrol.status = "FAIL";
            patrol.reason = `Power draw exceeds updated substation limit (${power} kW > ${max_substation_kw} kW).`;
          } else {
            patrol.status = "PASS";
            patrol.reason = `Power draw within updated substation limit (${power} kW <= ${max_substation_kw} kW).`;
          }
        }
        if (patrol.patrol_name === "GREEN_PATROL") {
          if (carbon > max_embodied_carbon_kg) {
            patrol.status = "FAIL";
            patrol.reason = `Embodied carbon exceeds updated budget (${carbon} kgCO2e > ${max_embodied_carbon_kg} kgCO2e).`;
          } else {
            patrol.status = "PASS";
            patrol.reason = `Embodied carbon within updated budget (${carbon} kgCO2e <= ${max_embodied_carbon_kg} kgCO2e).`;
          }
        }
      }
    }

    return cur;
  },

  generateRfiDraft(bidId: string): RFIDraftResponse {
    const bid = this.getBid(bidId);
    if (!bid) throw new Error("Bid not found");

    const failedPatrols = bid.scorecard.patrol_results.filter((p) => p.status === "FAIL" || p.status === "FLAG");
    const issues = failedPatrols.map((p) => `${p.patrol_name}: ${p.reason}`).join("\n");

    const rfi: RFIDraftResponse = {
      rfi_id: `RFI-${Date.now().toString(36).toUpperCase()}`,
      bid_id: bidId,
      vendor_name: bid.source.vendor_name,
      status: "DRAFT",
      human_reviewed: false,
      rfi_text: `Dear ${bid.source.vendor_name},\n\nDuring pre-award compliance auditing for project ${bid.source_document.project_id}, the following compliance concerns were identified:\n\n${issues || "Clarification required on technical specifications."}\n\nPlease submit updated compliance documentation and engineering verification within 5 business days.\n\nSincerely,\nProcurement Compliance Officer`,
      protected_facts: { vendor_name: bid.source.vendor_name, bid_id: bidId },
      created_at: new Date().toISOString(),
    };

    store.__policeRfis!.unshift(rfi);
    return rfi;
  },

  approveRfi(rfiId: string, editedText: string): RFIDraftResponse {
    const rfi = store.__policeRfis!.find((r) => r.rfi_id === rfiId);
    if (!rfi) throw new Error("RFI not found");
    rfi.status = "APPROVED";
    rfi.human_reviewed = true;
    if (editedText) {
      rfi.rfi_text = editedText;
    }
    return rfi;
  },

  listRfis(bidId?: string): RFIDraftResponse[] {
    if (!bidId) return store.__policeRfis!;
    return store.__policeRfis!.filter((r) => r.bid_id === bidId);
  },

  getSuppliers(): SupplierProfile[] {
    return [
      { vendor_id: "VENDOR-COOLTECH", name: "CoolTech Global Solutions", lat: 19.076, lng: 72.8777, distance_km: 14.2, risk_score: 7.5, disputes: 3 },
      { vendor_id: "VENDOR-TRANE", name: "Trane Solutions Pvt Ltd", lat: 18.5204, lng: 73.8567, distance_km: 142.0, risk_score: 1.2, disputes: 0 },
      { vendor_id: "VENDOR-CARRIER", name: "Carrier HVAC India Ltd", lat: 12.9716, lng: 77.5946, distance_km: 840.0, risk_score: 2.1, disputes: 0 },
    ];
  },

  getAuditLogs(): AuditLogEntry[] {
    return store.__policeActivity!.map((e) => ({
      id: e.id,
      actor: "OFFICER",
      action: e.action,
      target_id: e.bid_id,
      details: { note: e.evidence, check: e.check_name, rule: e.rule },
      timestamp: e.timestamp,
    }));
  },

  simulate(input: { base_capex_inr: number; discount_percent: number; delay_days: number }): SimulationResponse {
    const discountFactor = 1 - (input.discount_percent || 0) / 100;
    const adjusted_capex_inr = Math.round(input.base_capex_inr * discountFactor);
    const delay_penalty_inr = Math.round((input.delay_days || 0) * 150_000); // 1.5 Lakh INR per delay day
    const opex_carbon_5yr_inr = 27_600_000;
    const calculated_tco2_inr = adjusted_capex_inr + delay_penalty_inr + opex_carbon_5yr_inr;

    let recommendation: "REJECT" | "REVIEW_REQUIRED" | "RECOMMENDED" = "RECOMMENDED";
    if (calculated_tco2_inr > 65_000_000 || input.delay_days > 14) {
      recommendation = "REJECT";
    } else if (input.delay_days > 7 || input.discount_percent < 0) {
      recommendation = "REVIEW_REQUIRED";
    }

    return {
      adjusted_capex_inr,
      delay_penalty_inr,
      calculated_tco2_inr,
      recommendation,
      lifecycle_mode: "PRE_AWARD",
    };
  },
};
