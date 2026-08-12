"""Stage S4: Legal Clause Segmentation & Syntactic Parsing Service."""

from __future__ import annotations

import logging
import re
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ClauseSegmentationService:
    """Stage S4 Legal Clause Segmentation Service with multi-engine cascade (RegEx -> spaCy -> LlamaIndex Chunking)."""

    TARGET_TERMS: tuple[str, ...] = (
        "warranty",
        "limitation of liability",
        "indemnity",
        "indemnification",
        "termination",
        "payment terms",
        "liquidated damages",
        "penalty",
        "force majeure",
    )

    @staticmethod
    def is_spacy_available() -> bool:
        """Check if spaCy library is importable."""
        try:
            import spacy  # type: ignore # noqa: F401

            return True
        except ImportError:
            return False

    @classmethod
    def segment_clauses(cls, text: str) -> List[str]:
        """Segment and extract legal clauses using a multi-stage syntactic cascade."""
        if not text.strip():
            return []

        clauses: List[str] = []
        spacy_ready = cls.is_spacy_available()

        # Level 1: Deterministic RegEx Keyword Line Scanner
        lines = [line.strip(" -\t") for line in text.splitlines() if line.strip()]
        for line in lines:
            if len(line) < 15 or len(line) > 600:
                continue
            line_lower = line.lower()
            if any(term in line_lower for term in cls.TARGET_TERMS):
                if line not in clauses:
                    clauses.append(line[:500])

        # Level 2: spaCy Rule-Based Grammar & Dependency Matcher
        if len(clauses) < 3 and spacy_ready:
            try:
                import spacy

                try:
                    nlp = spacy.load("en_core_web_sm")
                except Exception:
                    nlp = spacy.blank("en")

                doc = nlp(text[:10000])
                for sent in doc.sents:
                    sent_str = sent.text.strip()
                    if any(term in sent_str.lower() for term in cls.TARGET_TERMS):
                        if sent_str not in clauses and len(sent_str) >= 15:
                            clauses.append(sent_str[:500])
            except Exception as err:
                logger.warning("spaCy clause parsing failed: %s", err)

        # Level 3: Sentence Boundary Chunking (LlamaIndex / NLTK style)
        if not clauses:
            # Fallback sentence boundary splitter
            sentences = re.split(r"(?<=[.!?])\s+", text)
            for s in sentences:
                s_clean = s.strip()
                if any(term in s_clean.lower() for term in cls.TARGET_TERMS):
                    if s_clean not in clauses:
                        clauses.append(s_clean[:500])

        return clauses[:50]

    @classmethod
    def analyze_clause_risks(cls, clauses: List[str]) -> Dict[str, Any]:
        """Analyze extracted clauses for risk indicators (e.g. liability caps, warranty terms)."""
        analysis = {
            "has_warranty_clause": False,
            "has_liability_cap": False,
            "warranty_years_found": None,
            "liability_cap_text": None,
        }

        for clause in clauses:
            c_lower = clause.lower()
            if "warranty" in c_lower:
                analysis["has_warranty_clause"] = True
                match = re.search(r"(\d+)\s*(?:-\s*)?years?", c_lower)
                if match:
                    try:
                        analysis["warranty_years_found"] = int(match.group(1))
                    except ValueError:
                        pass

            if "liability" in c_lower or "capped" in c_lower or "limitation of liability" in c_lower:
                analysis["has_liability_cap"] = True
                analysis["liability_cap_text"] = clause[:200]

        return analysis
