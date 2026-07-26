import { createFallbackBidRecord } from "@/lib/mockData";

export type CheckStatus = "PASS" | "FAIL" | "FLAG";
export type ReviewAction = "RFI_DRAFT_APPROVED" | "REVIEWED_DO_NOT_SELECT" | "REVIEWED_READY_FOR_DECISION";

export type BidRecord = {
  id: string;
  filename: string;
  submitted_at: string;
  source: {
    vendor_name: string;
    bid_amount_inr: number | null;
    promised_delivery_weeks: number | null;
    has_osha_cert: boolean | null;
    extracted_clauses: string[];
    document_metadata: { author: string | null; creation_date: string | null; creator_tool: string | null };
    equipment: {
      equipment_type: string;
      manufacturer: string;
      model_number: string;
      power_draw_kw: number | null;
      cooling_capacity_kw: number | null;
      water_evap_gpm: number | null;
      floor_load_kg: number | null;
      length_m: number | null;
      width_m: number | null;
      height_m: number | null;
      embodied_carbon_factor: number | null;
    };
  };
  scorecard: {
    calculated_tco2_inr: number | null;
    recommendation: "REJECT" | "REVIEW_REQUIRED" | "RECOMMENDED";
    patrol_results: Array<{
      patrol_name: string;
      status: CheckStatus;
      risk_score: number | null;
      reason: string;
      rule_broken: string | null;
      evidence: Record<string, unknown> | null;
    }>;
  };
};
export type ActivityEvent = { id: string; bid_id: string; timestamp: string; check_name: string; action: string; rule: string; evidence: string };
export type SimulationResponse = { adjusted_capex_inr: number; delay_penalty_inr: number; calculated_tco2_inr: number; recommendation: "REJECT" | "REVIEW_REQUIRED" | "RECOMMENDED"; lifecycle_mode: "PRE_AWARD" | "POST_AWARD" };
const base = process.env.NEXT_PUBLIC_PO_LICE_API_URL ?? "http://localhost:8000";
async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(`${base}${path}`, init); if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail ?? "Request failed."); } if (response.status === 204) return undefined as T; return response.json() as Promise<T>; }
export const procurementApi = {
  async upload(file: File): Promise<BidRecord> {
    try {
      const body = new FormData();
      body.append("file", file);
      const record = await request<BidRecord>("/api/v1/bids/upload", { method: "POST", body });
      if (typeof window !== "undefined" && record?.id) {
        try { sessionStorage.setItem(`po-lice-upload-${record.id}`, JSON.stringify(record)); } catch {}
      }
      return record;
    } catch {
      const record = createFallbackBidRecord(file.name);
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem(`po-lice-upload-${record.id}`, JSON.stringify(record)); } catch {}
      }
      return record;
    }
  },
  async list(): Promise<BidRecord[]> {
    try {
      const liveItems = await request<BidRecord[]>("/api/v1/bids");
      if (typeof window !== "undefined") {
        const offlineKeys = Object.keys(sessionStorage).filter((k) => k.startsWith("po-lice-upload-"));
        const offlineItems = offlineKeys.map((k) => {
          try { return JSON.parse(sessionStorage.getItem(k)!) as BidRecord; } catch { return null; }
        }).filter((item): item is BidRecord => item !== null);
        const liveIds = new Set(liveItems.map((b) => b.id));
        const newOffline = offlineItems.filter((item) => !liveIds.has(item.id));
        return [...liveItems, ...newOffline];
      }
      return liveItems;
    } catch {
      if (typeof window !== "undefined") {
        const offlineKeys = Object.keys(sessionStorage).filter((k) => k.startsWith("po-lice-upload-"));
        const offlineItems = offlineKeys.map((k) => {
          try { return JSON.parse(sessionStorage.getItem(k)!) as BidRecord; } catch { return null; }
        }).filter((item): item is BidRecord => item !== null);
        if (offlineItems.length > 0) return offlineItems;
      }
      return [];
    }
  },
  async get(id: string): Promise<BidRecord> {
    try {
      return await request<BidRecord>(`/api/v1/bids/${id}`);
    } catch (err) {
      if (typeof window !== "undefined") {
        try {
          const cached = sessionStorage.getItem(`po-lice-upload-${id}`);
          if (cached) return JSON.parse(cached) as BidRecord;
        } catch {}
      }
      throw err;
    }
  },
  async activity(id?: string): Promise<ActivityEvent[]> {
    try {
      return await request<ActivityEvent[]>(`/api/v1/activity${id ? `?bid_id=${encodeURIComponent(id)}` : ""}`);
    } catch {
      return [];
    }
  },
  async action(id: string, action: ReviewAction, note: string): Promise<ActivityEvent> {
    try {
      return await request<ActivityEvent>(`/api/v1/bids/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
    } catch {
      return {
        id: `act-${Date.now()}`,
        bid_id: id,
        timestamp: new Date().toISOString(),
        check_name: "REVIEWER_ACTION",
        action,
        rule: "HUMAN_REVIEWER_OVERRIDE",
        evidence: note,
      };
    }
  },
  async remove(id: string): Promise<void> {
    try {
      await request<void>(`/api/v1/bids/${id}`, { method: "DELETE" });
    } catch {
      if (typeof window !== "undefined") {
        try { sessionStorage.removeItem(`po-lice-upload-${id}`); } catch {}
      }
    }
  },
  async simulate(input: { base_capex_inr: number; discount_percent: number; delay_days: number }): Promise<SimulationResponse> {
    try {
      return await request<SimulationResponse>("/api/v1/bids/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, opex_carbon_5yr_inr: 27_600_000, lifecycle_mode: "PRE_AWARD" }),
      });
    } catch {
      const capex = input.base_capex_inr * (1 - input.discount_percent / 100);
      const penalty = input.delay_days * 200_000;
      const tco2 = capex + penalty + 27_600_000;
      const recommendation = input.delay_days > 5 || tco2 > 61_000_000 ? "REJECT" : "RECOMMENDED";
      return {
        adjusted_capex_inr: capex,
        delay_penalty_inr: penalty,
        calculated_tco2_inr: tco2,
        recommendation,
        lifecycle_mode: "PRE_AWARD",
      };
    }
  },
  sourceUrl: (id: string) => `${base}/api/v1/bids/${id}/source`,
};
