"use client";

import { useState } from "react";
import EvidenceBoard from "@/components/evidence-board";
import CADVisualizer from "@/components/cad-visualizer";
import TCOSlider from "@/components/tco-slider";
import RFIModal from "@/components/rfi-modal";

export default function PrecinctPage() {
  const [selectedVendor, setSelectedVendor] = useState<string>("Vendor B (CoolTech)");
  const [isRfiOpen, setIsRfiOpen] = useState<boolean>(false);
  const [activityLogs, setActivityLogs] = useState<string[]>([
    "[PO-lice Engine] Bid upload received: Vendor B (CoolTech Global).",
    "[Building Patrol] FAIL: Power Draw 1,400 kW > Substation Limit 1,200 kW.",
    "[Green Patrol] FAIL: Embodied Carbon 540 kgCO2e > Cap 450 kgCO2e.",
    "[Vice Squad] FLAG: Risk Score 8/10. Missing OSHA Safety Form 300.",
    "[Traffic Control] FLAG: 12-day downstream critical path delay exposure.",
  ]);

  const handleHandoffSuccess = (newMsg: string) => {
    setActivityLogs((prev) => [...prev, newMsg]);
  };

  return (
    <div className="space-y-6 text-[#f8fafc]">
      {/* Top Header Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between pb-4 border-b border-[#1e293b]">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[#38bdf8] mb-1">
            AMBER_PROCUREMENT_ENFORCEMENT // SYSTEM_ONLINE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
            🚨 PO-lice · The Precinct
            <span className="text-xs bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8] px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
              Kaya Track 3
            </span>
          </h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Amber&apos;s procurement enforcement layer for{" "}
            <strong className="text-white">IIT Smart Campus Phase 1 Data Center</strong>. LLM extracts & explains; deterministic SQL/math validates.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-[#111827] border border-[#1e293b] px-3 py-2 rounded-lg font-mono">
            Repo: <strong className="text-[#38bdf8]">Aparna-Jha-05/kaya-ai</strong>
          </div>
          <div className="bg-[#111827] border border-[#1e293b] px-3 py-2 rounded-lg font-mono">
            Team: <strong className="text-[#38bdf8]">TensorTruss</strong>
          </div>
        </div>
      </div>

      {/* Top Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-xl">
          <div className="text-[11px] font-mono uppercase text-[#94a3b8]">TOTAL BIDS AUDITED</div>
          <div className="text-2xl font-extrabold font-mono text-[#38bdf8] mt-1">3 Bids</div>
          <div className="text-[11px] text-[#94a3b8] mt-1">100% Deterministic Pass/Fail</div>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-xl border-l-4 border-l-[#f43f5e]">
          <div className="text-[11px] font-mono uppercase text-[#94a3b8]">CRITICAL BREACHES</div>
          <div className="text-2xl font-extrabold font-mono text-[#f43f5e] mt-1">2 Clashes</div>
          <div className="text-[11px] text-[#f43f5e] mt-1">Power +200kW | Carbon +90kg</div>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-xl border-l-4 border-l-[#fbbf24]">
          <div className="text-[11px] font-mono uppercase text-[#94a3b8]">MISSING LEGAL CERTS</div>
          <div className="text-2xl font-extrabold font-mono text-[#fbbf24] mt-1">1 Document</div>
          <div className="text-[11px] text-[#fbbf24] mt-1">OSHA Safety Form 300</div>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-xl border-l-4 border-l-[#38bdf8]">
          <div className="text-[11px] font-mono uppercase text-[#94a3b8]">5-YR TCO² SAVINGS</div>
          <div className="text-2xl font-extrabold font-mono text-[#38bdf8] mt-1">₹1.04 Crore</div>
          <div className="text-[11px] text-[#38bdf8] mt-1">Prevented substitution loss</div>
        </div>
      </div>

      {/* Main Split-Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Active Bids Table + CAD + What-If Slider */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Vendor Bids Docket Table */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 hover:border-[#38bdf8]/40 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-[#38bdf8] mb-0.5">
                  THE_DOCKET // RANKED_TCO2_SCORECARD
                </div>
                <h3 className="text-base font-bold">📊 Active Vendor Bids Docket</h3>
              </div>
              <span className="text-xs bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8] px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                Live Audit Stream
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#060a12] text-[#94a3b8] font-mono border-b border-[#1e293b]">
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Upfront Capex</th>
                    <th className="p-3">Building</th>
                    <th className="p-3">Green</th>
                    <th className="p-3">Vice Risk</th>
                    <th className="p-3">5-Yr TCO²</th>
                    <th className="p-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  <tr
                    onClick={() => setSelectedVendor("Vendor A (Trane)")}
                    className={`cursor-pointer hover:bg-[#1f2937]/50 transition-colors ${
                      selectedVendor.includes("Vendor A") ? "bg-[#38bdf8]/10" : ""
                    }`}
                  >
                    <td className="p-3 font-bold">Vendor A (Trane)</td>
                    <td className="p-3">₹4.20 Cr</td>
                    <td className="p-3"><span className="text-[10px] bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8] px-2 py-0.5 rounded font-bold">PASS</span></td>
                    <td className="p-3"><span className="text-[10px] bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8] px-2 py-0.5 rounded font-bold">PASS</span></td>
                    <td className="p-3"><span className="text-[10px] bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8] px-2 py-0.5 rounded font-bold">2/10</span></td>
                    <td className="p-3 font-mono font-bold text-[#38bdf8]">₹6.00 Cr</td>
                    <td className="p-3 font-bold text-[#38bdf8]">RECOMMENDED</td>
                  </tr>

                  <tr
                    onClick={() => setSelectedVendor("Vendor B (CoolTech)")}
                    className={`cursor-pointer hover:bg-[#1f2937]/50 transition-colors ${
                      selectedVendor.includes("Vendor B") ? "bg-[#f43f5e]/10 border-l-2 border-l-[#f43f5e]" : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-[#f43f5e]">Vendor B (CoolTech)</td>
                    <td className="p-3 text-[#38bdf8] font-bold">₹3.80 Cr</td>
                    <td className="p-3"><span className="text-[10px] bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e] px-2 py-0.5 rounded font-bold">FAIL</span></td>
                    <td className="p-3"><span className="text-[10px] bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e] px-2 py-0.5 rounded font-bold">FAIL</span></td>
                    <td className="p-3"><span className="text-[10px] bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8] px-2 py-0.5 rounded font-bold">8/10</span></td>
                    <td className="p-3 font-mono font-bold text-[#f43f5e]">₹7.04 Cr</td>
                    <td className="p-3 font-bold text-[#f43f5e]">REJECTED</td>
                  </tr>

                  <tr
                    onClick={() => setSelectedVendor("Vendor C (Carrier)")}
                    className={`cursor-pointer hover:bg-[#1f2937]/50 transition-colors ${
                      selectedVendor.includes("Vendor C") ? "bg-[#fbbf24]/10" : ""
                    }`}
                  >
                    <td className="p-3 font-bold">Vendor C (Carrier)</td>
                    <td className="p-3">₹4.50 Cr</td>
                    <td className="p-3"><span className="text-[10px] bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8] px-2 py-0.5 rounded font-bold">PASS</span></td>
                    <td className="p-3"><span className="text-[10px] bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8] px-2 py-0.5 rounded font-bold">PASS</span></td>
                    <td className="p-3"><span className="text-[10px] bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24] px-2 py-0.5 rounded font-bold">5/10</span></td>
                    <td className="p-3 font-mono font-bold">₹6.00 Cr</td>
                    <td className="p-3 font-bold text-[#fbbf24]">ACCEPTABLE</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature B: CAD Bounding Box Component */}
          <CADVisualizer initialWidthM={2.1} doorLimitM={1.9} />

          {/* Feature A: What-If Slider Component */}
          <TCOSlider baseCapexCr={3.8} />
        </div>

        {/* Right Column (5 cols): Evidence Board + Case Files Activity Log + Jarvis Trigger */}
        <div className="lg:col-span-5 space-y-6">
          {/* Level 1 Differentiator: Evidence Board */}
          <EvidenceBoard selectedVendor={selectedVendor} />

          {/* The Case Files & Jarvis Log Drawer */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 hover:border-[#818cf8]/40 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-[#818cf8] mb-0.5">
                  FEATURE_D // AGENTIC_CASE_FILES
                </div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  💬 Case Files & Jarvis Log
                </h3>
              </div>
              <span className="text-xs bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8] px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                Live SSE Stream
              </span>
            </div>

            {/* Chat Log Window */}
            <div className="bg-[#060a12] border border-[#1e293b] rounded-lg p-3 h-52 overflow-y-auto space-y-2.5 mb-4">
              {activityLogs.map((log, i) => (
                <div
                  key={i}
                  className={`text-xs p-2.5 rounded-lg border leading-relaxed ${
                    log.includes("Jarvis")
                      ? "bg-[#38bdf8]/10 border-[#38bdf8] text-[#e0f2fe]"
                      : "bg-[#818cf8]/10 border-[#818cf8] text-[#e0e7ff]"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Jarvis RFI Action Button */}
            <button
              onClick={() => setIsRfiOpen(true)}
              className="w-full bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#090d16] font-bold text-xs py-2.5 rounded-lg shadow-lg hover:shadow-[#38bdf8]/20 transition-all flex items-center justify-center gap-2"
            >
              ✉️ Open Counter-Spec RFI Email Drafter (Feature C)
            </button>
          </div>
        </div>
      </div>

      {/* Counter-Spec RFI Email Modal (Feature C) */}
      <RFIModal
        isOpen={isRfiOpen}
        onClose={() => setIsRfiOpen(false)}
        vendorName="CoolTech Global Solutions"
        onHandoffSuccess={handleHandoffSuccess}
      />
    </div>
  );
}
