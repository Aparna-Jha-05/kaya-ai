"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, CheckCircle2 } from "lucide-react";
import { procurementApi } from "@/lib/api";

interface RFIModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName?: string;
  bidId?: string;
  onHandoffSuccess?: (logMsg: string) => void;
}

export default function RFIModal({
  isOpen,
  onClose,
  vendorName = "Supplier",
  bidId,
  onHandoffSuccess,
}: RFIModalProps) {
  const [mounted, setMounted] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [rfiId, setRfiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string>("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSent) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rfi-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line border-b-2 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-4 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="page-eyebrow mb-1">REQUEST FOR INFORMATION</p>
            <h3 id="rfi-title" className="text-lg font-extrabold text-text flex items-center gap-2 truncate">
              <FileText className="h-5 w-5 text-cyan shrink-0" />
              <span>Request information for {vendorName}</span>
            </h3>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close RFI modal"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-text hover:border-cyan/40 hover:text-cyan tactile-press shadow-xs"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>

        <p className="mb-3 text-xs font-medium text-text/60">
          This server-generated draft is built from recorded findings for {vendorName}. Review it before recording approval.
        </p>

        {/* Draft Textarea */}
        <textarea
          aria-label="Editable RFI email draft"
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          disabled={loading || !rfiId}
          placeholder={loading ? "Generating evidence-bound RFI draft…" : "RFI draft unavailable."}
          className="h-56 w-full resize-none rounded-xl border border-line bg-surface p-4 font-mono text-xs leading-relaxed text-text outline-none focus:border-cyan/60 focus:ring-1 focus:ring-cyan/30 shadow-xs disabled:opacity-60"
        />

        {/* Action Footer */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-line pt-4">
          <div className="flex items-center gap-2 text-xs text-text/60">
            <span>Status:</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-violet/15 px-2.5 py-1 text-xs font-bold text-violet border border-violet/30 shadow-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Draft ready for review
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleHandoff()}
            disabled={loading || isSent || !rfiId}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan px-5 py-2.5 text-xs font-bold text-on-accent shadow-xs transition-all hover:bg-cyan/90 tactile-press disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Generating…" : isSent ? "Recording…" : "Record RFI approval"}
          </button>
        </div>

        {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose">{error}</p>}
      </div>
    </div>,
    document.body
  );
}
