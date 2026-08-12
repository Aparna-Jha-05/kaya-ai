export type CheckStatus = "PASS" | "FAIL" | "FLAG";
export type ReviewAction = "REVIEWED_DO_NOT_SELECT" | "REVIEWED_READY_FOR_DECISION";

export type BidRecord = {
  id: string;
  filename: string;
  submitted_at: string;
  officer_decision: "UNDECIDED" | "AWARDED" | "REJECTED" | "RFI_PENDING";
  version: number;
  source_document: {
    project_id: string;
    storage_reference: string;
    sha256: string;
    original_filename: string;
    media_type: string;
    byte_length: number;
    uploader_identity: string;
    ingestion_time: string;
    integrity_signals: string[];
  };
  source: {
    vendor_name: string;
    bid_amount_inr: number | null;
    promised_delivery_weeks: number | null;
    has_osha_cert: boolean | null;
    extracted_clauses: string[];
    document_metadata: {
      author: string | null;
      creation_date: string | null;
      modification_date: string | null;
      creator_tool: string | null;
      producer: string | null;
      is_encrypted: boolean;
      parser_warnings: string[];
      review_signals: string[];
    };
    extraction_report: {
      candidates: Array<{
        field: string;
        raw_value: string;
        normalized_value: string | number | boolean;
        unit: string | null;
        source_excerpt: string;
        page: number | null;
        bbox: [number, number, number, number] | null;
        page_width: number | null;
        page_height: number | null;
        page_rotation: number | null;
        coordinate_system: string | null;
        accepted: boolean;
        confidence: number;
      }>;
      dimension_annotations: Array<{
        field: string;
        normalized_value: number;
        unit: string;
        source_excerpt: string;
        page: number;
        bbox: [number, number, number, number];
        page_width: number;
        page_height: number;
        page_rotation: number;
        coordinate_system: string;
        interpretation_status: string;
      }>;
      issues: Array<{ code: string; message: string; field: string | null }>;
    };
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
  assessment_version: number;
  assessment_history: Array<{
    version: number;
    constraint_version: number;
    scorecard: BidRecord["scorecard"];
    created_at: string;
    trigger: string;
  }>;
};

export type ActivityEvent = { id: string; bid_id: string; timestamp: string; check_name: string; action: string; rule: string; evidence: string };
export type SimulationResponse = { adjusted_capex_inr: number; delay_penalty_inr: number; calculated_tco2_inr: number; recommendation: "REJECT" | "REVIEW_REQUIRED" | "RECOMMENDED"; lifecycle_mode: "PRE_AWARD" | "POST_AWARD" };

export type SupplierProfile = { vendor_id: string; name: string; lat: number; lng: number; distance_km: number; risk_score: number; disputes: number };
export type AuditLogEntry = { id: string; actor: string; action: string; target_id: string; details: Record<string, unknown>; timestamp: string };
export type SiteConstraintRecord = {
  id: string;
  project_id: string;
  version: number;
  is_current: boolean;
  max_substation_kw: number;
  max_door_width_m: number;
  max_embodied_carbon_kg: number;
  max_water_evap_gpm: number | null;
  max_floor_load_kg_m2: number | null;
  actor: string;
  reason: string;
  created_at: string;
};

export type RFIDraftResponse = {
  rfi_id: string;
  bid_id: string;
  vendor_name: string;
  status: "DRAFT" | "APPROVED";
  human_reviewed: boolean;
  rfi_text: string;
  protected_facts: Record<string, unknown>;
  created_at: string;
};

const base = process.env.NEXT_PUBLIC_PO_LICE_API_URL ?? "";
const BIDS_CACHE_KEY = "po_lice_bids_cache_v1";

function getLocalBidsCache(): BidRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BIDS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as BidRecord[]) : null;
  } catch {
    return null;
  }
}

function setLocalBidsCache(bids: BidRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BIDS_CACHE_KEY, JSON.stringify(bids));
  } catch {
    // Ignore storage quota errors
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("po-lice:connection-error"));
      }
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? body?.detail ?? "Request failed.");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("po-lice:connection-success"));
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeoutId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("po-lice:connection-error"));
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out while waiting for server response. Please try again.");
    }
    throw err;
  }
}

let inflightBidsList: Promise<BidRecord[]> | null = null;
let memoryBidsCache: BidRecord[] | null = null;

function invalidateCache() {
  inflightBidsList = null;
  memoryBidsCache = null;
}

export const procurementApi = {
  upload(file: File, idempotencyKey = globalThis.crypto.randomUUID()) {
    invalidateCache();
    const body = new FormData();
    body.append("file", file);
    return request<BidRecord>(
      "/api/v1/bids/upload",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      },
      60000
    ).then((res) => {
      procurementApi.list();
      return res;
    });
  },
  list: (): Promise<BidRecord[]> => {
    const cached = memoryBidsCache ?? getLocalBidsCache();
    if (cached && cached.length > 0) {
      memoryBidsCache = cached;
      if (!inflightBidsList) {
        const cachedSnapshot = cached;
        inflightBidsList = request<BidRecord[]>("/api/v1/bids")
          .then((fresh) => {
            memoryBidsCache = fresh;
            setLocalBidsCache(fresh);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("po-lice:bids-updated", { detail: fresh }));
            }
            return fresh;
          })
          .catch(() => cachedSnapshot)
          .finally(() => {
            setTimeout(() => {
              inflightBidsList = null;
            }, 1000);
          });
      }
      return Promise.resolve(cached);
    }

    if (inflightBidsList) return inflightBidsList;
    const fallback = cached;
    inflightBidsList = request<BidRecord[]>("/api/v1/bids")
      .then((data) => {
        memoryBidsCache = data;
        setLocalBidsCache(data);
        return data;
      })
      .catch((err) => {
        if (fallback && fallback.length > 0) return fallback;
        throw err;
      })
      .finally(() => {
        setTimeout(() => {
          inflightBidsList = null;
        }, 1000);
      });
    return inflightBidsList;
  },
  get: (id: string) => request<BidRecord>(`/api/v1/bids/${id}`),
  activity: (id?: string) => request<ActivityEvent[]>(`/api/v1/activity${id ? `?bid_id=${encodeURIComponent(id)}` : ""}`),
  action: (id: string, action: ReviewAction, note: string) => {
    invalidateCache();
    return request<ActivityEvent>(`/api/v1/bids/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    }).then((res) => {
      procurementApi.list();
      return res;
    });
  },
  remove: (id: string) => {
    invalidateCache();
    return request<void>(`/api/v1/bids/${id}`, { method: "DELETE" }).then((res) => {
      procurementApi.list();
      return res;
    });
  },
  simulate: (input: { base_capex_inr: number; discount_percent: number; delay_days: number; opex_carbon_5yr_inr?: number; lifecycle_mode?: "PRE_AWARD" | "POST_AWARD" }) => request<SimulationResponse>("/api/v1/bids/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_capex_inr: input.base_capex_inr,
      discount_percent: input.discount_percent,
      delay_days: input.delay_days,
      opex_carbon_5yr_inr: input.opex_carbon_5yr_inr ?? 27_600_000,
      lifecycle_mode: input.lifecycle_mode ?? "PRE_AWARD",
    }),
  }),
  sourceUrl: (id: string) => `${base}/api/v1/bids/${id}/source`,

  overrideBidFields: (bid_id: string, overrides: Record<string, any>) => {
    invalidateCache();
    return request<BidRecord>(`/api/v1/bids/${bid_id}/override`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrides),
    }).then((res) => {
      procurementApi.list();
      return res;
    });
  },

  rfiDraft: (bid_id: string) => request<RFIDraftResponse>("/api/v1/agent/rfi-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bid_id }) }),
  approveRfi: (rfi_id: string, edited_text: string) => request<RFIDraftResponse>(`/api/v1/rfis/${rfi_id}/approve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edited_text, note: "Approved after human review" }) }),
  updateOfficerDecision: (bid_id: string, decision: BidRecord["officer_decision"], expected_version: number, reason: string) => {
    invalidateCache();
    return request<BidRecord>(`/api/v1/bids/${bid_id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, expected_version, reason }) }).then((res) => {
      procurementApi.list();
      return res;
    });
  },
  updateConstraints: (
    expected_version: number,
    max_substation_kw: number,
    max_door_width_m: number,
    max_embodied_carbon_kg: number,
    max_water_evap_gpm?: number | null,
    max_floor_load_kg_m2?: number | null,
  ) => {
    invalidateCache();
    return request<{ status: string; new_version: number; constraints: Partial<SiteConstraintRecord> }>("/api/v1/site-constraints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expected_version, max_substation_kw, max_door_width_m, max_embodied_carbon_kg, max_water_evap_gpm, max_floor_load_kg_m2 }),
    }).then((res) => {
      procurementApi.list();
      return res;
    });
  },
  siteConstraints: () => request<SiteConstraintRecord>("/api/v1/site-constraints"),
  listRfis: (bid_id?: string) => request<RFIDraftResponse[]>(`/api/v1/rfis${bid_id ? `?bid_id=${encodeURIComponent(bid_id)}` : ""}`),
  suppliers: () => request<SupplierProfile[]>("/api/v1/suppliers"),
  auditLogs: () => request<AuditLogEntry[]>("/api/v1/audit/logs"),
  readiness: () => request<{ status: string; demo_mode: boolean; persistence: "sqlite" | "unavailable"; postgresql: { status: string; connected: boolean } }>("/api/v1/readiness"),
};
