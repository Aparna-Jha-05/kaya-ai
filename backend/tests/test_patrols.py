"""Unit tests for deterministic Patrol Engine boundaries and evidence handling."""

import unittest
from app.models.schemas import EquipmentSpec, VendorBidExtract
from app.services.patrols import ConstraintGraph, PatrolEngineService


class TestPatrolEngineBoundaries(unittest.TestCase):
    def setUp(self):
        self.graph = ConstraintGraph(
            substation_limit_kw=1200.0,
            door_limit_m=1.9,
            carbon_cap_kgco2e=450.0,
            contractual_warranty_min_years=5,
            market_benchmark_inr=50_000_000.0,
            maximum_delivery_weeks=12,
        )

    def test_missing_patrol_evidence_produces_flag(self):
        """Missing evidence (e.g. None power_draw or width) MUST produce FLAG, never a guess or silent PASS."""
        bid = VendorBidExtract(
            vendor_id="VENDOR-TEST",
            vendor_name="Test Vendor",
            bid_amount_inr=50_000_000.0,
            promised_delivery_weeks=10,
            has_osha_cert=True,
            equipment=EquipmentSpec(
                equipment_type="Chiller",
                manufacturer="Test Vendor",
                model_number="MODEL-X",
                power_draw_kw=None,  # Missing evidence
                width_m=1.5,
                embodied_carbon_factor=400.0,
            ),
        )
        scorecard = PatrolEngineService.run_all_patrols(bid, graph=self.graph)
        building_patrol = next(p for p in scorecard.patrol_results if p.patrol_name == "BUILDING_PATROL")
        
        self.assertEqual(building_patrol.status, "FLAG")
        self.assertEqual(building_patrol.rule_broken, "INSUFFICIENT_EVIDENCE")
        self.assertIn("power draw", building_patrol.reason.lower())

    def test_exact_limit_boundaries_pass(self):
        """Values exactly at constraint limit must PASS."""
        bid = VendorBidExtract(
            vendor_id="VENDOR-EXACT",
            vendor_name="Exact Limit Vendor",
            bid_amount_inr=50_000_000.0,
            promised_delivery_weeks=12,  # exact max delivery
            has_osha_cert=True,
            extracted_clauses=["Warranty: 5 years"],  # exact min warranty
            equipment=EquipmentSpec(
                equipment_type="Chiller",
                manufacturer="Exact Vendor",
                model_number="EXACT-1",
                power_draw_kw=1200.0,  # exact max power
                width_m=1.9,          # exact max width
                embodied_carbon_factor=450.0,  # exact max carbon
            ),
        )
        scorecard = PatrolEngineService.run_all_patrols(bid, graph=self.graph)
        
        for patrol in scorecard.patrol_results:
            self.assertEqual(patrol.status, "PASS", f"{patrol.patrol_name} failed: {patrol.reason}")
        self.assertEqual(scorecard.recommendation, "RECOMMENDED")

    def test_over_limit_boundaries_fail(self):
        """Values exceeding constraint limits must FAIL."""
        bid = VendorBidExtract(
            vendor_id="VENDOR-BREACH",
            vendor_name="Breach Vendor",
            bid_amount_inr=50_000_000.0,
            promised_delivery_weeks=10,
            has_osha_cert=True,
            equipment=EquipmentSpec(
                equipment_type="Chiller",
                manufacturer="Breach Vendor",
                model_number="BREACH-1",
                power_draw_kw=1200.1,  # Exceeds 1200.0 kW
                width_m=1.9,
                embodied_carbon_factor=450.1,  # Exceeds 450.0 kgCO2e
            ),
        )
        scorecard = PatrolEngineService.run_all_patrols(bid, graph=self.graph)
        
        building = next(p for p in scorecard.patrol_results if p.patrol_name == "BUILDING_PATROL")
        green = next(p for p in scorecard.patrol_results if p.patrol_name == "GREEN_PATROL")
        
        self.assertEqual(building.status, "FAIL")
        self.assertEqual(green.status, "FAIL")
        self.assertEqual(scorecard.recommendation, "REJECT")


if __name__ == "__main__":
    unittest.main()
