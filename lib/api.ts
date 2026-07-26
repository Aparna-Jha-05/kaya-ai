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

export type SupplierProfile = { vendor_id: string; name: string; lat: number; lng: number; distance_km: number; risk_score: number; disputes: number };
export type AuditLogEntry = { id: string; actor: string; action: string; target_id: string; details: Record<string, unknown>; timestamp: string };
export type RFIDraftResponse = { rfi_id: string; bid_id: string; vendor_name: string; status: string; human_reviewed: boolean; rfi_text: string };

const base = process.env.NEXT_PUBLIC_PO_LICE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const procurementApi = {
  upload(file: File) {
    const body = new FormData();
    body.append("file", file);
    return request<BidRecord>("/api/v1/bids/upload", { method: "POST", body });
  },
  list: () => request<BidRecord[]>("/api/v1/bids"),
  get: (id: string) => request<BidRecord>(`/api/v1/bids/${id}`),
  activity: (id?: string) => request<ActivityEvent[]>(`/api/v1/activity${id ? `?bid_id=${encodeURIComponent(id)}` : ""}`),
  action: (id: string, action: ReviewAction, note: string) => request<ActivityEvent>(`/api/v1/bids/${id}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note }) }),
  remove: (id: string) => request<void>(`/api/v1/bids/${id}`, { method: "DELETE" }),
  simulate: (input: { base_capex_inr: number; discount_percent: number; delay_days: number }) => request<SimulationResponse>("/api/v1/bids/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, opex_carbon_5yr_inr: 27_600_000, lifecycle_mode: "PRE_AWARD" }) }),
  sourceUrl: (id: string) => `${base}/api/v1/bids/${id}/source`,

  // New API Methods
  rfiDraft: (bid_id: string) => request<RFIDraftResponse>("/api/v1/agent/rfi-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bid_id }) }),
  updateLifecycle: (bid_id: string, lifecycle_mode: string, expected_version = 1) => request<BidRecord>(`/api/v1/bids/${bid_id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lifecycle_mode, expected_version }) }),
  updateConstraints: (max_substation_kw: number, max_door_width_m: number, max_embodied_carbon_kg: number) => request<{ status: string }>("/api/v1/site-constraints", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ max_substation_kw, max_door_width_m, max_embodied_carbon_kg }) }),
  suppliers: () => request<SupplierProfile[]>("/api/v1/suppliers"),
  auditLogs: () => request<AuditLogEntry[]>("/api/v1/audit/logs"),
  readiness: () => request<{ status: string; connected: boolean }>("/api/v1/readiness"),
};
