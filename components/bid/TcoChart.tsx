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
import { COLORS } from "@/lib/constants";

interface Row {
  vendor: string;
  Upfront: number;
  "5-Year TCO²": number;
}

export default function TcoChart({ data }: { data: Row[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface p-4">
      <div className="mb-3 text-xs font-medium text-text/60">
        Upfront cost vs 5-year TCO² (₹ Cr) — lower is better
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={6} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="vendor"
            stroke="rgba(241,255,246,0.5)"
            tick={{ fontSize: 12, fontFamily: "monospace" }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(241,255,246,0.5)"
            tick={{ fontSize: 11, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <RTooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              backgroundColor: COLORS.surface,
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "monospace",
            }}
            labelStyle={{ color: COLORS.text }}
            formatter={(v: number) => [`₹${v.toFixed(1)} Cr`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Upfront" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
          <Bar dataKey="5-Year TCO²" radius={[3, 3, 0, 0]}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={row.vendor === "VB" ? COLORS.rose : COLORS.amber}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
