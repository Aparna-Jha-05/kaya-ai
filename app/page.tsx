"use client";

import { useState } from "react";
import EvidenceBoard from "@/components/evidence-board";
import CADVisualizer from "@/components/cad-visualizer";
import TCOSlider from "@/components/tco-slider";
import RFIModal from "@/components/rfi-modal";
import ConfidenceHeatmap from "@/components/confidence-heatmap";
import CommandBar from "@/components/command-bar";
import ActiveBidsTable from "@/components/precinct/ActiveBidsTable";
import CaseFilesPanel from "@/components/precinct/CaseFilesPanel";
import SummaryRow from "@/components/precinct/SummaryRow";
import MockBadge from "@/components/ui/MockBadge";

const VENDORS = [
  { label: "Vendor A (Trane)", baseCapexCr: 4.2 },
  { label: "Vendor B (CoolTech)", baseCapexCr: 3.8 },
  { label: "Vendor C (Carrier)", baseCapexCr: 4.5 },
] as const;

export default function PrecinctPage() {
  const [selectedVendor, setSelectedVendor] = useState<(typeof VENDORS)[number]["label"]>(VENDORS[1].label);
  const [isRfiOpen, setIsRfiOpen] = useState(false);
  const selected = VENDORS.find((vendor) => vendor.label === selectedVendor) ?? VENDORS[1];
  const requiresRfi = selectedVendor.includes("Vendor B");
  const openRfi = () => {
    setSelectedVendor(VENDORS[1].label);
    setIsRfiOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-blue">
            Procurement evidence workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">The Precinct</h1>
          <p className="mt-1 max-w-2xl text-sm text-text/50">
            Amber&apos;s procurement enforcement layer for <span className="text-text/80">IIT Smart Campus Phase 1</span> — a data-centre chilled-water plant. LLMs extract and explain; deterministic rules provide the evidence.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text/40">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue" /> Demonstration workspace
          </span>
          <MockBadge />
        </div>
      </div>

      <SummaryRow />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ActiveBidsTable /></div>
        <div><CaseFilesPanel /></div>
      </div>

      <section aria-labelledby="investigation-heading" className="space-y-4 rounded-xl border border-white/10 bg-card/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Investigation workspace</p>
            <h2 id="investigation-heading" className="mt-1 text-lg font-semibold text-text">Review one bid’s evidence trail</h2>
            <p className="mt-1 text-sm text-text/50">Use these tools to prepare a human decision; they do not approve or reject a purchase order.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Select a bid for investigation">
            {VENDORS.map((vendor) => (
              <button
                key={vendor.label}
                type="button"
                aria-pressed={selectedVendor === vendor.label}
                onClick={() => setSelectedVendor(vendor.label)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedVendor === vendor.label
                    ? "border-blue/50 bg-blue/10 text-blue"
                    : "border-white/10 text-text/60 hover:border-white/30 hover:text-text"
                }`}
              >
                {vendor.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {requiresRfi ? <ConfidenceHeatmap vendorName={selectedVendor} /> : null}
            {requiresRfi ? <CADVisualizer initialWidthM={2.1} doorLimitM={1.9} /> : null}
            <TCOSlider baseCapexCr={selected.baseCapexCr} />
          </div>
          <div className="space-y-6 lg:col-span-5">
            <EvidenceBoard selectedVendor={selectedVendor} />
            {requiresRfi ? (
              <div className="rounded-xl border border-violet/30 bg-violet/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-violet">Human action required</p>
                <h3 className="mt-1 text-sm font-semibold text-text">Prepare a counter-specification RFI</h3>
                <p className="mt-1 text-xs leading-relaxed text-text/60">The draft references the recorded breaches. A human must review and approve it before a downstream workflow receives it.</p>
                <button type="button" onClick={openRfi} className="mt-3 rounded-md bg-blue px-3 py-2 text-xs font-semibold text-bg transition-colors hover:bg-blue/90">
                  Review RFI draft
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <CommandBar
        onSelectVendorA={() => setSelectedVendor(VENDORS[0].label)}
        onSelectVendorB={() => setSelectedVendor(VENDORS[1].label)}
        onSelectVendorC={() => setSelectedVendor(VENDORS[2].label)}
        onOpenRFI={openRfi}
      />

      <RFIModal isOpen={isRfiOpen} onClose={() => setIsRfiOpen(false)} vendorName="CoolTech Global Solutions" />
    </div>
  );
}
