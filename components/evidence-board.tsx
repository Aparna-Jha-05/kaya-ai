"use client";

import { useState, useEffect } from "react";

interface GraphNode {
  id: string;
  label: string;
  sublabel: string;
  type: "root" | "breach" | "amber" | "indigo" | "pass";
  x: number;
  y: number;
}

interface GraphLink {
  source: string;
  target: string;
  isBreachPath?: boolean;
}

export default function EvidenceBoard({
  selectedVendor = "Vendor B (CoolTech)",
}: {
  selectedVendor?: string;
}) {
  const isVendorB = selectedVendor.includes("Vendor B");
  const isVendorA = selectedVendor.includes("Vendor A");

  const [activeNode, setActiveNode] = useState<string>("Root");

  useEffect(() => {
    setActiveNode("Root");
  }, [selectedVendor]);

  // Vendor B Nodes (Breach Cascade)
  const vendorBNodes: GraphNode[] = [
    { id: "Root", label: "Vendor B Substituted Chiller", sublabel: "Model CTX-1400 inside PDF p.34", type: "root", x: 60, y: 130 },
    { id: "Power", label: "Power Draw +200kW", sublabel: "Exceeds 1,200kW Substation Cap", type: "breach", x: 230, y: 45 },
    { id: "Electrical", label: "Substation Panel Redesign", sublabel: "Requires ₹15L emergency transformer", type: "breach", x: 430, y: 45 },
    { id: "Carbon", label: "Embodied Carbon +90kgCO2e", sublabel: "Breaches Project LEED Budget", type: "amber", x: 230, y: 130 },
    { id: "Door", label: "Equipment Width 2.10m", sublabel: "Exceeds 1.90m site door clearance", type: "breach", x: 230, y: 215 },
    { id: "VendorRisk", label: "Vendor Delay History (8/10)", sublabel: "2 past delivery slips & missing OSHA cert", type: "indigo", x: 430, y: 130 },
    { id: "Schedule", label: "12-Day Downstream Slip", sublabel: "Critical path delay penalty: ₹24L", type: "indigo", x: 430, y: 215 },
    { id: "TCO2", label: "5-Year TCO² Penalty (₹7.04 Cr)", sublabel: "Cheapest upfront, worst 5-year cost", type: "breach", x: 630, y: 130 },
  ];

  // Vendor A Nodes (Clean Success Path)
  const vendorANodes: GraphNode[] = [
    { id: "Root", label: "Vendor A Trane Chiller", sublabel: "Model TR-1100 (Standard Spec)", type: "root", x: 60, y: 130 },
    { id: "Power", label: "Power Draw 1,100 kW", sublabel: "PASS: <= 1,200 kW Substation Cap", type: "pass", x: 230, y: 45 },
    { id: "Carbon", label: "Embodied Carbon 380 kgCO2e", sublabel: "PASS: <= 450 kgCO2e LEED Budget", type: "pass", x: 230, y: 130 },
    { id: "Door", label: "Equipment Width 1.80m", sublabel: "PASS: <= 1.90m Door Clearance", type: "pass", x: 230, y: 215 },
    { id: "VendorRisk", label: "Exemplary Track Record (2/10)", sublabel: "On-time delivery history & OSHA valid", type: "pass", x: 430, y: 130 },
    { id: "TCO2", label: "5-Year TCO² (₹6.00 Cr)", sublabel: "Lowest total 5-year operating cost", type: "pass", x: 630, y: 130 },
  ];

  const nodes = isVendorA ? vendorANodes : vendorBNodes;

  const links: GraphLink[] = isVendorA
    ? [
        { source: "Root", target: "Power" },
        { source: "Root", target: "Carbon" },
        { source: "Root", target: "Door" },
        { source: "Root", target: "VendorRisk" },
        { source: "Power", target: "TCO2" },
        { source: "Carbon", target: "TCO2" },
      ]
    : [
        { source: "Root", target: "Power", isBreachPath: true },
        { source: "Power", target: "Electrical", isBreachPath: true },
        { source: "Root", target: "Carbon" },
        { source: "Root", target: "Door", isBreachPath: true },
        { source: "Root", target: "VendorRisk" },
        { source: "VendorRisk", target: "Schedule" },
        { source: "Electrical", target: "TCO2", isBreachPath: true },
        { source: "Schedule", target: "TCO2" },
        { source: "Carbon", target: "TCO2" },
      ];

  const getNodeColor = (type: GraphNode["type"]) => {
    switch (type) {
      case "root":
        return "#38bdf8"; // Electric Cyan
      case "pass":
        return "#38bdf8"; // Electric Cyan
      case "breach":
        return "#f43f5e"; // Rose Red
      case "amber":
        return "#fbbf24"; // Amber Gold
      case "indigo":
        return "#818cf8"; // Indigo Violet
    }
  };

  const selectedNodeObj = nodes.find((n) => n.id === activeNode) || nodes[0];

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 hover:border-[#38bdf8]/40 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-[#38bdf8] mb-0.5">
            EVIDENCE_BOARD // DIRECTED_CONSEQUENCE_GRAPH
          </div>
          <h3 className="text-base font-bold flex items-center gap-2">
            🌐 The Evidence Board ({selectedVendor})
          </h3>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
            isVendorB
              ? "bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]"
              : "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]"
          }`}
        >
          {isVendorB ? "Failure Cascade Path" : "Compliant Path"}
        </span>
      </div>

      <p className="text-xs text-[#94a3b8] mb-3">
        Click any node below to trace how {selectedVendor}&apos;s spec items cascade into technical and financial consequences:
      </p>

      {/* SVG Canvas */}
      <div className="relative bg-[#02050b] border border-[#1e293b] rounded-lg h-64 overflow-hidden">
        <svg className="w-full h-full">
          {/* Connection Lines */}
          {links.map((link, idx) => {
            const sNode = nodes.find((n) => n.id === link.source);
            const tNode = nodes.find((n) => n.id === link.target);
            if (!sNode || !tNode) return null;

            return (
              <line
                key={idx}
                x1={sNode.x}
                y1={sNode.y}
                x2={tNode.x}
                y2={tNode.y}
                stroke={link.isBreachPath ? "#f43f5e" : (isVendorA ? "#38bdf8" : "#1e293b")}
                strokeWidth={link.isBreachPath ? "2.5" : "2"}
                strokeDasharray={tNode.type === "indigo" ? "4" : "none"}
                className={link.isBreachPath ? "animate-pulse" : ""}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = activeNode === node.id;
            const color = getNodeColor(node.type);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onClick={() => setActiveNode(node.id)}
                className="cursor-pointer group"
              >
                <circle
                  r={node.type === "root" ? 14 : 10}
                  fill={color}
                  stroke="#090d16"
                  strokeWidth="3"
                  className={`transition-all duration-200 ${
                    isSelected ? "r-16 stroke-white filter drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" : "group-hover:r-12"
                  }`}
                />

                <text
                  x={16}
                  y={4}
                  fill="#f8fafc"
                  fontSize="11"
                  fontWeight={isSelected ? "bold" : "normal"}
                  className="font-sans pointer-events-none select-none"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details */}
      {selectedNodeObj && (
        <div className="mt-3 bg-[#040711] p-3 rounded-lg border border-[#1e293b] flex items-center justify-between text-xs">
          <div>
            <span className="font-mono text-[#94a3b8] uppercase text-[10px] block mb-0.5">
              EVIDENCE DETAIL // {selectedNodeObj.id}
            </span>
            <strong style={{ color: getNodeColor(selectedNodeObj.type) }}>
              {selectedNodeObj.label}
            </strong>
            <p className="text-[#94a3b8] mt-0.5">{selectedNodeObj.sublabel}</p>
          </div>

          <span
            className="text-[10px] font-mono px-2 py-1 rounded font-bold uppercase"
            style={{
              color: getNodeColor(selectedNodeObj.type),
              background: `${getNodeColor(selectedNodeObj.type)}20`,
              border: `1px solid ${getNodeColor(selectedNodeObj.type)}`,
            }}
          >
            {selectedNodeObj.type.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
