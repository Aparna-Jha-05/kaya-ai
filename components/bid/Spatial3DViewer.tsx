"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, Maximize2 } from "lucide-react";

interface Spatial3DViewerProps {
  equipmentLength?: number | null;
  equipmentWidth?: number | null;
  equipmentHeight?: number | null;
  doorWidth?: number | null;
  passed?: boolean;
  powerDrawKw?: number | null;
  maxPowerKw?: number;
  floorLoadKg?: number | null;
  maxFloorLoadKg?: number;
}

type SubPartId = "all" | "power" | "compressor" | "coils" | "base";

export default function Spatial3DViewer({
  equipmentLength,
  equipmentWidth,
  equipmentHeight,
  doorWidth = 1.1,
  passed = true,
  powerDrawKw,
  maxPowerKw = 1200,
  floorLoadKg,
  maxFloorLoadKg = 1500,
}: Spatial3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 22, y: -35 });
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isAutoOrbiting, setIsAutoOrbiting] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SubPartId>("all");

  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const isMissingDimensions = equipmentLength == null && equipmentWidth == null && equipmentHeight == null;

  const eqL = equipmentLength ?? 2.4;
  const eqW = equipmentWidth ?? 1.2;
  const eqH = equipmentHeight ?? 1.8;
  const maxDoor = doorWidth ?? 1.1;

  const fitsDoor = equipmentWidth != null ? equipmentWidth <= maxDoor : true;
  const powerBreach = powerDrawKw != null && powerDrawKw > maxPowerKw;
  const floorBreach = floorLoadKg != null && floorLoadKg > maxFloorLoadKg;

  const activeBreaches = [
    equipmentWidth != null && !fitsDoor && {
      id: "door",
      title: "Door Access Overlimit",
      details: `Equipment width (${eqW}m) exceeds entry door width (${maxDoor}m)`,
      delta: `+${(eqW - maxDoor).toFixed(2)}m`,
    },
    powerBreach && {
      id: "power",
      title: "Electrical Power Overlimit",
      details: `Power demand (${powerDrawKw} kW) exceeds site feed rating (${maxPowerKw} kW)`,
      delta: `+${(powerDrawKw! - maxPowerKw).toFixed(0)} kW`,
    },
    floorBreach && {
      id: "floor",
      title: "Floor Loading Overlimit",
      details: `Equipment load (${floorLoadKg} kg/m²) exceeds slab rating (${maxFloorLoadKg} kg/m²)`,
      delta: `+${(floorLoadKg! - maxFloorLoadKg).toFixed(0)} kg/m²`,
    },
  ].filter(Boolean) as Array<{ id: string; title: string; details: string; delta: string }>;

  const subParts = [
    {
      id: "power" as const,
      name: "Power Module",
      status: powerDrawKw == null ? "FLAG" : powerBreach ? "FAIL" : "PASS",
      details: powerDrawKw != null ? `${powerDrawKw} kW (Max ${maxPowerKw} kW)` : "Unstated in Document",
      flagged: powerBreach,
    },
    {
      id: "compressor" as const,
      name: "Chassis Width",
      status: equipmentWidth == null ? "FLAG" : fitsDoor ? "PASS" : "FAIL",
      details: equipmentWidth != null ? `${equipmentWidth} m (Door ${maxDoor} m)` : "Unstated in Document",
      flagged: equipmentWidth != null && !fitsDoor,
    },
    {
      id: "coils" as const,
      name: "Enclosure Footprint",
      status: equipmentLength != null && equipmentWidth != null ? "PASS" : "FLAG",
      details: equipmentLength != null && equipmentWidth != null ? `${equipmentLength}m × ${equipmentWidth}m` : "Unstated in Document",
      flagged: false,
    },
    {
      id: "base" as const,
      name: "Base Footprint",
      status: floorLoadKg == null ? "FLAG" : floorBreach ? "FAIL" : "PASS",
      details: floorLoadKg != null ? `${floorLoadKg} kg/m² (Max ${maxFloorLoadKg} kg/m²)` : "Unstated in Document",
      flagged: floorBreach,
    },
  ];

  // Non-passive wheel event listener for zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.max(0.5, Math.min(2.5, prev + zoomFactor)));
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // Global window mousemove & mouseup handlers for unbroken dragging & panning
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current && !isPanningRef.current) return;

      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        movedRef.current = true;
      }

      if (isPanningRef.current) {
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else if (isDraggingRef.current) {
        setRotation((prev) => ({
          x: Math.max(-80, Math.min(80, prev.x - dy * 0.5)),
          y: prev.y + dx * 0.5,
        }));
      }

      startPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Canvas 2D render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let autoAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2 + pan.x;
      const cy = canvas.height / 2 + 15 + pan.y;
      const baseScale = 45 * zoom;

      const rotY = (rotation.y + autoAngle) * (Math.PI / 180);
      const rotX = rotation.x * (Math.PI / 180);

      // Project 3D point (x, y, z) to 2D canvas (px, py)
      const project = (x: number, y: number, z: number) => {
        const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
        const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);

        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

        const perspective = 300 / (300 + z2);
        return {
          px: cx + x1 * baseScale * perspective,
          py: cy - y2 * baseScale * perspective,
        };
      };

      // Helper to draw 3D Box
      const drawBox = (
        minX: number, minY: number, minZ: number,
        maxX: number, maxY: number, maxZ: number,
        colorRgb: string, alpha: number, isDashed = false, labelText?: string
      ) => {
        const v = [
          project(minX, minY, minZ), project(maxX, minY, minZ),
          project(maxX, minY, maxZ), project(minX, minY, maxZ),
          project(minX, maxY, minZ), project(maxX, maxY, minZ),
          project(maxX, maxY, maxZ), project(minX, maxY, maxZ),
        ];

        const f = [
          [0, 1, 2, 3], [4, 5, 6, 7],
          [0, 1, 5, 4], [2, 3, 7, 6],
          [0, 3, 7, 4], [1, 2, 6, 5],
        ];

        f.forEach((face) => {
          ctx.fillStyle = `rgba(${colorRgb}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(v[face[0]].px, v[face[0]].py);
          for (let i = 1; i < face.length; i++) ctx.lineTo(v[face[i]].px, v[face[i]].py);
          ctx.closePath();
          ctx.fill();
        });

        const e = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];

        ctx.strokeStyle = `rgb(${colorRgb})`;
        ctx.lineWidth = isDashed ? 1.5 : 2;
        if (isDashed) ctx.setLineDash([3, 3]);
        e.forEach(([v1, v2]) => {
          ctx.beginPath();
          ctx.moveTo(v[v1].px, v[v1].py);
          ctx.lineTo(v[v2].px, v[v2].py);
          ctx.stroke();
        });
        if (isDashed) ctx.setLineDash([]);

        if (labelText) {
          const topC = project((minX + maxX) / 2, maxY + 0.15, (minZ + maxZ) / 2);
          ctx.font = "bold 9px monospace";
          ctx.fillStyle = `rgb(${colorRgb})`;
          ctx.textAlign = "center";
          ctx.fillText(labelText, topC.px, topC.py);
        }
      };

      // 1. Draw Grid Ground Plane
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        const p1 = project(i, 0, -3);
        const p2 = project(i, 0, 3);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();

        const p3 = project(-3, 0, i);
        const p4 = project(3, 0, i);
        ctx.beginPath();
        ctx.moveTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.stroke();
      }

      // 2. Draw Door Clearance Archway (Green/Cyan Gateway)
      const dw = maxDoor / 2;
      const dh = 2.2;
      const doorCorners = [
        project(-dw, 0, -2.5),
        project(dw, 0, -2.5),
        project(dw, dh, -2.5),
        project(-dw, dh, -2.5),
      ];

      ctx.fillStyle = fitsDoor ? "rgba(0, 168, 232, 0.08)" : "rgba(244, 63, 94, 0.08)";
      ctx.beginPath();
      ctx.moveTo(doorCorners[0].px, doorCorners[0].py);
      for (let i = 1; i < doorCorners.length; i++) ctx.lineTo(doorCorners[i].px, doorCorners[i].py);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = fitsDoor ? "rgb(0, 168, 232)" : "rgb(244, 63, 94)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(doorCorners[0].px, doorCorners[0].py);
      for (let i = 1; i < doorCorners.length; i++) ctx.lineTo(doorCorners[i].px, doorCorners[i].py);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Door label
      const doorCenter = project(0, dh + 0.2, -2.5);
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = fitsDoor ? "rgb(0, 168, 232)" : "rgb(244, 63, 94)";
      ctx.textAlign = "center";
      ctx.fillText(`Door Width Limit: ${maxDoor}m`, doorCenter.px, doorCenter.py);

      // 3. Draw Equipment Outer Bounding Wireframe
      const hw = eqW / 2;
      const hl = eqL / 2;
      const hh = eqH;

      const mainBoxColor = fitsDoor ? "0, 168, 232" : "244, 63, 94";
      drawBox(-hw, 0, -hl, hw, hh, hl, mainBoxColor, selectedPart === "all" ? 0.15 : 0.05, false, `${eqL}m × ${eqW}m × ${eqH}m`);

      // 4. Render Internal Sub-Component Assembly Parts
      // A) Power & Electrical Substation Module (Flagged if power breach)
      if (selectedPart === "all" || selectedPart === "power") {
        const pColor = powerBreach ? "244, 63, 94" : "0, 168, 232";
        drawBox(
          -hw * 0.85, hh * 0.5, -hl * 0.8,
          -hw * 0.1, hh * 0.95, hl * 0.1,
          pColor, powerBreach ? 0.45 : 0.25, false,
          powerBreach ? "⚠ FLAGGED POWER MODULE" : "POWER MODULE"
        );
      }

      // B) Centrifugal Compressor & Motor Assembly
      if (selectedPart === "all" || selectedPart === "compressor") {
        drawBox(
          hw * 0.1, hh * 0.2, -hl * 0.8,
          hw * 0.85, hh * 0.75, -hl * 0.1,
          "168, 85, 247", 0.25, false,
          "COMPRESSOR"
        );
      }

      // C) Cooling Coils & Heat Exchanger Bundle
      if (selectedPart === "all" || selectedPart === "coils") {
        drawBox(
          hw * 0.1, hh * 0.1, 0,
          hw * 0.85, hh * 0.85, hl * 0.8,
          "16, 185, 129", 0.25, false,
          "COOLING COILS"
        );
      }

      // D) Structural Chassis & Floor Load Footprint
      if (selectedPart === "all" || selectedPart === "base") {
        const bColor = floorBreach ? "244, 63, 94" : "245, 158, 11";
        drawBox(
          -hw * 0.95, 0, -hl * 0.95,
          hw * 0.95, hh * 0.12, hl * 0.95,
          bColor, floorBreach ? 0.5 : 0.2, false,
          floorBreach ? "⚠ FLAGGED BASE LOAD" : "CHASSIS FOOTPRINT"
        );
      }

      if (isAutoOrbiting && !isDraggingRef.current && !isPanningRef.current) {
        autoAngle += 0.4;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [eqH, eqL, eqW, fitsDoor, floorBreach, isAutoOrbiting, maxDoor, pan, powerBreach, rotation, selectedPart, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    movedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (e.button === 2 || e.button === 1 || e.shiftKey) {
      isPanningRef.current = true;
      isDraggingRef.current = false;
    } else if (e.button === 0) {
      isDraggingRef.current = true;
      isPanningRef.current = false;
    }
  };

  const handleClick = () => {
    if (!movedRef.current) {
      setIsAutoOrbiting((prev) => !prev);
    }
  };

  const handleDoubleClick = () => {
    setRotation({ x: 22, y: -35 });
    setZoom(1.15);
    setPan({ x: 0, y: 0 });
    setIsAutoOrbiting(true);
    setSelectedPart("all");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    movedRef.current = false;
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      isPanningRef.current = false;
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length >= 2) {
      isPanningRef.current = true;
      isDraggingRef.current = false;
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - startPosRef.current.x;
      const dy = e.touches[0].clientY - startPosRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        movedRef.current = true;
      }

      setRotation((prev) => ({
        x: Math.max(-80, Math.min(80, prev.x - dy * 0.5)),
        y: prev.y + dx * 0.5,
      }));

      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length >= 2 && isPanningRef.current) {
      const dx = e.touches[0].clientX - startPosRef.current.x;
      const dy = e.touches[0].clientY - startPosRef.current.y;

      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="ui-label text-cyan font-bold truncate">Spatial 3D Model &amp; Clearance</span>
          <div
            className="relative shrink-0"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              type="button"
              className="rounded-full text-text/40 hover:text-cyan p-0.5 transition-colors tactile-press"
              aria-label="3D Controls Help"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>

            {showTooltip && (
              <div className="absolute left-0 top-full mt-1.5 z-[999] w-56 rounded-xl border border-line bg-card p-3 shadow-2xl text-xs font-mono space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <p className="font-sans font-bold text-text border-b border-line pb-1 text-[11px]">3D View Controls</p>
                <div className="space-y-1 text-[11px] text-text/80">
                  <p>• <span className="text-cyan font-bold">Left-Drag</span>: Orbit 3D model</p>
                  <p>• <span className="text-cyan font-bold">Right-Drag / Shift-Drag</span>: Pan</p>
                  <p>• <span className="text-cyan font-bold">Scroll Wheel</span>: Zoom in / out</p>
                  <p>• <span className="text-cyan font-bold">Click</span>: Pause/Play auto-orbit</p>
                  <p>• <span className="text-cyan font-bold">Double Click</span>: Reset view</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeBreaches.length === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold text-cyan bg-cyan/15 border border-cyan/30 shrink-0">
              ✓ Compliant
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold text-rose bg-rose/15 border border-rose/30 shrink-0 max-w-[180px] truncate">
              ✕ {activeBreaches.length} {activeBreaches.length === 1 ? "Breach" : "Breaches"}
            </span>
          )}
        </div>
      </div>

      <div
        className="cursor-grab active:cursor-grabbing select-none relative"
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          isDraggingRef.current = false;
          isPanningRef.current = false;
        }}
      >
        <canvas
          ref={canvasRef}
          width={440}
          height={210}
          className="w-full h-[210px] rounded-xl bg-inset/60 border border-line/40"
        />
      </div>

      {/* Component Part Filter & Inspector Legend */}
      <div className="pt-1 space-y-2 border-t border-line/40">
        <div className="flex items-center justify-between text-[11px] font-mono text-text/60">
          <span className="font-bold uppercase tracking-wider text-text/50">Components</span>
          <button
            type="button"
            onClick={() => setSelectedPart("all")}
            className={`hover:underline ${selectedPart === "all" ? "text-cyan font-bold" : "text-text/40"}`}
          >
            Show All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {subParts.map((part) => {
            const isSelected = selectedPart === part.id;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => setSelectedPart(isSelected ? "all" : part.id)}
                className={`flex items-center justify-between rounded-lg border p-2 text-left text-xs transition-all tactile-press min-w-0 ${
                  isSelected
                    ? "border-cyan bg-cyan/15 text-cyan ring-1 ring-cyan/40"
                    : part.flagged
                    ? "border-rose/40 bg-rose/10 text-rose hover:bg-rose/20"
                    : "border-line bg-surface/50 text-text/75 hover:border-line/80 hover:text-text"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-[11px] truncate">{part.name}</p>
                  <p className="text-[10px] font-mono text-text/50 truncate">{part.details}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase border ${
                    part.flagged
                      ? "bg-rose/20 text-rose border-rose/40"
                      : "bg-cyan/15 text-cyan border-cyan/30"
                  }`}
                >
                  {part.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dedicated Constraint Breach Audit Panel */}
      {activeBreaches.length > 0 && (
        <div className="rounded-xl border border-rose/30 bg-rose/10 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-rose/20 pb-1.5 min-w-0">
            <span className="font-sans font-bold text-rose flex items-center gap-1.5 text-[11px] uppercase tracking-wider truncate">
              ⚠ Spatial & Technical Constraint Breaches
            </span>
            <span className="font-mono text-[10px] font-bold text-rose shrink-0">
              {activeBreaches.length} FLAGGED
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            {activeBreaches.map((breach) => (
              <div key={breach.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface/80 p-2 border border-rose/20 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-rose truncate">{breach.title}</p>
                  <p className="text-[10px] text-text/70 font-sans mt-0.5 truncate">{breach.details}</p>
                </div>
                <span className="shrink-0 font-bold bg-rose/20 text-rose border border-rose/30 px-1.5 py-0.5 rounded text-[10px]">
                  {breach.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
