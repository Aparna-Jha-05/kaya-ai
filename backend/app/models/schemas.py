"""
PO-lice Pydantic Schemas
Data models for Extracted Bid JSON, Site Constraints, Patrol Scorecards, and TCO²
"""

from pydantic import BaseModel, Field
from typing import List, Optional

class EquipmentSpec(BaseModel):
    equipment_type: str = Field(..., description="e.g. Centrifugal Chiller")
    manufacturer: str = Field(..., description="e.g. CoolTech Global")
    model_number: str = Field(..., description="e.g. CTX-1400")
    power_draw_kw: float = Field(..., description="Power consumption in kW")
    cooling_capacity_kw: float = Field(..., description="Cooling capacity in kW")
    water_evap_gpm: Optional[float] = Field(None, description="Water usage in GPM")
    floor_load_kg: Optional[float] = Field(None, description="Total weight in kg")
    length_m: Optional[float] = Field(None, description="Extracted length in meters")
    width_m: Optional[float] = Field(None, description="Extracted width in meters")
    height_m: Optional[float] = Field(None, description="Extracted height in meters")
    embodied_carbon_factor: float = Field(..., description="kgCO2e per ton or unit")

class VendorBidExtract(BaseModel):
    vendor_id: str
    vendor_name: str
    bid_amount_inr: float
    promised_delivery_weeks: int
    has_osha_cert: bool
    equipment: EquipmentSpec

class PatrolResult(BaseModel):
    patrol_name: str  # BUILDING, GREEN, VICE, TRAFFIC
    status: str       # PASS, FAIL, FLAG
    risk_score: Optional[int] = None
    reason: str
    rule_broken: Optional[str] = None
    evidence: Optional[dict] = None

class DocketScorecard(BaseModel):
    bid_id: str
    vendor_name: str
    upfront_capex_inr: float
    patrol_results: List[PatrolResult]
    calculated_tco2_inr: float
    recommendation: str  # RECOMMENDED, ACCEPTABLE, REJECT
