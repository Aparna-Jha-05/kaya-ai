"use client";

import { useState } from "react";
import { Bid } from "@/lib/mockData";
import Card, { CardHeader } from "@/components/ui/Card";
import MockBadge from "@/components/ui/MockBadge";
import RFIModal from "@/components/rfi-modal";
import { appendAudit } from "@/lib/audit";
import { COLORS } from "@/lib/constants";
import { CheckCircle2, Mail, PencilLine } from "lucide-react";

const MISSING_DOC = "OSHA-style Safety Certificate";

export default function CaseFile({ bid }: { bid: Bid }) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [queued, setQueued] = useState(false);

  if (bid.has_safety_cert) return null;

  function onQueued() {
    setQueued(true);
    appendAudit({
      bid: bid.vendor,
      patrol: "RFI draft",
      action: "DRAFT APPROVED AND QUEUED",
      rule: `missing_doc = "${MISSING_DOC}"`,
      evidence: `PO ${bid.po_number}`,
    });
  }

  return (
    <>
      <Card accent={COLORS.violet}>
        <CardHeader
          title={<span className="flex items-center gap-2"><Mail className="h-4 w-4 text-violet" /> Reviewer action</span>}
          caption="A required safety certificate is missing. A reviewer must confirm the draft before it enters the procurement workflow."
          right={<MockBadge />}
        />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-text">Request the missing certificate</p>
            <p className="mt-1 text-xs text-text/55">The draft includes the cited bid findings and can be edited before approval.</p>
          </div>
          {queued ? (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan"><CheckCircle2 className="h-4 w-4" /> Draft queued</span>
          ) : (
            <button type="button" onClick={() => setIsEditorOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet/20 px-4 py-2 text-sm font-semibold text-violet transition-colors hover:bg-violet/30"><PencilLine className="h-4 w-4" /> Review draft</button>
          )}
        </div>
      </Card>
      <RFIModal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} vendorName={bid.vendor} onHandoffSuccess={onQueued} />
    </>
  );
}
