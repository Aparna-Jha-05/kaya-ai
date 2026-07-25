"use client";

import { useState } from "react";

interface ExtractedField {
  id: string;
  name: string;
  value: string;
  confidence: number; // 0 to 100
  source: string;
  isVerified: boolean;
}

export default function ConfidenceHeatmap({
  vendorName = "Vendor B (CoolTech)",
}: {
  vendorName?: string;
}) {
  const [fields, setFields] = useState<ExtractedField[]>([
    {
      id: "f1",
      name: "Substation Power Draw",
      value: "1,400 kW",
      confidence: 99,
      source: "Page 34, Spec Table 2.1",
      isVerified: true,
    },
    {
      id: "f2",
      name: "Embodied Carbon Factor",
      value: "540 kgCO2e/ton",
      confidence: 97,
      source: "Page 35, EPD Attachment",
      isVerified: true,
    },
    {
      id: "f3",
      name: "Equipment Width Clearance",
      value: "2.10 meters",
      confidence: 82,
      source: "Page 36, CAD Blueprint Annotation",
      isVerified: false,
    },
    {
      id: "f4",
      name: "Upfront Capex Price",
      value: "₹3,80,00,000 (INR 3.80 Cr)",
      confidence: 100,
      source: "Page 1, Commercial Terms",
      isVerified: true,
    },
    {
      id: "f5",
      name: "OSHA Safety Form 300",
      value: "MISSING / PENDING",
      confidence: 95,
      source: "Page 40, Compliance Annexure",
      isVerified: true,
    },
  ]);

  const verifyField = (id: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isVerified: true, confidence: 100 } : f))
    );
  };

  const unverifiedCount = fields.filter((f) => !f.isVerified).length;

  return (
    <div className="bg-card border border-line rounded-xl p-5 hover:border-cyan/40 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-[#38bdf8] mb-0.5">
            EXTRACTION REVIEW
          </div>
          <h3 className="text-base font-bold flex items-center gap-2">
            🔍 Extracted bid fields
          </h3>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
            unverifiedCount > 0
              ? "bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]"
              : "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]"
          }`}
        >
          {unverifiedCount > 0 ? `${unverifiedCount} fields need review` : "All fields verified"}
        </span>
      </div>

      <p className="text-xs text-[#94a3b8] mb-3">
        Confirm low-confidence fields before using them as evidence.
      </p>

      {/* Field List */}
      <div className="space-y-2">
        {fields.map((field) => {
          const isHighConf = field.confidence >= 95;

          return (
            <div
              key={field.id}
              className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
                !field.isVerified
                  ? "bg-[#fbbf24]/10 border-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                  : "bg-inset border-line"
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{field.name}:</span>
                  <span className="font-mono font-bold text-[#38bdf8]">{field.value}</span>
                </div>
                <div className="text-[10px] text-[#94a3b8] font-mono">
                  Source: {field.source}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Confidence Pill */}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isHighConf
                      ? "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]"
                      : "bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]"
                  }`}
                >
                  {field.confidence}% confidence
                </span>

                {/* Human Verify Action */}
                {!field.isVerified ? (
                  <button
                    onClick={() => verifyField(field.id)}
                    className="bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#090d16] font-bold text-[10px] px-2.5 py-1 rounded transition-colors shadow"
                  >
                    ✓ Confirm
                  </button>
                ) : (
                  <span className="text-[#38bdf8] font-mono text-[10px]">✓ Verified</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
