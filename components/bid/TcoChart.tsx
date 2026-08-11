"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";

interface Row {
  vendor: string;
  Upfront: number;
  "5-year TCO²": number;
}

function CustomLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-line/60 pt-3 text-xs font-bold">
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-cyan shadow-xs" />
        <span className="text-text/70">Bid Amount</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-amber shadow-xs" />
        <span className="text-text/70">5-Year TCO²</span>
      </div>
    </div>
  );
}

export default function TcoChart({ data }: { data: Row[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
        <div className="mb-3 text-xs font-bold text-text/70">
          Bid Amount vs 5-Year TCO² Comparison (INR)
        </div>
        <div className="flex h-[260px] items-center justify-center text-xs font-medium text-text/40">
          Loading cost comparison…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <div className="mb-3 text-xs font-bold text-text/70">
        Bid Amount vs 5-Year TCO² Comparison (INR)
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 12, right: 16, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-line) / 0.5)" vertical={false} />
          <XAxis
            dataKey="vendor"
            stroke="rgb(var(--color-muted))"
            tick={{ fontSize: 12, fontFamily: "monospace", fill: "rgb(var(--color-muted))" }}
            axisLine={{ stroke: "rgb(var(--color-line))" }}
            tickLine={false}
          />
          <YAxis
            stroke="rgb(var(--color-muted))"
            tick={{ fontSize: 11, fontFamily: "monospace", fill: "rgb(var(--color-muted))" }}
            axisLine={false}
            tickLine={false}
            width={65}
            tickFormatter={(val) => `₹${val} Cr`}
          />
          <RTooltip
            cursor={{ fill: "rgb(var(--color-cyan) / 0.08)" }}
            contentStyle={{
              backgroundColor: "rgb(var(--color-card))",
              border: "1px solid rgb(var(--color-line))",
              borderRadius: 12,
              fontSize: 12,
              fontFamily: "monospace",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            labelStyle={{ color: "rgb(var(--color-text))", fontWeight: "bold" }}
            formatter={(value, name) => {
              const amount = typeof value === "number" ? value : Number(value ?? 0);
              return [`₹${amount.toFixed(2)} Cr`, String(name)];
            }}
          />
          <Bar dataKey="Upfront" fill="rgb(var(--color-cyan))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="5-year TCO²" fill="rgb(var(--color-amber))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}
