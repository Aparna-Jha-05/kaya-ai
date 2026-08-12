"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

interface GanttScheduleViewerProps {
  promisedWeeks?: number | null;
  delayDays?: number | null;
  requiredWeeks?: number | null;
}

interface GanttTask {
  id: string;
  name: string;
  startWeek: number;
  durationWeeks: number;
  isCritical: boolean;
  notes: string;
  savedWeeks?: number;
  overrunWeeks?: number;
}

export default function GanttScheduleViewer({
  promisedWeeks,
  delayDays,
  requiredWeeks = 10,
}: GanttScheduleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [zoom, setZoom] = useState(1.0);
  const [activeTask, setActiveTask] = useState<{
    task: GanttTask;
    section: "baseline" | "saved" | "overrun";
  } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const targetW = requiredWeeks && requiredWeeks > 0 ? requiredWeeks : 10;
  const hasInference = promisedWeeks != null || delayDays != null;

  const vendorW = promisedWeeks != null
    ? promisedWeeks
    : delayDays != null
    ? targetW + Math.ceil(delayDays / 7)
    : null;

  const floatDays = vendorW != null ? (targetW - vendorW) * 7 : delayDays != null ? -delayDays : 0;
  const isLate = floatDays < 0;
  const isEarly = floatDays > 0;

  const displayVendorW = vendorW ?? targetW;
  // +1 for W0, +3 buffer columns so the last label isn't clipped
  const totalCols = Math.max(displayVendorW, targetW) + 3;

  // Auto-fit scale: fills container width at zoom=1, zoom adjusts density
  const baseScale = (containerWidth / totalCols) * zoom;

  // Dynamic week label stride: skip labels when density gets too tight
  // Show every N weeks where N is the smallest power-of-2 that keeps labels >= 28px apart
  const labelStride = (() => {
    for (const n of [1, 2, 4, 5, 10]) {
      if (baseScale * n >= 28) return n;
    }
    return 10;
  })();

  // Measure container width on mount and resize
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Non-passive wheel: zoom week density, viewport scrolls natively when zoomed out
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 0.12 : -0.12;
      setZoom((prev) => Math.max(0.5, Math.min(3.0, prev + factor)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const tasks: GanttTask[] = [
    {
      id: "req",
      name: "Contract Target",
      startWeek: 0,
      durationWeeks: targetW,
      isCritical: false,
      notes: `Contract Required Deadline: Week ${targetW} (${targetW * 7} Days required window).`,
    },
  ];

  if (vendorW != null) {
    const saved = isEarly ? targetW - vendorW : 0;
    const overrun = isLate ? vendorW - targetW : 0;
    tasks.push({
      id: "vendor",
      name: "Vendor Schedule",
      startWeek: 0,
      durationWeeks: Math.min(vendorW, targetW),
      savedWeeks: saved,
      overrunWeeks: overrun,
      isCritical: isLate,
      notes: isEarly
        ? `Vendor Delivery: Week ${vendorW} — Arrives ${saved} Weeks (${saved * 7} Days) ahead of target.`
        : isLate
        ? `Vendor Delivery: Week ${vendorW} — Overruns target by ${overrun} Weeks (+${overrun * 7} Days).`
        : `Vendor Delivery: Week ${vendorW} — On-time, meets target milestone exactly.`,
    });
  }

  return (
    <div className={`relative rounded-2xl border bg-surface p-4 sm:p-5 shadow-xs space-y-3.5 ${
      isLate ? "border-rose/40" : "border-amber/40"
    }`}>
      {/* Header with Title & Standardized Compliance Corner Badge */}
      <div className="flex items-center justify-between border-b border-line/40 pb-2.5 min-w-0 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`ui-label font-extrabold truncate ${isLate ? "text-rose" : "text-amber"}`}>Schedule &amp; Delivery</span>
          <div
            className="relative shrink-0"
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
          >
            <button
              type="button"
              className="rounded-full text-text/40 hover:text-amber p-0.5 transition-colors"
              aria-label="Gantt Controls Help"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
            {showHelp && (
              <div className="absolute left-0 top-full mt-1.5 z-[999] w-48 rounded-xl border border-line bg-card p-3 shadow-2xl text-[11px] font-mono space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <p className="font-sans font-bold text-text border-b border-line pb-1">Gantt Controls</p>
                <div className="space-y-1 text-text/80">
                  <p>• <span className="text-amber font-bold">Scroll</span>: Zoom density</p>
                  <p>• <span className="text-amber font-bold">Hover Bar</span>: Task details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold border shadow-xs shrink-0 ${
          !hasInference
            ? "border-amber/40 bg-amber/15 text-amber"
            : isLate
            ? "border-rose/30 bg-rose/15 text-rose"
            : "border-emerald/30 bg-emerald/15 text-emerald"
        }`}>
          {!hasInference
            ? "⚠ Unstated in Document"
            : isLate
            ? "✕ Non-Compliant"
            : "✓ Compliant"}
        </span>
      </div>

      {/* Gantt Viewport — native overflow-x-auto scrolls when zoomed beyond fit */}
      <div
        ref={containerRef}
        className="rounded-xl border border-amber/30 bg-inset p-3.5 shadow-xs overflow-x-auto select-none relative"
      >
        {/* trackRef measures available inner width for auto-fit scale */}
        <div ref={trackRef} className="w-full">
          <div
            className="relative"
            style={{ width: `${totalCols * baseScale}px`, minWidth: "100%" }}
          >
            {/* Time Grid Axis Header */}
            <div className="flex text-[10px] font-mono text-text/60 border-b border-line/60 pb-1.5 font-bold">
              {Array.from({ length: totalCols }).map((_, i) => (
                <div
                  key={i}
                  className={`shrink-0 border-l border-line/30 pl-0.5 ${
                    i === targetW
                      ? "text-cyan font-bold"
                      : vendorW != null && i === vendorW
                      ? isLate
                        ? "text-rose font-bold"
                        : "text-emerald font-bold"
                      : ""
                  }`}
                  style={{ width: `${baseScale}px` }}
                >
                  {/* Only render label text when within stride — always show milestone weeks */}
                  {(i % labelStride === 0 || i === targetW || i === vendorW)
                    ? `W${i}`
                    : null}
                </div>
              ))}
            </div>

            {/* Vertical Contract Milestone Line */}
            <div
              className="absolute top-5 bottom-0 border-l-2 border-dashed border-cyan z-20 pointer-events-none"
              style={{ left: `${targetW * baseScale}px` }}
            />

            {/* Task Rows */}
            <div className="space-y-3 pt-3">
              {tasks.map((task) => (
                <div key={task.id} className="space-y-1 relative">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-text/75 font-semibold">{task.name}</span>
                    <span className="font-bold text-text/55">
                      {task.id === "req"
                        ? `W0 → W${targetW}`
                        : `W0 → W${displayVendorW}`}
                    </span>
                  </div>

                  <div className="h-4 rounded-md bg-card border border-line/30 relative flex items-center">
                    {/* Baseline bar (task.id="req" renders solid cyan; vendor renders amber/emerald up to min(vendor,target)) */}
                    <div
                      onMouseEnter={() => setActiveTask({ task, section: "baseline" })}
                      onMouseLeave={() => setActiveTask(null)}
                      className={
                        task.id === "req"
                          ? "h-full rounded-md bg-cyan/40 border border-cyan/60"
                          : isLate
                          ? "h-full rounded-l-md bg-amber/60 border-y border-l border-amber"
                          : "h-full rounded-md bg-emerald/60 border border-emerald"
                      }
                      style={{ width: `${task.durationWeeks * baseScale}px` }}
                    />

                    {/* Translucent Green: Early Buffer (vendorW → targetW) */}
                    {task.savedWeeks && task.savedWeeks > 0 ? (
                      <div
                        onMouseEnter={() => setActiveTask({ task, section: "saved" })}
                        onMouseLeave={() => setActiveTask(null)}
                        className="h-full bg-emerald/20 border-y border-r border-dashed border-emerald/60 rounded-r-md cursor-pointer"
                        style={{ width: `${task.savedWeeks * baseScale}px` }}
                      />
                    ) : null}

                    {/* Translucent Rose: Overrun Delay (targetW → vendorW) */}
                    {task.overrunWeeks && task.overrunWeeks > 0 ? (
                      <div
                        onMouseEnter={() => setActiveTask({ task, section: "overrun" })}
                        onMouseLeave={() => setActiveTask(null)}
                        className="h-full bg-rose/35 border-y border-r border-dashed border-rose/75 rounded-r-md animate-pulse cursor-pointer"
                        style={{ width: `${task.overrunWeeks * baseScale}px` }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Float & Delay Metric Summary */}
      <div className="flex items-center justify-between rounded-xl border border-line/40 bg-inset p-3 text-xs font-mono w-full">
        <span className="font-sans font-semibold text-text/80 text-[11px] truncate">
          Schedule Delivery Margin
        </span>
        <span className={`font-bold shrink-0 ml-2 ${!hasInference ? "text-text/60" : isLate ? "text-rose" : "text-emerald"}`}>
          {!hasInference
            ? "Pending Extraction"
            : isEarly
            ? `+${floatDays} Days Float (Ahead)`
            : isLate
            ? `-${Math.abs(floatDays)} Days Delay (Overrun)`
            : "On Schedule (0 Days Float)"}
        </span>
      </div>

      {/* Hover Inspector Card */}
      {activeTask && (
        <div className="rounded-xl border border-amber/30 bg-card p-3 shadow-xs text-xs font-mono space-y-1.5 animate-in fade-in duration-150">
          <div className="flex justify-between items-center border-b border-line/40 pb-1">
            <span className="font-bold text-text">{activeTask.task.name}</span>
            <span className={
              activeTask.section === "overrun" ? "text-rose font-bold"
              : activeTask.section === "saved" ? "text-emerald font-bold"
              : "text-cyan font-bold"
            }>
              {activeTask.section === "overrun"
                ? `Critical Overrun (+${activeTask.task.overrunWeeks! * 7} Days)`
                : activeTask.section === "saved"
                ? `Early Buffer (+${activeTask.task.savedWeeks! * 7} Days)`
                : "Target Baseline"}
            </span>
          </div>

          <div className="text-[12px] font-bold">
            {isLate ? (
              <span>W0 → W{targetW} <span className="text-rose">→ W{displayVendorW} (+{Math.abs(floatDays)} Days Overrun)</span></span>
            ) : isEarly ? (
              <span>W0 → W{displayVendorW} <span className="text-emerald">→ W{targetW} (+{floatDays} Days Early)</span></span>
            ) : (
              <span>W0 → W{targetW} <span className="text-cyan">(On Schedule)</span></span>
            )}
          </div>

          <p className="text-[11px] text-text/75 leading-relaxed pt-1 border-t border-line/30">
            {activeTask.task.notes}
          </p>
        </div>
      )}
    </div>
  );
}
