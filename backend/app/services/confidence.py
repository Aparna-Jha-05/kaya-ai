"""Stage S6: Candidate Confidence Scoring & Reviewer Threshold Gate Service."""

from __future__ import annotations

import logging
from typing import List, Tuple

from app.models.schemas import ExtractionProvider, FactCandidate, ExtractionReport

logger = logging.getLogger(__name__)

# Reviewer Threshold: Candidates with confidence below 0.85 require human verification
HUMAN_REVIEW_THRESHOLD: float = 0.85


class ConfidenceScoringService:
    """Stage S6 Confidence Scoring Service evaluating extraction candidate probabilities and threshold gates."""

    @classmethod
    def evaluate_candidate_confidence(cls, candidate: FactCandidate, document_text: str = "") -> FactCandidate:
        """Calculate numerical confidence float (0.0 to 1.0) and enforce review threshold gate."""
        base_confidence = 1.0

        # Provider Quality Prior
        if candidate.provider == ExtractionProvider.DETERMINISTIC:
            base_confidence = 0.98 if "table" in candidate.extractor.lower() else 1.00
        elif candidate.provider == ExtractionProvider.OLLAMA:
            base_confidence = 0.84 if "fallback" in candidate.model.lower() else 0.90
        elif candidate.provider == ExtractionProvider.GEMINI:
            base_confidence = 0.88
        else:
            base_confidence = 0.85

        # Penalties for unverified or missing excerpts
        penalty = 0.0
        if document_text and candidate.source_excerpt:
            excerpt_clean = " ".join(candidate.source_excerpt.casefold().split())
            text_clean = " ".join(document_text.casefold().split())
            if excerpt_clean not in text_clean:
                penalty += 0.12

        if not candidate.bbox:
            penalty += 0.04

        final_confidence = round(max(0.0, min(1.0, base_confidence - penalty)), 2)

        signals = list(candidate.validation_signals)
        is_accepted = candidate.accepted

        # Stage S6 Reviewer Intercept Threshold Gate (< 0.85)
        if final_confidence < HUMAN_REVIEW_THRESHOLD:
            if "LOW_CONFIDENCE_FACT" not in signals:
                signals.append("LOW_CONFIDENCE_FACT")
            if "HUMAN_REVIEW_REQUIRED" not in signals:
                signals.append("HUMAN_REVIEW_REQUIRED")

        return candidate.model_copy(
            update={
                "confidence": final_confidence,
                "validation_signals": signals,
                "accepted": is_accepted,
            }
        )

    @classmethod
    def score_report_candidates(
        cls, report: ExtractionReport, document_text: str = ""
    ) -> Tuple[ExtractionReport, bool]:
        """Score all candidates in ExtractionReport and return updated report and low-confidence flag."""
        scored_candidates: List[FactCandidate] = []
        has_low_confidence = False

        for candidate in report.candidates:
            scored = cls.evaluate_candidate_confidence(candidate, document_text)
            scored_candidates.append(scored)
            if scored.confidence < HUMAN_REVIEW_THRESHOLD:
                has_low_confidence = True

        updated_selected = {
            field: cls.evaluate_candidate_confidence(cand, document_text)
            for field, cand in report.selected.items()
        }

        updated_report = report.model_copy(
            update={
                "candidates": scored_candidates,
                "selected": updated_selected,
            }
        )

        return updated_report, has_low_confidence
