import type { Bid } from "@/lib/mockData";

export type IntegritySignal = {
  aci: number;
  status: "CLEAR" | "FLAG";
  summary: string;
  metadata: Array<{ label: string; value: string }>;
};

// Demo-only metadata. The score is deterministic: missing certificate (+40)
// and a shared submission fingerprint (+25) require reviewer attention.
const SUBMISSION_FINGERPRINTS: Record<string, { submissionIp?: string; bankHash?: string; matches?: string }> = {
  A: {},
  B: { submissionIp: "192.0.2.41", bankHash: "sha256:9f2c…7a1e", matches: "Vendor C" },
  C: { submissionIp: "192.0.2.41", bankHash: "sha256:9f2c…7a1e", matches: "Vendor B" },
};

export function integritySignal(bid: Bid): IntegritySignal {
  const fingerprint = SUBMISSION_FINGERPRINTS[bid.id] ?? {};
  const certificatePenalty = bid.has_safety_cert ? 0 : 40;
  const correlationPenalty = fingerprint.matches ? 25 : 0;
  const aci = certificatePenalty + correlationPenalty;
  const status = aci > 0 ? "FLAG" : "CLEAR";
  const metadata = fingerprint.matches
    ? [
        { label: "Submission IP", value: `${fingerprint.submissionIp} · matches ${fingerprint.matches}` },
        { label: "Bank fingerprint", value: `${fingerprint.bankHash} · matches ${fingerprint.matches}` },
        { label: "Required action", value: "Human integrity review" },
      ]
    : [{ label: "Submission fingerprint", value: "No deterministic correlation recorded" }];

  return {
    aci,
    status,
    summary: status === "FLAG" ? `Shared submission fingerprint matches ${fingerprint.matches}.` : "No deterministic integrity correlation recorded.",
    metadata,
  };
}

export function marketSignal(bid: Bid) {
  const deviationByBid: Record<string, number> = { A: 3, B: -22, C: 1 };
  const deviation = deviationByBid[bid.id] ?? 0;
  const anomaly = deviation <= -20;
  return {
    deviation,
    anomaly,
    label: `LME steel baseline: ${deviation > 0 ? "+" : ""}${deviation}%${anomaly ? " · anomaly" : ""}`,
  };
}
