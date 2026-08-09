"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, RotateCcw } from "lucide-react";

type PartId = "all" | "power" | "compressor" | "coils" | "base";
type ResultStatus = "PASS" | "FAIL" | "FLAG";

interface Spatial3DViewerProps {
  equipmentLength?: number | null;
  equipmentWidth?: number | null;
  equipmentHeight?: number | null;
  doorWidth?: number | null;
  resultStatus: ResultStatus;
  powerDrawKw?: number | null;
  maxPowerKw?: number | null;
  floorLoadKg?: number | null;
  maxFloorLoadKg?: number | null;
}

type Point = { x: number; y: number };

function readingStatus(value?: number | null, limit?: number | null) {
  if (value == null || limit == null) return "NOT EVALUATED";
  return value > limit ? "FAIL" : "PASS";
}

export default function Spatial3DViewer({
  equipmentLength,
  equipmentWidth,
  equipmentHeight,
  doorWidth,
  resultStatus,
  powerDrawKw,
  maxPowerKw,
  floorLoadKg,
  maxFloorLoadKg,
}: Spatial3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, panning: false, moved: false, x: 0, y: 0 });
  const orbitRef = useRef(0);
  const [rotation, setRotation] = useState({ x: 22, y: -35 });
  const [zoom, setZoom] = useState(1.1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [selectedPart, setSelectedPart] = useState<PartId>("all");
  const [showHelp, setShowHelp] = useState(false);

  const dimensionsAreComplete = equipmentLength != null && equipmentWidth != null && equipmentHeight != null;
  const eqL = equipmentLength ?? 2.4;
  const eqW = equipmentWidth ?? 1.2;
  const eqH = equipmentHeight ?? 1.8;
  const doorStatus = readingStatus(equipmentWidth, doorWidth);
  const powerStatus = readingStatus(powerDrawKw, maxPowerKw);
  const floorStatus = readingStatus(floorLoadKg, maxFloorLoadKg);

  const parts = [
    {
      id: "power" as const,
      name: "Power module",
      detail: powerDrawKw == null ? "Power not extracted" : maxPowerKw == null ? `${powerDrawKw} kW · no limit` : `${powerDrawKw} kW · limit ${maxPowerKw} kW`,
      status: powerStatus,
    },
    { id: "compressor" as const, name: "Compressor", detail: "Spatial reference", status: "VISUAL ONLY" },
    { id: "coils" as const, name: "Cooling coils", detail: "Spatial reference", status: "VISUAL ONLY" },
    {
      id: "base" as const,
      name: "Base footprint",
      detail: floorLoadKg == null ? "Floor load not extracted" : maxFloorLoadKg == null ? `${floorLoadKg} kg/m² · no configured limit` : `${floorLoadKg} kg/m² · limit ${maxFloorLoadKg} kg/m²`,
      status: floorStatus,
    },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = frame.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 280);
      height = 250;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    resize();

    const render = () => {
      context.clearRect(0, 0, width, height);
      if (autoOrbit && !dragRef.current.active) orbitRef.current += 0.2;

      const cx = width / 2 + pan.x;
      const cy = height / 2 + 22 + pan.y;
      const scale = Math.min(54, width / 7) * zoom;
      const rotY = (rotation.y + orbitRef.current) * (Math.PI / 180);
      const rotX = rotation.x * (Math.PI / 180);

      const project = (x: number, y: number, z: number): Point => {
        const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
        const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
        const y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const depth = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        const perspective = 320 / (320 + depth * scale * 0.25);
        return { x: cx + x1 * scale * perspective, y: cy - y1 * scale * perspective };
      };

      const drawLine = (a: Point, b: Point, color: string, dashed = false, lineWidth = 1) => {
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.setLineDash(dashed ? [4, 4] : []);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
        context.setLineDash([]);
      };

      const drawBox = (
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        rgb: string,
        alpha: number,
        label?: string
      ) => {
        const vertices = [
          project(minX, minY, minZ), project(maxX, minY, minZ), project(maxX, minY, maxZ), project(minX, minY, maxZ),
          project(minX, maxY, minZ), project(maxX, maxY, minZ), project(maxX, maxY, maxZ), project(minX, maxY, maxZ),
        ];
        const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
        for (const face of faces) {
          context.fillStyle = `rgba(${rgb}, ${alpha})`;
          context.beginPath();
          context.moveTo(vertices[face[0]].x, vertices[face[0]].y);
          for (const index of face.slice(1)) context.lineTo(vertices[index].x, vertices[index].y);
          context.closePath();
          context.fill();
        }
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        for (const [from, to] of edges) drawLine(vertices[from], vertices[to], `rgb(${rgb})`, false, 1.5);
        if (label) {
          const position = project((minX + maxX) / 2, maxY + 0.12, (minZ + maxZ) / 2);
          context.fillStyle = `rgb(${rgb})`;
          context.font = "700 9px ui-monospace, monospace";
          context.textAlign = "center";
          context.fillText(label, position.x, position.y);
        }
      };

      context.strokeStyle = "rgba(148, 163, 184, 0.2)";
      for (let index = -3; index <= 3; index += 1) {
        drawLine(project(index, 0, -3), project(index, 0, 3), "rgba(148, 163, 184, 0.2)");
        drawLine(project(-3, 0, index), project(3, 0, index), "rgba(148, 163, 184, 0.2)");
      }

      if (doorWidth != null) {
        const halfDoor = doorWidth / 2;
        const doorColor = doorStatus === "FAIL" ? "244, 63, 94" : "0, 168, 232";
        const door = [project(-halfDoor, 0, -2.4), project(halfDoor, 0, -2.4), project(halfDoor, 2.2, -2.4), project(-halfDoor, 2.2, -2.4)];
        for (let index = 0; index < 4; index += 1) drawLine(door[index], door[(index + 1) % 4], `rgb(${doorColor})`, true, 2);
        const label = project(0, 2.45, -2.4);
        context.fillStyle = `rgb(${doorColor})`;
        context.font = "700 10px ui-monospace, monospace";
        context.textAlign = "center";
        context.fillText(`Door limit ${doorWidth} m`, label.x, label.y);
      }

      const halfWidth = eqW / 2;
      const halfLength = eqL / 2;
      const shellColor = resultStatus === "FAIL" ? "244, 63, 94" : resultStatus === "FLAG" ? "245, 158, 11" : "0, 168, 232";
      drawBox(-halfWidth, 0, -halfLength, halfWidth, eqH, halfLength, shellColor, selectedPart === "all" ? 0.12 : 0.04, `${eqL}m × ${eqW}m × ${eqH}m`);

      if (selectedPart === "all" || selectedPart === "power") {
        drawBox(-halfWidth * 0.85, eqH * 0.48, -halfLength * 0.8, -halfWidth * 0.1, eqH * 0.92, halfLength * 0.1, powerStatus === "FAIL" ? "244, 63, 94" : "0, 168, 232", 0.3, "POWER");
      }
      if (selectedPart === "all" || selectedPart === "compressor") {
        drawBox(halfWidth * 0.08, eqH * 0.2, -halfLength * 0.8, halfWidth * 0.85, eqH * 0.72, -halfLength * 0.08, "168, 85, 247", 0.25, "COMPRESSOR");
      }
      if (selectedPart === "all" || selectedPart === "coils") {
        drawBox(halfWidth * 0.08, eqH * 0.12, 0, halfWidth * 0.85, eqH * 0.82, halfLength * 0.8, "16, 185, 129", 0.25, "COILS");
      }
      if (selectedPart === "all" || selectedPart === "base") {
        drawBox(-halfWidth * 0.95, 0, -halfLength * 0.95, halfWidth * 0.95, eqH * 0.1, halfLength * 0.95, floorStatus === "FAIL" ? "244, 63, 94" : "245, 158, 11", 0.25, "BASE");
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [autoOrbit, doorStatus, doorWidth, eqH, eqL, eqW, floorStatus, pan, powerStatus, resultStatus, rotation, selectedPart, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((value) => Math.max(0.55, Math.min(2.3, value + (event.deltaY < 0 ? 0.08 : -0.08))));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = () => {
    setRotation({ x: 22, y: -35 });
    setZoom(1.1);
    setPan({ x: 0, y: 0 });
    setSelectedPart("all");
    setAutoOrbit(true);
    orbitRef.current = 0;
  };

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-xs" aria-labelledby="spatial-viewer-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h4 id="spatial-viewer-title" className="ui-label font-bold text-cyan">3D geometry &amp; parts</h4>
          <button type="button" aria-label="Show 3D controls" aria-expanded={showHelp} onClick={() => setShowHelp((shown) => !shown)} className="rounded-full p-0.5 text-text/40 hover:text-cyan">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className={`font-mono text-xs font-bold ${resultStatus === "FAIL" ? "text-rose" : resultStatus === "FLAG" ? "text-amber" : "text-cyan"}`}>
          {resultStatus === "FAIL" ? "Constraint breach" : resultStatus === "FLAG" ? "Evidence review" : "Within constraints"}
        </span>
      </div>

      {showHelp && (
        <div className="rounded-xl border border-line bg-card p-3 text-[11px] text-text/70 shadow-xs">
          Drag to orbit · Shift-drag to pan · Scroll to zoom · Tap/click to pause · Double-click to reset
        </div>
      )}

      {!dimensionsAreComplete && (
        <p className="rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-[11px] text-amber">
          One or more dimensions were not extracted. Placeholder proportions are shown and are not compliance evidence.
        </p>
      )}

      <div ref={frameRef} className="relative min-w-0 select-none overflow-hidden rounded-xl border border-line/40 bg-inset/60">
        <canvas
          ref={canvasRef}
          aria-label="Interactive three-dimensional equipment and access-clearance visualization"
          className="block max-w-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { active: true, panning: event.shiftKey || event.button !== 0, moved: false, x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag.active) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
            if (drag.panning) setPan((value) => ({ x: value.x + dx, y: value.y + dy }));
            else setRotation((value) => ({ x: Math.max(-80, Math.min(80, value.x - dy * 0.45)), y: value.y + dx * 0.45 }));
            drag.x = event.clientX;
            drag.y = event.clientY;
          }}
          onPointerUp={(event) => {
            if (!dragRef.current.moved) setAutoOrbit((value) => !value);
            dragRef.current.active = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { dragRef.current.active = false; }}
          onDoubleClick={resetView}
          onContextMenu={(event) => event.preventDefault()}
        />
        <button type="button" onClick={resetView} aria-label="Reset 3D view" className="absolute right-2 top-2 rounded-lg border border-line bg-card/90 p-2 text-text/60 shadow-xs hover:text-cyan">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text/60">
        <span>{doorWidth == null ? "Door constraint unavailable" : `Door: ${equipmentWidth ?? "?"} m / ${doorWidth} m`}</span>
        <button type="button" onClick={() => setSelectedPart("all")} className={selectedPart === "all" ? "font-bold text-cyan" : "hover:text-text"}>Show all</button>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {parts.map((part) => {
          const selected = selectedPart === part.id;
          const failed = part.status === "FAIL";
          return (
            <button
              key={part.id}
              type="button"
              onClick={() => setSelectedPart(selected ? "all" : part.id)}
              className={`flex items-center justify-between gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${selected ? "border-cyan bg-cyan/15 text-cyan" : failed ? "border-rose/40 bg-rose/10 text-rose" : "border-line bg-card/50 text-text/75 hover:border-cyan/30"}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold">{part.name}</span>
                <span className="block truncate font-mono text-[10px] opacity-65">{part.detail}</span>
              </span>
              <span className="shrink-0 font-mono text-[9px] font-bold">{part.status}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
