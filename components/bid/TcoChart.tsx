"use client";
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
  "5-year cost": number;
}

export default function TcoChart({ data }: { data: Row[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-inset p-4">
      <div className="mb-3 text-xs font-medium text-text/60">
        Upfront cost vs 5-year risk-adjusted cost (₹ Cr) — lower is better
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={6} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-line) / 0.72)" vertical={false} />
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
              return [`₹${amount.toFixed(1)} Cr`, ""];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Upfront" fill="rgb(var(--color-blue))" radius={[3, 3, 0, 0]} />
          <Bar dataKey="5-year cost" radius={[3, 3, 0, 0]}>
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
