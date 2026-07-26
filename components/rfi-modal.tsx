"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  onHandoffSuccess,
}: RFIModalProps) {
  const [emailBody, setEmailBody] = useState("");
  const [rfiId, setRfiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string>("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    document.body.classList.add("scroll-locked");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSent) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("scroll-locked");
    };
  }, [isOpen, isSent, onClose]);

  useEffect(() => {
    if (!isOpen || !bidId) return;
    let active = true;
    setLoading(true);
    setIsSent(false);
    setError("");
    setRfiId("");
    setEmailBody("");
    procurementApi.rfiDraft(bidId)
      .then((draft) => {
        if (!active) return;
        setRfiId(draft.rfi_id);
        setEmailBody(draft.rfi_text);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not generate the RFI draft.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bidId, isOpen]);

  const handleHandoff = async () => {
    setError("");
    setIsSent(true);
    try {
      if (!rfiId) throw new Error("Generate the RFI draft before approving it.");
      await procurementApi.approveRfi(rfiId, emailBody);
      if (onHandoffSuccess) onHandoffSuccess("Draft approval recorded.");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record the RFI draft approval.");
      setIsSent(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-md" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rfi-title" className="w-full max-w-2xl rounded-xl border border-line bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="page-eyebrow mb-0.5">
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
            className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs text-text/60 hover:bg-surface hover:text-text"
          >
            <X className="h-3.5 w-3.5" /> Close
          </button>
        </div>

        <p className="mb-3 text-xs text-text/60">
          This server-generated draft is built from recorded findings for {vendorName}. Review it before recording approval.
        </p>

        <textarea
          aria-label="Editable RFI email draft"
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          disabled={loading || !rfiId}
          placeholder={loading ? "Generating the evidence-bound draft…" : "RFI draft unavailable."}
          className="h-56 w-full resize-none rounded-lg border border-line bg-inset p-3 font-mono text-xs leading-relaxed text-text outline-none focus:border-cyan"
        />

        <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
          <span className="text-xs text-text/60">
            Status: <strong className="text-violet">Draft ready for review</strong>
          </span>

          <button
            onClick={() => void handleHandoff()}
            disabled={loading || isSent || !rfiId}
            className="flex items-center gap-2 rounded-lg bg-cyan px-5 py-2.5 text-xs font-bold text-on-accent shadow-lg transition-all hover:bg-cyan/90 hover:shadow-[0_8px_24px_rgb(var(--color-cyan)_/_0.2)]"
          >
            {loading ? "Generating…" : isSent ? "Recording…" : "Record RFI approval"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-rose">{error}</p>}
      </div>
    </div>
  );
}
