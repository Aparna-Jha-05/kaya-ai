"""Strict, validated boundary models for PO-LICE's deterministic workflow."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LifecycleMode(str, Enum):
    PRE_AWARD = "PRE_AWARD"
    POST_AWARD = "POST_AWARD"


class OfficerDecision(str, Enum):
    """Officer decision is independent of procurement lifecycle."""
    UNDECIDED = "UNDECIDED"
    AWARDED = "AWARDED"
    REJECTED = "REJECTED"
    RFI_PENDING = "RFI_PENDING"


class FactField(str, Enum):
    VENDOR_NAME = "vendor_name"
    MODEL_NUMBER = "equipment.model_number"
    BID_AMOUNT_INR = "bid_amount_inr"
    DELIVERY_WEEKS = "promised_delivery_weeks"
    OSHA_CERT = "has_osha_cert"
    POWER_DRAW_KW = "equipment.power_draw_kw"
    COOLING_CAPACITY_KW = "equipment.cooling_capacity_kw"
    WIDTH_M = "equipment.width_m"
    EMBODIED_CARBON = "equipment.embodied_carbon_factor"


class ExtractionProvider(str, Enum):
    DETERMINISTIC = "deterministic"
    OLLAMA = "ollama"
    GEMINI = "gemini"


CANONICAL_FACT_UNITS: dict[FactField, str | None] = {
    FactField.VENDOR_NAME: None,
    FactField.MODEL_NUMBER: None,
    FactField.BID_AMOUNT_INR: "INR",
    FactField.DELIVERY_WEEKS: "week",
    FactField.OSHA_CERT: None,
    FactField.POWER_DRAW_KW: "kW",
    FactField.COOLING_CAPACITY_KW: "kW",
    FactField.WIDTH_M: "m",
    FactField.EMBODIED_CARBON: "kgCO2e/ton",
}


class FactCandidate(StrictModel):
    field: FactField
    raw_value: str = Field(min_length=1, max_length=256)
    normalized_value: str | float | int | bool
    unit: Optional[str] = Field(default=None, max_length=32)
    source_excerpt: str = Field(min_length=1, max_length=1_000)
    page: Optional[int] = Field(default=None, ge=1, le=100_000)
    bbox: Optional[tuple[float, float, float, float]] = None
    extractor: str = Field(min_length=1, max_length=64)
    provider: ExtractionProvider
    model: str = Field(min_length=1, max_length=160)
    schema_version: str = Field(default="1.0", pattern=r"^\d+\.\d+$")
    latency_ms: float = Field(default=0, ge=0, le=3_600_000)
    validation_signals: List[str] = Field(default_factory=list, max_length=20)
    accepted: bool = False

    @model_validator(mode="after")
    def validate_unit_and_bbox(self) -> "FactCandidate":
        expected_unit = CANONICAL_FACT_UNITS[self.field]
        if self.unit != expected_unit:
            raise ValueError(f"{self.field.value} requires canonical unit {expected_unit!r}")
        if self.bbox:
            x0, y0, x1, y1 = self.bbox
            if x1 < x0 or y1 < y0:
                raise ValueError("bbox must use [x0, y0, x1, y1] ordering")
        return self


class ProviderExtractionResponse(StrictModel):
    candidates: List[FactCandidate] = Field(default_factory=list, max_length=30)


class ExtractionIssue(StrictModel):
    code: str = Field(min_length=2, max_length=64)
    message: str = Field(min_length=2, max_length=500)
    field: Optional[FactField] = None
    provider: Optional[ExtractionProvider] = None


class RemoteDisclosure(StrictModel):
    project_id: str = Field(min_length=1, max_length=128)
    provider: ExtractionProvider
    model: str = Field(min_length=1, max_length=160)
    fields: List[FactField] = Field(default_factory=list, max_length=30)
    timestamp: str = Field(min_length=1, max_length=64)


class ExtractionReport(StrictModel):
    schema_version: str = Field(default="1.0", pattern=r"^\d+\.\d+$")
    selected: Dict[str, FactCandidate] = Field(default_factory=dict)
    candidates: List[FactCandidate] = Field(default_factory=list, max_length=100)
    issues: List[ExtractionIssue] = Field(default_factory=list, max_length=100)
    providers_attempted: List[ExtractionProvider] = Field(default_factory=list, max_length=10)
    remote_disclosures: List[RemoteDisclosure] = Field(default_factory=list, max_length=10)


class EquipmentSpec(StrictModel):
    equipment_type: str = Field(min_length=2, max_length=120)
    manufacturer: str = Field(min_length=2, max_length=160)
    model_number: str = Field(min_length=1, max_length=120)
    power_draw_kw: Optional[float] = Field(default=None, ge=0, le=100_000)
    cooling_capacity_kw: Optional[float] = Field(default=None, ge=0, le=100_000)
    water_evap_gpm: Optional[float] = Field(default=None, ge=0, le=100_000)
    floor_load_kg: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    length_m: Optional[float] = Field(default=None, ge=0, le=1_000)
    width_m: Optional[float] = Field(default=None, ge=0, le=1_000)
    height_m: Optional[float] = Field(default=None, ge=0, le=1_000)
    embodied_carbon_factor: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    material_type: str = Field(default="steel", min_length=2, max_length=64)


class DocumentMetadata(StrictModel):
    author: Optional[str] = Field(default=None, max_length=256)
    creation_date: Optional[str] = Field(default=None, max_length=64)
    creator_tool: Optional[str] = Field(default=None, max_length=256)


class VendorBidExtract(StrictModel):
    vendor_id: str = Field(min_length=3, max_length=128)
    vendor_name: str = Field(min_length=2, max_length=160)
    bid_amount_inr: Optional[float] = Field(default=None, ge=0, le=10**13)
    promised_delivery_weeks: Optional[int] = Field(default=None, ge=0, le=520)
    has_osha_cert: Optional[bool] = None
    equipment: EquipmentSpec
    submission_ip: Optional[str] = Field(default=None, max_length=45)
    pdf_fingerprint: Optional[str] = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    bank_account: Optional[str] = Field(default=None, max_length=128)
    extracted_clauses: List[str] = Field(default_factory=list, max_length=50)
    document_metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)
    lifecycle_mode: LifecycleMode = LifecycleMode.PRE_AWARD
    extraction_report: ExtractionReport = Field(default_factory=ExtractionReport)

    @field_validator("extracted_clauses")
    @classmethod
    def bound_clause_length(cls, clauses: List[str]) -> List[str]:
        return [clause[:500] for clause in clauses]


class PatrolResult(StrictModel):
    patrol_name: str
    status: str
    risk_score: Optional[int] = Field(default=None, ge=1, le=10)
    reason: str = Field(min_length=1, max_length=1_000)
    rule_broken: Optional[str] = Field(default=None, max_length=128)
    evidence: Optional[Dict[str, Any]] = None


class DocketScorecard(StrictModel):
    bid_id: str
    vendor_name: str
    upfront_capex_inr: Optional[float] = None
    patrol_results: List[PatrolResult]
    calculated_tco2_inr: Optional[float] = None
    recommendation: str
    lifecycle_mode: LifecycleMode = LifecycleMode.PRE_AWARD
    compliance_drift_report: Optional[Dict[str, Any]] = None


class BidRecord(StrictModel):
    id: str
    filename: str
    submitted_at: str
    source: VendorBidExtract
    scorecard: DocketScorecard
    officer_decision: OfficerDecision = OfficerDecision.UNDECIDED
    version: int = 1


class ActivityEvent(StrictModel):
    id: str
    bid_id: str
    timestamp: str
    check_name: str
    action: str
    rule: str
    evidence: str


class ReviewerActionRequest(StrictModel):
    action: str = Field(pattern="^(RFI_DRAFT_APPROVED|REVIEWED_DO_NOT_SELECT|REVIEWED_READY_FOR_DECISION)$")
    note: str = Field(min_length=3, max_length=2_000)


# --- Officer decision update (separate from ReviewerActionRequest) ---

class OfficerDecisionRequest(StrictModel):
    """Request to change the officer decision on a bid.
    Requires expected_version for optimistic concurrency."""
    decision: OfficerDecision
    expected_version: int = Field(ge=1)
    actor: str = Field(default="OFFICER", min_length=2, max_length=64)
    reason: str = Field(min_length=3, max_length=2_000)


# --- RFI models ---

class RFIDraft(StrictModel):
    """A persisted RFI draft with protected facts."""
    rfi_id: str
    bid_id: str
    vendor_name: str
    status: str = "DRAFT"
    human_reviewed: bool = False
    rfi_text: str
    protected_facts: Dict[str, Any]
    created_at: str


class RFIApprovalRequest(StrictModel):
    """Approve a persisted RFI draft. Approval is a separate action from generation."""
    actor: str = Field(default="OFFICER", min_length=2, max_length=64)
    note: str = Field(default="Approved for dispatch", min_length=3, max_length=2_000)


# --- Site constraint models ---

class SiteConstraintRecord(StrictModel):
    """A versioned site constraint snapshot."""
    id: str
    project_id: str = "PRJ-AMBER-01"
    version: int
    is_current: bool = True
    max_substation_kw: float
    max_door_width_m: float
    max_embodied_carbon_kg: float
    actor: str = "SYSTEM"
    reason: str = "Initial baseline"
    created_at: str


class ConstraintUpdateRequest(StrictModel):
    """Update site constraints with optimistic concurrency."""
    expected_version: int = Field(ge=1)
    max_substation_kw: float = Field(gt=0)
    max_door_width_m: float = Field(gt=0)
    max_embodied_carbon_kg: float = Field(gt=0)
    actor: str = Field(default="OFFICER_ADMIN", min_length=2, max_length=64)
    reason: str = Field(default="Updated site operational requirements", min_length=3, max_length=2_000)


class SimulationRequest(StrictModel):
    """Scenario inputs only; no compliance outcome can be supplied by a client."""
    base_capex_inr: float = Field(gt=0, le=10**13)
    discount_percent: float = Field(0, ge=0, le=50)
    delay_days: int = Field(0, ge=0, le=365)
    opex_carbon_5yr_inr: float = Field(27_600_000, ge=0, le=10**13)
    lifecycle_mode: LifecycleMode = LifecycleMode.PRE_AWARD


class SimulationResponse(StrictModel):
    adjusted_capex_inr: float
    delay_penalty_inr: float
    calculated_tco2_inr: float
    recommendation: str
    lifecycle_mode: LifecycleMode
