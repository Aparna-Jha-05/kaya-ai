"""Four deterministic patrols. Missing evidence produces a review flag, never a guess."""

import math
import re
from dataclasses import dataclass

from app.models.schemas import DocketScorecard, LifecycleMode, PatrolResult, SimulationRequest, SimulationResponse, VendorBidExtract
from app.services.integrity import bid_integrity_matrix

def exceeds(value: float, limit: float, abs_tol: float = 1e-9) -> bool:
    return value > limit and not math.isclose(value, limit, abs_tol=abs_tol)

def less_than(value: float, limit: float, abs_tol: float = 1e-9) -> bool:
    return value < limit and not math.isclose(value, limit, abs_tol=abs_tol)


@dataclass(frozen=True)
class ConstraintGraph:
    substation_limit_kw: float = 1200.0
    door_limit_m: float = 1.9
    carbon_cap_kgco2e: float = 450.0
    contractual_warranty_min_years: int = 5
    market_benchmark_inr: float = 50_000_000.0
    maximum_delivery_weeks: int = 12
    # Cooling-load energy balance: total imposed load must not exceed plant capacity
    cooling_plant_max_kw: float = 1100.0
    # Water system limits
    water_evap_cap_gpm: float | None = None
    # Structural floor tolerance
    floor_load_limit_kg_m2: float | None = None
    constraint_source: str = "local project configuration"
    constraint_version: int = 1


class PatrolEngineService:
    @classmethod
    def load_constraints_from_repository(cls, project_id: str = "PRJ-AMBER-01") -> ConstraintGraph:
        """Load constraints from Amber Project Graph API (if configured) or local repository snapshot."""
        from app.services.amber_graph import AmberProjectGraphService
        from app.services.repository import bid_repository

        live_amber = AmberProjectGraphService.fetch_live_constraints(project_id)

        record = bid_repository.get_current_constraints()
        if not record and not live_amber:
            raise RuntimeError("Site constraints are unavailable.")

        if live_amber:
            return ConstraintGraph(
                substation_limit_kw=live_amber.get("substation_limit_kw") or (record.max_substation_kw if record else 1200.0),
                door_limit_m=live_amber.get("door_limit_m") or (record.max_door_width_m if record else 1.9),
                carbon_cap_kgco2e=live_amber.get("carbon_cap_kgco2e") or (record.max_embodied_carbon_kg if record else 450.0),
                water_evap_cap_gpm=live_amber.get("water_evap_cap_gpm") or (record.max_water_evap_gpm if record else None),
                floor_load_limit_kg_m2=live_amber.get("floor_load_limit_kg_m2") or (record.max_floor_load_kg_m2 if record else None),
                constraint_source=live_amber.get("source", "Amber Live BIM"),
                constraint_version=record.version if record else 1,
            )

        return ConstraintGraph(
            substation_limit_kw=record.max_substation_kw,
            door_limit_m=record.max_door_width_m,
            carbon_cap_kgco2e=record.max_embodied_carbon_kg,
            water_evap_cap_gpm=record.max_water_evap_gpm,
            floor_load_limit_kg_m2=record.max_floor_load_kg_m2,
            constraint_source=f"v{record.version} by {record.actor}",
            constraint_version=record.version,
        )

    @staticmethod
    def _warranty_years(clauses: list[str]) -> int | None:
        for clause in clauses:
            match = re.search(r"warranty\s*:?\s*(\d+)\s*years?", clause, re.IGNORECASE)
            if match:
                return int(match.group(1))
        return None

    @staticmethod
    def simulate(request: SimulationRequest) -> SimulationResponse:
        capex = request.base_capex_inr * (1 - request.discount_percent / 100)
        penalty = request.delay_days * 200_000.0
        tco2 = capex + penalty + request.opex_carbon_5yr_inr
        return SimulationResponse(adjusted_capex_inr=capex, delay_penalty_inr=penalty, calculated_tco2_inr=tco2,
            recommendation="REJECT" if request.delay_days > 5 or tco2 > 61_000_000 else "RECOMMENDED", lifecycle_mode=request.lifecycle_mode)

    @classmethod
    def run_all_patrols(cls, bid: VendorBidExtract, graph: ConstraintGraph | None = None) -> DocketScorecard:
        """Run all four patrols against a bid.

        If graph is not provided, loads the current constraints from the repository.
        """
        if graph is None:
            graph = cls.load_constraints_from_repository()
        equipment, results = bid.equipment, []
        warranty = cls._warranty_years(bid.extracted_clauses)

        # ── Patrol 1: Building Patrol ─────────────────────────────────────
        building_gaps = [name for name, value in (
            ("power draw", equipment.power_draw_kw),
            ("equipment width", equipment.width_m),
            ("warranty term", warranty),
        ) if value is None]
        building_breaches = []

        if equipment.power_draw_kw is not None and exceeds(equipment.power_draw_kw, graph.substation_limit_kw):
            building_breaches.append("power draw exceeds the substation limit")

        # Cooling-load energy balance: Q_load (cooling capacity) must not exceed Q_plant_max
        if equipment.cooling_capacity_kw is not None and exceeds(equipment.cooling_capacity_kw, graph.cooling_plant_max_kw):
            building_breaches.append(
                f"cooling capacity {equipment.cooling_capacity_kw:.0f} kW exceeds plant maximum "
                f"{graph.cooling_plant_max_kw:.0f} kW (Q_load ≤ Q_plant_max)"
            )

        if equipment.width_m is not None and exceeds(equipment.width_m, graph.door_limit_m):
            building_breaches.append("equipment width exceeds the access clearance")

        if warranty is not None and warranty < graph.contractual_warranty_min_years:
            building_breaches.append("warranty is below the contractual minimum")

        # Floor load structural tolerance check
        if graph.floor_load_limit_kg_m2 is not None:
            if equipment.floor_load_kg is None:
                building_gaps.append("floor load")
            elif exceeds(equipment.floor_load_kg, graph.floor_load_limit_kg_m2):
                building_breaches.append(
                    f"equipment floor load {equipment.floor_load_kg:.0f} kg exceeds structural "
                    f"tolerance {graph.floor_load_limit_kg_m2:.0f} kg/m²"
                )

        building_status = "FAIL" if building_breaches else "FLAG" if building_gaps else "PASS"
        results.append(PatrolResult(patrol_name="BUILDING_PATROL", status=building_status,
            reason=("; ".join(building_breaches).capitalize() + "." if building_breaches
                    else f"Review required: no extracted {', '.join(building_gaps)}." if building_gaps
                    else "Extracted dimensions and contractual warranty are within the approved constraint envelope."),
            rule_broken="CONSTRAINT_ENVELOPE_BREACH" if building_breaches else "INSUFFICIENT_EVIDENCE" if building_gaps else None,
            evidence={
                "power_draw_kw": equipment.power_draw_kw,
                "substation_limit_kw": graph.substation_limit_kw,
                "cooling_capacity_kw": equipment.cooling_capacity_kw,
                "cooling_plant_max_kw": graph.cooling_plant_max_kw,
                "width_m": equipment.width_m,
                "door_limit_m": graph.door_limit_m,
                "floor_load_kg": equipment.floor_load_kg,
                "floor_load_limit_kg_m2": graph.floor_load_limit_kg_m2,
                "warranty_years": warranty,
                "contractual_warranty_min_years": graph.contractual_warranty_min_years,
                "constraint_source": graph.constraint_source,
                "constraint_version": graph.constraint_version,
            }))

        # ── Patrol 2: Green Patrol ────────────────────────────────────────
        market_floor = graph.market_benchmark_inr * .8
        carbon_fail = equipment.embodied_carbon_factor is not None and exceeds(equipment.embodied_carbon_factor, graph.carbon_cap_kgco2e)
        price_flag = bid.bid_amount_inr is not None and less_than(bid.bid_amount_inr, market_floor)

        # Water evaporation capacity check
        water_fail = (
            graph.water_evap_cap_gpm is not None
            and equipment.water_evap_gpm is not None
            and exceeds(equipment.water_evap_gpm, graph.water_evap_cap_gpm)
        )
        water_gap = graph.water_evap_cap_gpm is not None and equipment.water_evap_gpm is None

        green_fails = []
        if carbon_fail:
            green_fails.append("embodied carbon exceeds the project cap")
        if water_fail:
            green_fails.append(
                f"water evaporation {equipment.water_evap_gpm:.1f} gpm exceeds site cap "
                f"{graph.water_evap_cap_gpm:.1f} gpm"
            )

        green_status = (
            "FAIL" if green_fails
            else "FLAG" if (equipment.embodied_carbon_factor is None or bid.bid_amount_inr is None or price_flag or water_gap)
            else "PASS"
        )
        if green_fails:
            green_reason = "; ".join(green_fails).capitalize() + "."
        elif equipment.embodied_carbon_factor is None or bid.bid_amount_inr is None or water_gap:
            green_reason = "Review required: carbon factor, bid amount, or water evaporation data was not extracted."
        elif price_flag:
            green_reason = "Bid is more than 20% below the market benchmark; validate the proposed specification."
        else:
            green_reason = "Carbon evidence, water usage, and market benchmark are within the configured envelope."

        results.append(PatrolResult(patrol_name="GREEN_PATROL", status=green_status, reason=green_reason,
            rule_broken=("LEED_CARBON_WATER_BREACH" if green_fails
                         else "INSUFFICIENT_EVIDENCE" if (equipment.embodied_carbon_factor is None or bid.bid_amount_inr is None or water_gap)
                         else "MARKET_BENCHMARK_ANOMALY" if price_flag else None),
            evidence={
                "embodied_carbon_factor": equipment.embodied_carbon_factor,
                "carbon_cap_kgco2e": graph.carbon_cap_kgco2e,
                "water_evap_gpm": equipment.water_evap_gpm,
                "water_evap_cap_gpm": graph.water_evap_cap_gpm,
                "market_benchmark_inr": graph.market_benchmark_inr,
                "minimum_expected_bid_inr": market_floor,
                "bid_amount_inr": bid.bid_amount_inr,
            }))

        # ── Patrol 3: Vice Squad ──────────────────────────────────────────
        aci, factors = 0, []
        if bid.has_osha_cert is False: aci, factors = aci + 40, factors + ["safety certificate is missing"]
        if warranty is not None and warranty < graph.contractual_warranty_min_years: aci, factors = aci + 25, factors + ["warranty is below the contract minimum"]
        if any("limitation of liability" in clause.casefold() for clause in bid.extracted_clauses): aci, factors = aci + 20, factors + ["liability limitation clause requires review"]
        correlations = bid_integrity_matrix.correlations(bid)
        if correlations: aci, factors = min(100, aci + 25), factors + ["metadata correlation requires human review"]
        vice_status = "FLAG" if factors or bid.has_osha_cert is None else "PASS"
        results.append(PatrolResult(patrol_name="VICE_SQUAD", status=vice_status, risk_score=min(10, 2 + (aci + 9) // 10),
            reason=f"Agreement Compliance Index: {aci}/100. " + ("; ".join(factors).capitalize() + "." if factors else "No deterministic integrity correlation was found."),
            rule_broken="AGREEMENT_OR_INTEGRITY_REVIEW" if factors else "INSUFFICIENT_EVIDENCE" if bid.has_osha_cert is None else None,
            evidence={"agreement_compliance_index": aci, "bid_integrity_signals": correlations, "predictive_reliability_index": max(0, 100 - aci - min(10, 2 + (aci + 9) // 10) * 3)}))

        # ── Patrol 4: Traffic Control ─────────────────────────────────────
        from app.services.mcp_planner import MCPPlannerService

        mcp_analysis = MCPPlannerService.analyze_schedule_exposure(
            bid.promised_delivery_weeks, graph.maximum_delivery_weeks
        )
        delay_days = mcp_analysis.get("delay_days")
        simulation = cls.simulate(SimulationRequest(base_capex_inr=bid.bid_amount_inr or 0.01, delay_days=delay_days or 0, lifecycle_mode=bid.lifecycle_mode)) if bid.bid_amount_inr is not None else None
        post_award = bid.lifecycle_mode == LifecycleMode.POST_AWARD
        traffic_status = "FLAG" if post_award or delay_days is None or (delay_days > 5) else "PASS"
        results.append(PatrolResult(patrol_name="TRAFFIC_CONTROL", status=traffic_status,
            reason="Compliance Drift Report: rerun all patrols before accepting a post-award specification change." if post_award else "Review required: delivery commitment was not extracted." if delay_days is None else f"Float-aware schedule exposure is {delay_days} days.",
            rule_broken="DYNAMIC_REVALIDATION_TRIGGER" if post_award else "INSUFFICIENT_EVIDENCE" if delay_days is None else None,
            evidence={
                "delay_days": delay_days,
                "delay_penalty_inr": simulation.delay_penalty_inr if simulation else None,
                "calculated_tco2_inr": simulation.calculated_tco2_inr if simulation else None,
                "lifecycle_mode": bid.lifecycle_mode.value,
                "exposure_source": mcp_analysis.get("exposure_source"),
                "cpm_critical_path_impact": mcp_analysis.get("cpm_critical_path_impact"),
            }))

        failed = any(result.status == "FAIL" for result in results)
        has_review = any(result.status == "FLAG" for result in results)
        return DocketScorecard(bid_id=f"BID-{bid.vendor_id}", vendor_name=bid.vendor_name, upfront_capex_inr=bid.bid_amount_inr, patrol_results=results, calculated_tco2_inr=simulation.calculated_tco2_inr if simulation else None, recommendation="REJECT" if failed else "REVIEW_REQUIRED" if has_review else "RECOMMENDED", lifecycle_mode=bid.lifecycle_mode, compliance_drift_report={"triggered": True, "required_action": "Re-run all patrols and obtain human approval before the amendment is accepted."} if post_award else None)
