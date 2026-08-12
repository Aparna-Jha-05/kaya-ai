"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export interface StepConfig {
  title: string;
  targetAttr: string;
  targetRoute: string;
  realUiTaskPrompt: string;
  preferredPlacement: "bottom" | "top" | "left" | "right" | "center";
}

export const TOUR_STEPS: StepConfig[] = [
  {
    targetAttr: "tour-upload-bid-page",
    targetRoute: "/",
    title: "Upload a Bid",
    realUiTaskPrompt: "Click 'Upload Bid' to start vendor compliance evaluation.",
    preferredPlacement: "bottom"
  },
  {
    targetAttr: "tour-dropzone",
    targetRoute: "/bids/new",
    title: "Submit Document",
    realUiTaskPrompt: "Select or drop a bid PDF document to process.",
    preferredPlacement: "bottom"
  },
  {
    targetAttr: "tour-patrol-checks",
    targetRoute: "/bids/BID-2026-0881",
    title: "Review Patrol Checks",
    realUiTaskPrompt: "Select 'Patrol Checks' to inspect compliance rule results.",
    preferredPlacement: "bottom"
  },
  {
    targetAttr: "tour-decision-submit",
    targetRoute: "/bids/BID-2026-0881",
    title: "Submit Decision",
    realUiTaskPrompt: "Record your officer decision for this submission.",
    preferredPlacement: "top"
  },
  {
    targetAttr: "tour-nav-dashboard",
    targetRoute: "/bids/BID-2026-0881",
    title: "Return to Dashboard",
    realUiTaskPrompt: "Click the PO-LICE logo to return to the main dashboard.",
    preferredPlacement: "bottom"
  }
];

interface TourContextType {
  isOpen: boolean;
  currentStep: number;
  startTour: (step?: number) => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
  advanceIfMatch: (targetAttr: string) => boolean;
  justAdvancedAt: number;
}

const TOTAL_STEPS = TOUR_STEPS.length;

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [justAdvancedAt, setJustAdvancedAt] = useState(0);
  const currentStepRef = useRef(currentStep);
  const isOpenRef = useRef(isOpen);

  currentStepRef.current = currentStep;
  isOpenRef.current = isOpen;

  const startTour = useCallback((step = 0) => {
    setCurrentStep(step);
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev < TOTAL_STEPS - 1 ? prev + 1 : prev));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setCurrentStep(step);
    }
  }, []);

  const advanceIfMatch = useCallback((targetAttr: string) => {
    if (!isOpenRef.current) return false;
    const stepConfig = TOUR_STEPS[currentStepRef.current];
    if (stepConfig && stepConfig.targetAttr === targetAttr) {
      setJustAdvancedAt(Date.now());
      setTimeout(() => {
        if (currentStepRef.current < TOTAL_STEPS - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          setIsOpen(false);
        }
      }, 650);
      return true;
    }
    return false;
  }, []);

  return (
    <TourContext.Provider
      value={{
        isOpen,
        currentStep,
        startTour,
        closeTour,
        nextStep,
        prevStep,
        goToStep,
        totalSteps: TOTAL_STEPS,
        advanceIfMatch,
        justAdvancedAt,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
