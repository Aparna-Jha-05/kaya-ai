"use client";

import { useState } from "react";

interface RFIModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName?: string;
  onHandoffSuccess?: (logMsg: string) => void;
}

export default function RFIModal({
  isOpen,
  onClose,
  vendorName = "CoolTech Global Solutions",
  onHandoffSuccess,
}: RFIModalProps) {
  const [emailBody, setEmailBody] = useState<string>(
    `Subject: Request for information — revised specification and safety certificate

Dear ${vendorName},

Your submitted commercial and technical bid requires clarification on the following project requirements:
- Substation Power Draw: 1,400 kW exceeds site limit of 1,200 kW by 200 kW.
- Embodied Carbon: 540 kgCO2e exceeds project carbon cap of 450 kgCO2e.
- Equipment Width: 2.10m exceeds site door clearance of 1.90m.
- Safety Certificate: OSHA Form 300 is currently missing.

ACTION REQUIRED: Please submit a compliant alternative and the required safety certificate by July 28, 2026.

Regards,
Procurement Review Team (PO-LICE)`
  );

  const [isSent, setIsSent] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleHandoff = () => {
    setIsSent(true);
    if (onHandoffSuccess) {
      onHandoffSuccess("Draft approved and queued for the configured workflow.");
    }
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rfi-title" className="bg-[#111827] border border-[#1e293b] rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b border-[#1e293b] mb-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#38bdf8] mb-0.5">
              REQUEST FOR INFORMATION
            </div>
            <h3 id="rfi-title" className="text-lg font-bold flex items-center gap-2">
              Request a revised specification
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close RFI draft"
            className="text-[#94a3b8] hover:text-white text-sm px-2 py-1 rounded border border-[#1e293b] hover:bg-[#1f2937]"
          >
            ✕ Close
          </button>
        </div>

        <p className="text-xs text-[#94a3b8] mb-3">
          This editable draft cites the recorded findings. Review it before it enters the procurement workflow.
        </p>

        <textarea
          aria-label="Editable RFI email draft"
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          className="w-full h-56 bg-[#040711] border border-[#1e293b] rounded-lg p-3 text-xs font-mono text-[#e2e8f0] focus:border-[#38bdf8] outline-none resize-none leading-relaxed"
        />

        <div className="flex justify-between items-center mt-5 pt-3 border-t border-[#1e293b]">
          <span className="text-xs text-[#94a3b8]">
            Status: <strong className="text-[#818cf8]">Awaiting reviewer approval</strong>
          </span>

          <button
            onClick={handleHandoff}
            disabled={isSent}
            className="bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#090d16] font-bold text-xs px-5 py-2.5 rounded-lg shadow-lg hover:shadow-[#38bdf8]/20 transition-all flex items-center gap-2"
          >
            {isSent ? "✓ Queued" : "Approve and queue draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
