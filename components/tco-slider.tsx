"use client";

import { useState } from "react";

interface TCOSliderProps {
  baseCapexCr?: number;
  onTCOChange?: (tcoCr: number) => void;
}

export default function TCOSlider({
  baseCapexCr = 3.8,
  onTCOChange,
}: TCOSliderProps) {
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [delayDays, setDelayDays] = useState<number>(12);

  const finalCapexCr = baseCapexCr * (1 - discountPercent / 100);
  const riskPenaltyCr = (delayDays * 2.0) / 100; // ₹2.0 Lakhs per day
  const opexCarbon5YrCr = 2.76;

  const recalculatedTCO2 = finalCapexCr + riskPenaltyCr + opexCarbon5YrCr;

  const isReject = recalculatedTCO2 > 6.1 || delayDays > 5;

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 hover:border-[#38bdf8]/40 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-[#38bdf8] mb-0.5">
            FEATURE_A // WHAT_IF_RECALCULATION
          </div>
          <h3 className="text-base font-bold flex items-center gap-2">
            🎛️ What-If $TCO^2$ Simulator
          </h3>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
            isReject
              ? "bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]"
              : "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]"
          }`}
        >
          {isReject ? "REJECTED BY TCO²" : "RECOMMENDED"}
        </span>
      </div>

      <p className="text-xs text-[#94a3b8] mb-4">
        Adjust Capex discount or delivery delays to recalculate 5-Year Total Cost of Ownership ($TCO^2$) in real-time:
      </p>

      <div className="space-y-4 bg-[#060a12] p-4 rounded-lg border border-[#1e293b] mb-4">
        {/* Discount Slider */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Vendor B Capex Discount: <strong className="text-[#38bdf8]">{discountPercent}%</strong></span>
            <span className="text-[#94a3b8]">Base: ₹{baseCapexCr.toFixed(2)} Cr</span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
          />
        </div>

        {/* Delay Slider */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Promised Delivery Delay: <strong className="text-[#fbbf24]">{delayDays} Days</strong></span>
            <span className="text-[#94a3b8]">Penalty: ₹2.0L / Day</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={delayDays}
            onChange={(e) => setDelayDays(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#fbbf24]"
          />
        </div>
      </div>

      {/* Recalculation Results */}
      <div className="grid grid-cols-4 gap-2 bg-[#040711] p-3.5 rounded-lg border border-[#1e293b] text-center">
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">CAPEX</div>
          <div className="text-sm font-bold font-mono mt-0.5">₹{finalCapexCr.toFixed(2)}Cr</div>
        </div>
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">RISK COST</div>
          <div className="text-sm font-bold font-mono text-[#fbbf24] mt-0.5">₹{riskPenaltyCr.toFixed(2)}Cr</div>
        </div>
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">5-YR TCO²</div>
          <div className={`text-sm font-bold font-mono mt-0.5 ${isReject ? "text-[#f43f5e]" : "text-[#38bdf8]"}`}>
            ₹{recalculatedTCO2.toFixed(2)}Cr
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">DECISION</div>
          <div className={`text-xs font-extrabold uppercase mt-1 ${isReject ? "text-[#f43f5e]" : "text-[#38bdf8]"}`}>
            {isReject ? "REJECT" : "PASS"}
          </div>
        </div>
      </div>
    </div>
  );
}
