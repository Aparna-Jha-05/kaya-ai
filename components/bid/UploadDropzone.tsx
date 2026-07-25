"use client";
import { useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { motion } from "framer-motion";

// Demo-only interaction: it starts the staged walkthrough and does not transmit a file.
export default function UploadDropzone({
  vendor,
  onStart,
}: {
  vendor: string;
  onStart: () => void;
}) {
  const [over, setOver] = useState(false);
  const [dropped, setDropped] = useState(false);

  const trigger = (name: string) => {
    setDropped(true);
    setTimeout(onStart, 500);
  };

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
        const f = e.dataTransfer.files?.[0];
        trigger(f?.name ?? "bid.pdf");
      }}
      onClick={() => trigger(`${vendor}-bid.pdf`)}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        over
          ? "border-green bg-green/5"
          : dropped
          ? "border-green/60 bg-green/5"
          : "border-white/15 bg-card/50 hover:border-white/30"
      }`}
    >
      {dropped ? (
        <div className="flex items-center gap-3 text-green">
          <FileText className="h-6 w-6" />
          <span className="font-mono text-sm">
            {vendor}-bid.pdf received · extracting bid data…
          </span>
        </div>
      ) : (
        <>
          <UploadCloud className={`h-8 w-8 ${over ? "text-green" : "text-text/40"}`} />
          <p className="mt-3 text-sm font-medium text-text/80">
            Drop the {vendor} bid PDF here
          </p>
          <p className="mt-1 text-xs text-text/40">
            Demo walkthrough only — no file leaves your browser on this screen
          </p>
        </>
      )}
    </motion.div>
  );
}
