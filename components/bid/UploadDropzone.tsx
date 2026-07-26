"use client";
import { useRef, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { procurementApi, type BidRecord } from "@/lib/api";

export default function UploadDropzone({
  onUploaded,
}: {
  onUploaded: (record: BidRecord) => void;
}) {
  const [over, setOver] = useState(false);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setState("error");
      setError("Choose a PDF document.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setState("error");
      setError("The PDF exceeds the 15 MB upload limit.");
      return;
    }
    setState("uploading");
    setError("");
    try { onUploaded(await procurementApi.upload(file)); } catch (reason) { setState("error"); setError(reason instanceof Error ? reason.message : "Upload failed."); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void upload(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Upload a bid PDF"
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        over
          ? "border-cyan bg-cyan/5"
          : state === "uploading"
          ? "border-cyan/60 bg-cyan/5"
          : "border-white/15 bg-card/50 hover:border-white/30"
      }`}
    >
      <input ref={inputRef} aria-label="Choose a bid PDF" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      {state === "uploading" ? (
        <div className="flex items-center gap-3 text-cyan">
          <FileText className="h-6 w-6" />
          <span className="font-mono text-sm">
            Upload received · extracting and checking…
          </span>
        </div>
      ) : (
        <>
          <UploadCloud className={`h-8 w-8 ${over ? "text-cyan" : "text-text/40"}`} />
          <p className="mt-3 text-sm font-medium text-text/80">
            Drop a bid PDF here
          </p>
          <p className="mt-1 text-xs text-text/40">
            PDF only · 15 MB maximum · deterministic checks run after extraction
          </p>
        </>
      )}
      {state === "error" && <p className="mt-3 text-xs text-rose">{error}</p>}
    </motion.div>
  );
}
