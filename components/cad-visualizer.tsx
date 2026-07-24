"use client";

import { useState } from "react";

interface CADVisualizerProps {
  initialWidthM?: number;
  doorLimitM?: number;
}

export default function CADVisualizer({
  initialWidthM = 2.1,
  doorLimitM = 1.9,
}: CADVisualizerProps) {
  const [widthM, setWidthM] = useState<number>(initialWidthM);

  const isBreached = widthM > doorLimitM;
  const bboxWidthPx = Math.round(widthM * 100);

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 hover:border-[#38bdf8]/40 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-[#f43f5e] mb-0.5">
            FEATURE_B // VLM_SPATIAL_CAD_READ
          </div>
          <h3 className="text-base font-bold flex items-center gap-2">
            📐 CAD Bounding Box Visualizer
          </h3>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
            isBreached
              ? "bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]"
              : "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]"
          }`}
        >
          {isBreached ? "DOOR BREACH" : "CLEARANCE PASS"}
        </span>
      </div>

      <p className="text-xs text-[#94a3b8] mb-3">
        LLaVA 1.6 VLM extracted equipment dimensions from CAD blueprint screenshot embedded in page 34:
      </p>

      {/* Slider Control */}
      <div className="mb-4 bg-[#060a12] p-3 rounded-lg border border-[#1e293b]">
        <div className="flex justify-between text-xs font-medium mb-1.5">
          <span>Extracted Equipment Width: <strong className={isBreached ? "text-[#f43f5e]" : "text-[#38bdf8]"}>{widthM.toFixed(2)}m</strong></span>
          <span className="text-[#94a3b8]">Site Door Limit: {doorLimitM.toFixed(2)}m</span>
        </div>
        <input
          type="range"
          min="1.5"
          max="2.5"
          step="0.05"
          value={widthM}
          onChange={(e) => setWidthM(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
        />
      </div>

      {/* Blueprint Canvas Box */}
      <div className="relative bg-[#02050b] border border-dashed border-[#1e293b] rounded-lg h-56 flex items-center justify-center overflow-hidden">
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Door frame indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-[190px] border-x-2 border-dashed border-[#94a3b8]/40 flex items-start justify-center">
          <span className="text-[10px] font-mono text-[#94a3b8] bg-[#02050b] px-1.5 py-0.5 rounded -mt-2">
            Door Clearance (1.90m)
          </span>
        </div>

        {/* Equipment SVG Bounding Box */}
        <div
          className={`absolute transition-all duration-200 border-2 rounded p-2 flex flex-col justify-between ${
            isBreached
              ? "border-[#f43f5e] bg-[#f43f5e]/15 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              : "border-[#38bdf8] bg-[#38bdf8]/15 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
          }`}
          style={{
            width: `${bboxWidthPx}px`,
            height: "130px",
          }}
        >
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit ${
              isBreached ? "bg-[#f43f5e] text-white" : "bg-[#38bdf8] text-[#090d16]"
            }`}
          >
            VLM Extracted: {widthM.toFixed(2)}m
          </span>

          <span
            className={`text-[10px] font-mono font-bold ${
              isBreached ? "text-[#f43f5e]" : "text-[#38bdf8]"
            }`}
          >
            {isBreached
              ? `⚠️ Exceeds door by ${(widthM - doorLimitM).toFixed(2)}m`
              : "✓ Physical clearance verified"}
          </span>
        </div>
      </div>
    </div>
  );
}
