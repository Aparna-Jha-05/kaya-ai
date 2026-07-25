"use client";
import { useState } from "react";
import { Bid, SITE } from "@/lib/mockData";
import Card, { CardHeader } from "@/components/ui/Card";
import MockBadge from "@/components/ui/MockBadge";
import { appendAudit } from "@/lib/audit";
import { COLORS } from "@/lib/constants";
import { Mail, Check, Bot, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Deadline = required-on-job date minus 2 weeks. ROJ approximated from the
// max delivery window for the demo.
function deadlineStr() {
  const d = new Date("2026-07-10");
  d.setDate(d.getDate() + (SITE.max_delivery_weeks - 2) * 7);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const MISSING_DOC = "OSHA-style Safety Certificate";

function draftEmail(bid: Bid) {
  return `To: procurement@${bid.vendor.toLowerCase().replace(/\s+/g, "")}.com
Subject: Action required — missing ${MISSING_DOC} for ${bid.po_number}

Dear ${bid.vendor},

During automated compliance review of your bid for the IIT Smart Campus
Phase 1 chilled-water plant (PO ${bid.po_number}), PO-lice found no valid
${MISSING_DOC} on record for the proposed ${bid.model}.

This document is mandatory before award. Please submit a current, valid
certificate no later than ${deadlineStr()}. Until received, this bid is
held at compliance stage and cannot proceed to evaluation.

Regards,
Amber Procurement (automated) — reviewed by a human before send`;
}

export default function CaseFile({ bid }: { bid: Bid }) {
  const [approved, setApproved] = useState(false);
  const [handed, setHanded] = useState(false);
  const [toast, setToast] = useState(false);

  if (bid.has_safety_cert) return null;

  const approve = () => {
    setApproved(true);
    appendAudit({
      bid: bid.vendor,
      patrol: "RFI draft",
      action: "EMAIL DRAFTED & APPROVED",
      rule: `missing_doc = "${MISSING_DOC}"`,
      evidence: `PO ${bid.po_number} · deadline ${deadlineStr()}`,
    });
  };

  const queueWorkflow = () => {
    setHanded(true);
    setToast(true);
    appendAudit({
      bid: bid.vendor,
      patrol: "Workflow handoff",
      action: "QUEUED FOR WORKFLOW (demo)",
      rule: "Reviewer-approved RFI",
      evidence: `dispatch email re: ${MISSING_DOC}`,
    });
    setTimeout(() => setToast(false), 4000);
  };

  return (
    <Card accent={COLORS.violet}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-violet" /> RFI draft
          </span>
        }
        caption="The submitted safety certificate is missing. Review and approve the draft before it enters the workflow."
        right={<MockBadge label="AGENT" />}
      />
      <div className="p-4">
        <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-[#071510] p-4 font-mono text-[12px] leading-relaxed text-text/85">
          {draftEmail(bid)}
        </pre>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={approve}
            disabled={approved}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              approved
                ? "cursor-default bg-green/15 text-green"
                : "bg-violet/20 text-violet hover:bg-violet/30"
            }`}
          >
            {approved ? <Check className="h-4 w-4" /> : null}
            {approved ? "Draft approved" : "Approve draft"}
          </button>

          <button
            onClick={queueWorkflow}
            disabled={!approved || handed}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !approved
                ? "cursor-not-allowed bg-white/5 text-text/25"
                : handed
                ? "cursor-default bg-green/15 text-green"
                : "bg-blue/20 text-blue hover:bg-blue/30"
            }`}
          >
            <Bot className="h-4 w-4" />
            {handed ? "Queued for workflow" : "Queue for workflow"}
          </button>

          <span className="text-xs text-text/40">No message is sent in this demo.</span>
        </div>
      </div>

      {/* Mocked success toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-green/30 bg-[#0a1a13] px-4 py-3 shadow-2xl"
          >
            <CheckCircle2 className="h-5 w-5 text-green" />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-text">
                Workflow item queued <MockBadge />
              </div>
              <div className="text-xs text-text/50">
                Email queued for dispatch to {bid.vendor}. Human sign-off logged.
              </div>
            </div>
            <button onClick={() => setToast(false)}>
              <X className="h-4 w-4 text-text/40 hover:text-text" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
