"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Row {
  vendor: string;
  Upfront: number;
  "5-year TCO²": number;
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
          Upfront cost vs 5-year TCO² (INR) — lower is better
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
        Upfront cost vs 5-year TCO² (INR) — lower is better
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
            width={30}
          />
          <RTooltip
            cursor={{ fill: "rgb(var(--color-overlay) / 0.05)" }}
            contentStyle={{
              backgroundColor: "rgb(var(--color-card))",
              border: "1px solid rgb(var(--color-line))",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "monospace",
            }}
            labelStyle={{ color: "rgb(var(--color-text))" }}
            formatter={(value) => {
              const amount = typeof value === "number" ? value : Number(value ?? 0);
              return [`${amount.toFixed(2)} Cr`, ""];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Upfront" fill="rgb(var(--color-blue))" radius={[3, 3, 0, 0]} />
          <Bar dataKey="5-year TCO²" radius={[3, 3, 0, 0]}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={row.vendor === "VB" ? "rgb(var(--color-rose))" : "rgb(var(--color-amber))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
