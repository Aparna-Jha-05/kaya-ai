"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { Compass, X, ExternalLink, CheckCircle2 } from "lucide-react";
import { useTour, TOUR_STEPS } from "./TourContext";

export default function GuidedTourModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, currentStep, closeTour, prevStep, totalSteps, justAdvancedAt } = useTour();
  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [actualPlacement, setActualPlacement] = useState<"top" | "bottom" | "left" | "right" | "center">("bottom");
  const [notFound, setNotFound] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

  const isBuffering = Date.now() - justAdvancedAt < 650 && justAdvancedAt > 0;
  const padding = 8;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const currentStepConfig = TOUR_STEPS[currentStep];
    if (!currentStepConfig) return;

    const el = document.querySelector(`[data-tour="${currentStepConfig.targetAttr}"]`);
    if (el) {
      setNotFound(false);
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      const cardRect = cardRef.current?.getBoundingClientRect();
      const cardWidth = cardRect?.width || 310;
      const cardHeight = cardRect?.height || 140;
      const margin = 14;

      let computedPlacement = currentStepConfig.preferredPlacement || "bottom";

      if (computedPlacement === "top" && rect.top - cardHeight - margin < 16) {
        computedPlacement = "bottom";
      } else if (computedPlacement === "bottom" && rect.bottom + cardHeight + margin > window.innerHeight - 16) {
        computedPlacement = "top";
      } else if (computedPlacement === "left" && rect.left - cardWidth - margin < 16) {
        computedPlacement = "right";
      } else if (computedPlacement === "right" && rect.right + cardWidth + margin > window.innerWidth - 16) {
        computedPlacement = "left";
      }

      setActualPlacement(computedPlacement);

      let top = rect.bottom + margin + padding;
      let left = rect.left + rect.width / 2 - cardWidth / 2;

      if (computedPlacement === "top") {
        top = rect.top - cardHeight - margin - padding;
      } else if (computedPlacement === "left") {
        left = rect.left - cardWidth - margin - padding;
        top = rect.top + rect.height / 2 - cardHeight / 2;
      } else if (computedPlacement === "right") {
        left = rect.right + margin + padding;
        top = rect.top + rect.height / 2 - cardHeight / 2;
      }

      if (left < 16) left = 16;
      if (left + cardWidth > window.innerWidth - 16) {
        left = window.innerWidth - cardWidth - 16;
      }
      if (top < 16) top = 16;
      if (top + cardHeight > window.innerHeight - 16) {
        top = window.innerHeight - cardHeight - 16;
      }

      setTooltipPos({ top, left });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    let notFoundTimer: NodeJS.Timeout;

    const check = () => {
      updateTargetRect();
      const currentStepConfig = TOUR_STEPS[currentStep];
      if (currentStepConfig) {
        const el = document.querySelector(`[data-tour="${currentStepConfig.targetAttr}"]`);
        if (!el) {
          notFoundTimer = setTimeout(() => {
            const recheck = document.querySelector(`[data-tour="${currentStepConfig.targetAttr}"]`);
            if (!recheck) {
              const isBidsMatch = pathname.startsWith("/bids/") && currentStepConfig.targetRoute.startsWith("/bids/");
              if (!isBidsMatch) setNotFound(true);
            }
          }, 1500);
        } else {
          setNotFound(false);
        }
      }
    };

    check();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateTargetRect();
      });
      resizeObserver.observe(document.body);
      if (cardRef.current) resizeObserver.observe(cardRef.current);
      const currentStepConfig = TOUR_STEPS[currentStep];
      if (currentStepConfig) {
        const el = document.querySelector(`[data-tour="${currentStepConfig.targetAttr}"]`);
        if (el) resizeObserver.observe(el);
      }
    }

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      clearTimeout(notFoundTimer);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [isOpen, currentStep, pathname, updateTargetRect]);

  useEffect(() => {
    if (isOpen && notFound && step?.targetRoute) {
      const isBidsMatch = pathname.startsWith("/bids/") && step.targetRoute.startsWith("/bids/");
      if (pathname !== step.targetRoute && !isBidsMatch) {
        router.push(step.targetRoute);
      }
    }
  }, [isOpen, notFound, step, pathname, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeTour();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, prevStep, closeTour]);

  if (!mounted || !isOpen || !tooltipPos) return null;

  const isTargetVisible = Boolean(targetRect && !notFound);

  let caretOffset = 16;
  if (targetRect && tooltipPos) {
    if (actualPlacement === "top" || actualPlacement === "bottom") {
      caretOffset = Math.max(20, Math.min(290, targetRect.left + targetRect.width / 2 - tooltipPos.left));
    } else {
      caretOffset = Math.max(20, Math.min(120, targetRect.top + targetRect.height / 2 - tooltipPos.top));
    }
  }

  const topMaskHeight = targetRect ? Math.max(0, targetRect.top - padding) : 0;
  const bottomMaskTop = targetRect ? targetRect.bottom + padding : "100%";
  const leftMaskWidth = targetRect ? Math.max(0, targetRect.left - padding) : 0;
  const rightMaskLeft = targetRect ? targetRect.right + padding : "100%";
  const targetMaskHeight = targetRect ? targetRect.height + padding * 2 : "100%";

  return createPortal(
    <div
      className={`fixed inset-0 z-[10000] overflow-hidden select-none pointer-events-none transition-opacity duration-200 ${
        isTargetVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: topMaskHeight,
        }}
        className="bg-black/65 backdrop-blur-xs pointer-events-auto transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      />
      <div
        style={{
          position: "absolute",
          top: bottomMaskTop,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        className="bg-black/65 backdrop-blur-xs pointer-events-auto transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      />
      <div
        style={{
          position: "absolute",
          top: topMaskHeight,
          height: targetMaskHeight,
          left: 0,
          width: leftMaskWidth,
        }}
        className="bg-black/65 backdrop-blur-xs pointer-events-auto transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      />
      <div
        style={{
          position: "absolute",
          top: topMaskHeight,
          height: targetMaskHeight,
          left: rightMaskLeft,
          right: 0,
        }}
        className="bg-black/65 backdrop-blur-xs pointer-events-auto transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      />

      <div
        ref={cardRef}
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          maxWidth: "calc(100vw - 32px)",
          width: 310
        }}
        className="z-[10002] rounded-3xl border-2 border-line bg-surface p-4 shadow-2xl backdrop-blur-md pointer-events-auto relative transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        {targetRect && (
          <div
            style={
              actualPlacement === "bottom"
                ? { left: caretOffset, top: -16 }
                : actualPlacement === "top"
                ? { left: caretOffset, bottom: -16 }
                : actualPlacement === "left"
                ? { top: caretOffset, right: -16 }
                : { top: caretOffset, left: -16 }
            }
            className={`absolute h-0 w-0 border-8 border-transparent transition-all duration-400 -translate-x-1/2 ${
              actualPlacement === "bottom"
                ? "border-b-surface border-b-[10px]"
                : actualPlacement === "top"
                ? "border-t-surface border-t-[10px]"
                : actualPlacement === "left"
                ? "border-l-surface border-l-[10px]"
                : "border-r-surface border-r-[10px]"
            }`}
          />
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan/15 border border-cyan/30 text-cyan shadow-xs">
              {isBuffering ? <CheckCircle2 className="h-4 w-4 animate-bounce text-cyan" /> : <Compass className="h-4 w-4" />}
            </span>
            <h3 className="text-xs font-extrabold text-text tracking-tight uppercase">
              Step {currentStep + 1}/{totalSteps} · {step.title}
            </h3>
          </div>
        </div>

        <div className="space-y-2 mb-2">
          <p className="text-xs font-semibold text-text leading-relaxed">
            {isBuffering ? "Action completed! Transitioning..." : step.realUiTaskPrompt}
          </p>

          {notFound && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber/15 border border-amber/30 p-2 text-xs text-amber font-medium">
              <span>Opening page...</span>
              <button
                onClick={() => router.push(step.targetRoute)}
                className="flex items-center gap-1 font-bold underline shrink-0 hover:text-amber/80"
              >
                Go Now <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-line">
          <button
            onClick={closeTour}
            className="flex items-center gap-1 text-[11px] font-bold text-text/40 hover:text-rose transition-colors"
          >
            <X className="h-3 w-3" /> Exit Tour
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
