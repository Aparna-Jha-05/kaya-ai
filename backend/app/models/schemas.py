"""Strict, validated boundary models for PO-LICE's deterministic workflow."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LifecycleMode(str, Enum):
    PRE_AWARD = "PRE_AWARD"
    POST_AWARD = "POST_AWARD"


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
