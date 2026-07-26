"""Four deterministic patrols. Missing evidence produces a review flag, never a guess."""

import re
from dataclasses import dataclass

from app.models.schemas import DocketScorecard, LifecycleMode, PatrolResult, SimulationRequest, SimulationResponse, VendorBidExtract
from app.services.integrity import bid_integrity_matrix


@dataclass(frozen=True)
class ConstraintGraph:
    substation_limit_kw: float = 1200.0
    door_limit_m: float = 1.9
    carbon_cap_kgco2e: float = 450.0
    contractual_warranty_min_years: int = 5
    market_benchmark_inr: float = 50_000_000.0
    maximum_delivery_weeks: int = 12
    constraint_source: str = "local project configuration"
    constraint_version: int = 1


class PatrolEngineService:
    # Default graph used when no persisted constraints are available.
    _default_graph = ConstraintGraph()

    @classmethod
    def load_constraints_from_repository(cls) -> ConstraintGraph:
        """Load the current constraints from the repository.

        Falls back to the default ConstraintGraph if the repository
        does not have persisted constraints.
        """
        try:
            from app.services.repository import bid_repository
            record = bid_repository.get_current_constraints()
            if record:
                return ConstraintGraph(
                    substation_limit_kw=record.max_substation_kw,
                    door_limit_m=record.max_door_width_m,
                    carbon_cap_kgco2e=record.max_embodied_carbon_kg,
                    constraint_source=f"v{record.version} by {record.actor}",
                    constraint_version=record.version,
                )
        except Exception:
            pass
        return cls._default_graph

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
        building_gaps = [name for name, value in (("power draw", equipment.power_draw_kw), ("equipment width", equipment.width_m), ("warranty term", warranty)) if value is None]
        building_breaches = []
        if equipment.power_draw_kw is not None and equipment.power_draw_kw > graph.substation_limit_kw: building_breaches.append("power draw exceeds the substation limit")
        if equipment.width_m is not None and equipment.width_m > graph.door_limit_m: building_breaches.append("equipment width exceeds the access clearance")
        if warranty is not None and warranty < graph.contractual_warranty_min_years: building_breaches.append("warranty is below the contractual minimum")
        building_status = "FAIL" if building_breaches else "FLAG" if building_gaps else "PASS"
        results.append(PatrolResult(patrol_name="BUILDING_PATROL", status=building_status,
            reason=("; ".join(building_breaches).capitalize() + "." if building_breaches else f"Review required: no extracted {', '.join(building_gaps)}." if building_gaps else "Extracted dimensions and contractual warranty are within the approved constraint envelope."),
            rule_broken="CONSTRAINT_ENVELOPE_BREACH" if building_breaches else "INSUFFICIENT_EVIDENCE" if building_gaps else None,
            evidence={"power_draw_kw": equipment.power_draw_kw, "substation_limit_kw": graph.substation_limit_kw, "width_m": equipment.width_m, "door_limit_m": graph.door_limit_m, "warranty_years": warranty, "contractual_warranty_min_years": graph.contractual_warranty_min_years, "constraint_source": graph.constraint_source, "constraint_version": graph.constraint_version}))

        market_floor = graph.market_benchmark_inr * .8
        carbon_fail = equipment.embodied_carbon_factor is not None and equipment.embodied_carbon_factor > graph.carbon_cap_kgco2e
        price_flag = bid.bid_amount_inr is not None and bid.bid_amount_inr < market_floor
        green_status = "FAIL" if carbon_fail else "FLAG" if equipment.embodied_carbon_factor is None or bid.bid_amount_inr is None or price_flag else "PASS"
        green_reason = ("Embodied carbon exceeds the project cap." if carbon_fail else "Review required: carbon factor or bid amount was not extracted." if equipment.embodied_carbon_factor is None or bid.bid_amount_inr is None else "Bid is more than 20% below the market benchmark; validate the proposed specification." if price_flag else "Carbon evidence and market benchmark are within the configured envelope.")
        results.append(PatrolResult(patrol_name="GREEN_PATROL", status=green_status, reason=green_reason,
            rule_broken="LEED_CARBON_FACTOR_BREACH" if carbon_fail else "INSUFFICIENT_EVIDENCE" if equipment.embodied_carbon_factor is None or bid.bid_amount_inr is None else "MARKET_BENCHMARK_ANOMALY" if price_flag else None,
            evidence={"embodied_carbon_factor": equipment.embodied_carbon_factor, "carbon_cap_kgco2e": graph.carbon_cap_kgco2e, "market_benchmark_inr": graph.market_benchmark_inr, "minimum_expected_bid_inr": market_floor, "bid_amount_inr": bid.bid_amount_inr}))

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

        delay_days = max(0, (bid.promised_delivery_weeks - graph.maximum_delivery_weeks) * 7) if bid.promised_delivery_weeks is not None else None
        simulation = cls.simulate(SimulationRequest(base_capex_inr=bid.bid_amount_inr or 0.01, delay_days=delay_days or 0, lifecycle_mode=bid.lifecycle_mode)) if bid.bid_amount_inr is not None else None
        post_award = bid.lifecycle_mode == LifecycleMode.POST_AWARD
        traffic_status = "FLAG" if post_award or delay_days is None or (delay_days > 5) else "PASS"
        results.append(PatrolResult(patrol_name="TRAFFIC_CONTROL", status=traffic_status,
            reason="Compliance Drift Report: rerun all patrols before accepting a post-award specification change." if post_award else "Review required: delivery commitment was not extracted." if delay_days is None else f"Float-aware schedule exposure is {delay_days} days.",
            rule_broken="DYNAMIC_REVALIDATION_TRIGGER" if post_award else "INSUFFICIENT_EVIDENCE" if delay_days is None else None,
            evidence={"delay_days": delay_days, "delay_penalty_inr": simulation.delay_penalty_inr if simulation else None, "calculated_tco2_inr": simulation.calculated_tco2_inr if simulation else None, "lifecycle_mode": bid.lifecycle_mode.value}))

        bid_integrity_matrix.record(bid)
        failed = any(result.status == "FAIL" for result in results)
        has_review = any(result.status == "FLAG" for result in results)
        return DocketScorecard(bid_id=f"BID-{bid.vendor_id}", vendor_name=bid.vendor_name, upfront_capex_inr=bid.bid_amount_inr, patrol_results=results, calculated_tco2_inr=simulation.calculated_tco2_inr if simulation else None, recommendation="REJECT" if failed else "REVIEW_REQUIRED" if has_review else "RECOMMENDED", lifecycle_mode=bid.lifecycle_mode, compliance_drift_report={"triggered": True, "required_action": "Re-run all patrols and obtain human approval before the amendment is accepted."} if post_award else None)
