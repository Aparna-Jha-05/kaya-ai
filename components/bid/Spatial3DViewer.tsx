"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, Maximize2 } from "lucide-react";

interface Spatial3DViewerProps {
  equipmentLength?: number | null;
  equipmentWidth?: number | null;
  equipmentHeight?: number | null;
  doorWidth?: number | null;
  passed?: boolean;
}

export default function Spatial3DViewer({
  equipmentLength = 2.4,
  equipmentWidth = 1.2,
  equipmentHeight = 1.8,
  doorWidth = 1.1,
  passed = true,
}: Spatial3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 22, y: -35 });
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isAutoOrbiting, setIsAutoOrbiting] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const eqL = equipmentLength ?? 2.4;
  const eqW = equipmentWidth ?? 1.2;
  const eqH = equipmentHeight ?? 1.8;
  const maxDoor = doorWidth ?? 1.1;

  const fitsDoor = eqW <= maxDoor;

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

      // 3. Draw Equipment Bounding Box
      const hw = eqW / 2;
      const hl = eqL / 2;
      const hh = eqH;

      const vertices = [
        project(-hw, 0, -hl),
        project(hw, 0, -hl),
        project(hw, 0, hl),
        project(-hw, 0, hl),
        project(-hw, hh, -hl),
        project(hw, hh, -hl),
        project(hw, hh, hl),
        project(-hw, hh, hl),
      ];

      const faces = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 1, 5, 4],
        [2, 3, 7, 6],
        [0, 3, 7, 4],
        [1, 2, 6, 5],
      ];

      const boxColor = fitsDoor ? "0, 168, 232" : "244, 63, 94";

      faces.forEach((face) => {
        ctx.fillStyle = `rgba(${boxColor}, 0.25)`;
        ctx.beginPath();
        ctx.moveTo(vertices[face[0]].px, vertices[face[0]].py);
        for (let i = 1; i < face.length; i++) ctx.lineTo(vertices[face[i]].px, vertices[face[i]].py);
        ctx.closePath();
        ctx.fill();
      });

      const edges = [
        [0,1],[1,2],[2,3],[3,0],
        [4,5],[5,6],[6,7],[7,4],
        [0,4],[1,5],[2,6],[3,7]
      ];

      ctx.strokeStyle = `rgb(${boxColor})`;
      ctx.lineWidth = 2;
      edges.forEach(([v1, v2]) => {
        ctx.beginPath();
        ctx.moveTo(vertices[v1].px, vertices[v1].py);
        ctx.lineTo(vertices[v2].px, vertices[v2].py);
        ctx.stroke();
      });

      // Dimension callout label
      const topCenter = project(0, hh + 0.3, 0);
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = `rgb(${boxColor})`;
      ctx.fillText(`${eqL}m × ${eqW}m × ${eqH}m`, topCenter.px, topCenter.py);

      if (isAutoOrbiting && !isDraggingRef.current && !isPanningRef.current) {
        autoAngle += 0.4;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [eqH, eqL, eqW, fitsDoor, isAutoOrbiting, maxDoor, pan, rotation, zoom]);

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
          <span className="ui-label text-cyan font-bold truncate">3D Spatial Geometry</span>
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

        <span className={`text-xs font-mono font-bold shrink-0 ${fitsDoor ? "text-cyan" : "text-rose"}`}>
          {fitsDoor ? "✓ Fits Gateway" : "✕ Exceeds Limit"}
        </span>
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
    </div>
  );
}
