export type CheckStatus = "PASS" | "FAIL" | "FLAG";

export interface ComplianceCheck {
  patrol_name: string;
  status: CheckStatus;
  risk_score?: number | null;
  reason: string;
  rule_broken?: string | null;
  evidence?: Record<string, unknown> | null;
}

export interface LiveBid {
  id: string;
  filename: string;
  submitted_at: string;
  is_sample?: boolean;
  source: {
    vendor_name: string;
    bid_amount_inr?: number | null;
    promised_delivery_weeks?: number | null;
    has_osha_cert?: boolean | null;
    equipment: {
      equipment_type: string;
      manufacturer: string;
      model_number: string;
      power_draw_kw?: number | null;
      cooling_capacity_kw?: number | null;
      width_m?: number | null;
      embodied_carbon_factor?: number | null;
    };
    extracted_clauses: string[];
    document_metadata: { author?: string | null; creation_date?: string | null; creator_tool?: string | null };
  };
  scorecard: {
    patrol_results: ComplianceCheck[];
    calculated_tco2_inr?: number | null;
    recommendation: "REJECT" | "REVIEW_REQUIRED" | "RECOMMENDED";
  };
}

export interface ActivityEvent {
  id: string;
  bid_id: string;
  timestamp: string;
  check_name: string;
  action: string;
  rule: string;
  evidence: string;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || "The request could not be completed.");
  }
  return response.json() as Promise<T>;
}

export const liveApi = {
  listBids: () => api<LiveBid[]>("/api/v1/bids"),
  bid: (id: string) => api<LiveBid>(`/api/v1/bids/${id}`),
  activity: (bidId?: string) => api<ActivityEvent[]>(`/api/v1/activity${bidId ? `?bid_id=${encodeURIComponent(bidId)}` : ""}`),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<LiveBid>("/api/v1/bids/upload", { method: "POST", body: form });
  },
  action: (bidId: string, action: "RFI_DRAFT_APPROVED" | "REVIEWED_DO_NOT_SELECT" | "REVIEWED_READY_FOR_DECISION", note: string) => api<ActivityEvent>(`/api/v1/bids/${bidId}/actions`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note }),
  }),
  sourceUrl: (bidId: string) => `${API_BASE_URL}/api/v1/bids/${bidId}/source`,
};

export function checkFor(bid: LiveBid, name: string) {
  return bid.scorecard.patrol_results.find((check) => check.patrol_name === name);
}

export function reviewLabel(recommendation: LiveBid["scorecard"]["recommendation"]) {
  return recommendation === "REJECT" ? "Do not select" : recommendation === "RECOMMENDED" ? "Ready for decision" : "Needs review";
}

export function money(value?: number | null) {
  return value == null ? "Not extracted" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
