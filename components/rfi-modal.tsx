"use client";

import { useEffect, useRef, useState } from "react";
import { procurementApi } from "@/lib/api";

interface RFIModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName?: string;
  bidId?: string;
  findings?: string[];
  onHandoffSuccess?: (logMsg: string) => void;
}

export default function RFIModal({
  isOpen,
  onClose,
  vendorName = "CoolTech Global Solutions",
  bidId,
  findings = [],
  onHandoffSuccess,
}: RFIModalProps) {
  const draft = `Subject: Request for information — bid clarification

Dear ${vendorName},

Please address the following recorded review findings:
${findings.length ? findings.map((finding) => `- ${finding}`).join("\n") : "- Please provide the information needed to complete the bid review."}

Please submit the supporting information and, where applicable, a compliant revised specification.

Regards,
Procurement Review Team`;
  const [emailBody, setEmailBody] = useState<string>(draft);

  const [isSent, setIsSent] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    setEmailBody(draft);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSent) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draft, isOpen, isSent, onClose]);

  const handleHandoff = async () => {
    setError("");
    setIsSent(true);
    try {
      if (bidId) await procurementApi.action(bidId, "RFI_DRAFT_APPROVED", emailBody);
      if (onHandoffSuccess) onHandoffSuccess("Draft approval recorded.");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record the RFI draft approval.");
      setIsSent(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rfi-title" className="bg-[#111827] border border-[#1e293b] rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b border-[#1e293b] mb-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#38bdf8] mb-0.5">
              REQUEST FOR INFORMATION
            </div>
            <h3 id="rfi-title" className="text-lg font-bold flex items-center gap-2">
              Request information
            </h3>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close RFI draft"
            className="text-[#94a3b8] hover:text-white text-sm px-2 py-1 rounded border border-[#1e293b] hover:bg-[#1f2937]"
          >
            ✕ Close
          </button>
        </div>

        <p className="text-xs text-[#94a3b8] mb-3">
          This editable draft is built from recorded findings. Review and edit it before recording approval.
        </p>

        <textarea
          aria-label="Editable RFI email draft"
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          className="w-full h-56 bg-[#040711] border border-[#1e293b] rounded-lg p-3 text-xs font-mono text-[#e2e8f0] focus:border-[#38bdf8] outline-none resize-none leading-relaxed"
        />

        <div className="flex justify-between items-center mt-5 pt-3 border-t border-[#1e293b]">
          <span className="text-xs text-[#94a3b8]">
            Status: <strong className="text-[#818cf8]">Draft ready for review</strong>
          </span>

          <button
            onClick={() => void handleHandoff()}
            disabled={isSent}
            className="bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#090d16] font-bold text-xs px-5 py-2.5 rounded-lg shadow-lg hover:shadow-[#38bdf8]/20 transition-all flex items-center gap-2"
          >
            {isSent ? "Recording…" : "Record RFI approval"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-[#f43f5e]">{error}</p>}
      </div>
    </div>
  );
}
