"use client";

import { useEffect, useState } from "react";
import { procurementApi, type SimulationResponse } from "@/lib/api";

interface TCOSliderProps {
  baseCapexCr: number;
  onTCOChange?: (tcoCr: number) => void;
}

export default function TCOSlider({ baseCapexCr, onTCOChange }: TCOSliderProps) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [delayDays, setDelayDays] = useState(0);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [state, setState] = useState<"calculating" | "ready" | "error">("calculating");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setState("calculating");
      procurementApi
        .simulate({
          base_capex_inr: baseCapexCr * 10_000_000,
          discount_percent: discountPercent,
          delay_days: delayDays,
        })
        .then((next) => {
          if (!active) return;
          setResult(next);
          setState("ready");
          onTCOChange?.(next.calculated_tco2_inr / 10_000_000);
        })
        .catch(() => active && setState("error"));
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [baseCapexCr, delayDays, discountPercent, onTCOChange]);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-4 space-y-4 rounded-lg border border-line bg-inset p-4">
        <label className="block">
          <span className="mb-1 flex justify-between text-xs font-medium">
            <span>
              Upfront discount: <strong className="text-cyan">{discountPercent}%</strong>
            </span>
            <span className="text-text/60">Base: ₹{baseCapexCr.toFixed(2)} Cr</span>
          </span>
          <input
            aria-label="Capex discount percentage"
            type="range"
            min="0"
            max="25"
            value={discountPercent}
            onChange={(event) => setDiscountPercent(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-line accent-cyan"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex justify-between text-xs font-medium">
            <span>
              Delivery delay: <strong className="text-amber">{delayDays} days</strong>
            </span>
            <span className="text-text/60">Penalty: ₹2.0L/day</span>
          </span>
          <input
            aria-label="Delivery delay in days"
            type="range"
            min="0"
            max="30"
            value={delayDays}
            onChange={(event) => setDelayDays(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-line accent-amber"
          />
        </label>
      </div>
      <div aria-live="polite" className="rounded-lg border border-line bg-inset p-3.5 text-sm">
        {state === "calculating" ? (
          <p className="text-text/60">Recalculating with the scenario service…</p>
        ) : state === "error" ? (
          <p className="text-amber">Scenario service is unavailable. No replacement estimate is shown.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Upfront cost" value={`₹${(result!.adjusted_capex_inr / 10_000_000).toFixed(2)} Cr`} />
            <Metric label="Delay cost" value={`₹${(result!.delay_penalty_inr / 10_000_000).toFixed(2)} Cr`} />
            <Metric label="5-year cost" value={`₹${(result!.calculated_tco2_inr / 10_000_000).toFixed(2)} Cr`} />
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-text/60">{label}</p>
      <p className="mt-0.5 font-mono font-bold text-text">{value}</p>
    </div>
  );
}
