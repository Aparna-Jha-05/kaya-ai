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
    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <div className="mb-4 space-y-4 rounded-lg border border-line bg-inset p-4">
        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan shrink-0" />
              <span>Upfront discount: <strong className="text-cyan">{discountPercent}%</strong></span>
            </span>
            <span className="text-text/60 font-mono">Base: ₹{baseCapexCr.toFixed(2)} Cr</span>
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
          <span className="mb-1.5 flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber shrink-0" />
              <span>Delivery delay: <strong className="text-amber">{delayDays} days</strong></span>
            </span>
            <span className="text-text/60 font-mono">Penalty: ₹2.0L/day</span>
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
          <p className="text-text/60 text-xs font-medium">Recalculating with scenario service…</p>
        ) : state === "error" ? (
          <p className="text-amber text-xs font-semibold">Scenario service is unavailable. No replacement estimate is shown.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Upfront cost" value={`₹${(result!.adjusted_capex_inr / 10_000_000).toFixed(2)} Cr`} dotColor="bg-cyan" />
            <Metric label="Delay cost" value={`₹${(result!.delay_penalty_inr / 10_000_000).toFixed(2)} Cr`} dotColor="bg-amber" />
            <Metric label="5-year TCO²" value={`₹${(result!.calculated_tco2_inr / 10_000_000).toFixed(2)} Cr`} dotColor="bg-amber" />
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, dotColor }: { label: string; value: string; dotColor: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`} />
        <p className="ui-label text-text/60">{label}</p>
      </div>
      <p className="mt-1 font-mono text-sm font-bold text-text tabular-nums">{value}</p>
    </div>
  );
}
