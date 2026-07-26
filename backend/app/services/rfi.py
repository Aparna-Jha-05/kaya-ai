"""RFI Synthesis Service

Generates evidence-bound operational Request For Information drafts from stored
FAIL/FLAG patrol findings. All drafts require human review before sending.

Generation and approval are separate actions:
- generate_rfi_draft() creates a DRAFT with protected facts
- Approval is handled by the repository's approve_rfi() method
"""

import json
import logging
from typing import Dict, Any

from app.models.schemas import DocketScorecard, RFIDraft

logger = logging.getLogger(__name__)


class RFIService:
    @staticmethod
    def render_rfi_text(docket: DocketScorecard) -> str:
        """Render deterministic, evidence-bound RFI text from patrol findings."""
        breaches = []
        evidence_citations = []

        for result in docket.patrol_results:
            if result.status in ("FAIL", "FLAG"):
                breaches.append(f"- [{result.patrol_name}] {result.reason}")
                if result.evidence:
                    for key, val in result.evidence.items():
                        if val is not None:
                            evidence_citations.append(f"  * {key}: {val}")

        breach_text = "\n".join(breaches) if breaches else "- No specific rule breaches detected."
        citations_text = "\n".join(evidence_citations) if evidence_citations else "  * Standard vendor specification review."

        return f"""REQUEST FOR INFORMATION (RFI) - COUNTER-SPECIFICATION NOTICE

DOCUMENT REF: RFI-{docket.bid_id}
VENDOR: {docket.vendor_name}
LIFECYCLE STATUS: {docket.lifecycle_mode.value if hasattr(docket.lifecycle_mode, 'value') else docket.lifecycle_mode}
REVIEW STATUS: REQUIRES_HUMAN_REVIEW

REASON FOR NOTICE:
Your submitted proposal has triggered automated compliance flags during engineering patrol validation:

IDENTIFIED DISCREPANCIES:
{breach_text}

FACTUAL EVIDENCE CITATIONS:
{citations_text}

REQUIRED VENDOR ACTION:
Please provide written technical clarification and updated engineering data sheets addressing the identified discrepancies within five (5) business days.

ISSUED BY: PO-LICE Automated Compliance System
NOTE: This draft requires human officer review and signature before official dispatch.
"""

    @staticmethod
    def extract_protected_facts(docket: DocketScorecard) -> Dict[str, Any]:
        """Extract the facts that must not be altered by editing."""
        return {
            "bid_id": docket.bid_id,
            "vendor_name": docket.vendor_name,
            "capex_inr": docket.upfront_capex_inr,
            "recommendation": docket.recommendation,
            "patrol_statuses": {
                result.patrol_name: result.status
                for result in docket.patrol_results
            },
        }

    @classmethod
    def generate_rfi_draft(cls, docket: DocketScorecard) -> Dict[str, Any]:
        """Generate RFI text and protected facts for persistence.

        This returns the data needed by the repository to persist.
        It does NOT persist or approve the draft itself.
        """
        rfi_text = cls.render_rfi_text(docket)
        protected_facts = cls.extract_protected_facts(docket)
        return {
            "rfi_text": rfi_text,
            "protected_facts": protected_facts,
            "vendor_name": docket.vendor_name,
            "bid_id": docket.bid_id,
        }

    @staticmethod
    def validate_edited_text(edited_text: str, protected_facts: Dict[str, Any]) -> list[str]:
        """Check that edited text has not altered protected facts.

        Returns a list of violation messages. Empty list means the edit is safe.
        """
        violations = []
        # The vendor name and bid_id must appear in the text
        vendor = protected_facts.get("vendor_name", "")
        if vendor and vendor not in edited_text:
            violations.append(f"Protected vendor name '{vendor}' was removed or altered.")
        bid_id = protected_facts.get("bid_id", "")
        if bid_id and bid_id not in edited_text:
            violations.append(f"Protected bid reference '{bid_id}' was removed or altered.")
        return violations
