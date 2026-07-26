"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_PO_LICE_API_URL ?? "http://localhost:8000";

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
  const [result, setResult] = useState({
    adjusted_capex_inr: baseCapexCr * 10_000_000,
    delay_penalty_inr: delayDays * 200_000,
    calculated_tco2_inr: baseCapexCr * 10_000_000 + delayDays * 200_000 + 27_600_000,
    recommendation: "REJECTED",
  });
  const [connection, setConnection] = useState<"live" | "offline">("offline");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/bids/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            base_capex_inr: baseCapexCr * 10_000_000,
            discount_percent: discountPercent,
            delay_days: delayDays,
            opex_carbon_5yr_inr: 27_600_000,
            lifecycle_mode: "PRE_AWARD",
          }),
        });
        if (!response.ok) throw new Error("Simulation service unavailable");
        const next = await response.json();
        setResult(next);
        setConnection("live");
        onTCOChange?.(next.calculated_tco2_inr / 10_000_000);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setConnection("offline");
      }
    }, 120);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [baseCapexCr, delayDays, discountPercent, onTCOChange]);

  const finalCapexCr = result.adjusted_capex_inr / 10_000_000;
  const riskPenaltyCr = result.delay_penalty_inr / 10_000_000;
  const recalculatedTCO2 = result.calculated_tco2_inr / 10_000_000;
  const isReject = result.recommendation === "REJECT" || result.recommendation === "REJECTED";

  return (
    <div className="bg-card border border-line rounded-xl p-5 hover:border-cyan/40 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-[#38bdf8] mb-0.5">
            COST SCENARIO
          </div>
          <h3 className="text-base font-bold flex items-center gap-2">
            🎛️ 5-year total cost
          </h3>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
            isReject
              ? "bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]"
              : "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]"
          }`}
        >
          {isReject ? "Not recommended" : "Recommended"}
        </span>
      </div>

      <p className="text-xs text-[#94a3b8] mb-4">
        Test commercial assumptions. This result informs review; it does not approve a purchase order. <span className={connection === "live" ? "text-[#38bdf8]" : "text-[#94a3b8]"}>[{connection === "live" ? "live calculation" : "demo calculation"}]</span>
      </p>

      <div className="space-y-4 bg-surface p-4 rounded-lg border border-line mb-4">
        {/* Discount Slider */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Upfront discount: <strong className="text-[#38bdf8]">{discountPercent}%</strong></span>
            <span className="text-[#94a3b8]">Base cost: ₹{baseCapexCr.toFixed(2)} Cr</span>
          </div>
          <input
            aria-label="Capex discount percentage"
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
            <span>Delivery delay: <strong className="text-[#fbbf24]">{delayDays} days</strong></span>
            <span className="text-[#94a3b8]">Penalty: ₹2.0L / Day</span>
          </div>
          <input
            aria-label="Delivery delay in days"
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
      <div aria-live="polite" aria-atomic="true" className="grid grid-cols-4 gap-2 bg-inset p-3.5 rounded-lg border border-line text-center">
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Upfront cost</div>
          <div className="text-sm font-bold font-mono mt-0.5">₹{finalCapexCr.toFixed(2)}Cr</div>
        </div>
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Delay cost</div>
          <div className="text-sm font-bold font-mono text-[#fbbf24] mt-0.5">₹{riskPenaltyCr.toFixed(2)}Cr</div>
        </div>
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">5-year total</div>
          <div className={`text-sm font-bold font-mono mt-0.5 ${isReject ? "text-[#f43f5e]" : "text-[#38bdf8]"}`}>
            ₹{recalculatedTCO2.toFixed(2)}Cr
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Review result</div>
          <div className={`text-xs font-extrabold uppercase mt-1 ${isReject ? "text-[#f43f5e]" : "text-[#38bdf8]"}`}>
            {isReject ? "Do not recommend" : "Recommend"}
          </div>
        </div>
      </div>
    </div>
  );
}
