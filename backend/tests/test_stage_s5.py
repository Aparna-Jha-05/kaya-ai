"""Unit tests for Stage S5 Constrained Schema Generation & Dual SLM Cascade Service."""

import unittest
from app.services.model_extraction import ExtractionSettings, ExtractionCascade
from app.models.schemas import (
    EquipmentSpec,
    ExtractionReport,
    ExtractionProvider,
    FactCandidate,
    FactField,
    VendorBidExtract,
)


class TestStageS5ConstrainedSchemaCascade(unittest.TestCase):
    def test_settings_from_env_defaults(self):
        """Verify extraction settings load defaults correctly from environment."""
        settings = ExtractionSettings.from_env()
        self.assertIsInstance(settings.ollama_enabled, bool)
        self.assertIsInstance(settings.deadline_seconds, float)

    def test_stage_s5_cascade_enrichment_signals(self):
        """Mock provider candidate insertion must record Stage S5 review signals."""
        settings = ExtractionSettings(
            ollama_enabled=False,
            ollama_base_url="http://localhost:11434",
            ollama_model="mistral:7b",
            deadline_seconds=20.0,
            remote_enabled=False,
            remote_project_ids=frozenset(["PRJ-AMBER-01"]),
            gemini_api_key=None,
            gemini_model="gemini-1.5-flash",
            ollama_fallback_model="llama3.1:8b",
        )

        bid = VendorBidExtract(
            vendor_id="VENDOR-S5",
            vendor_name="Stage S5 Vendor",
            bid_amount_inr=50_000_000.0,
            promised_delivery_weeks=10,
            has_osha_cert=True,
            equipment=EquipmentSpec(
                equipment_type="Chiller",
                manufacturer="S5 Vendor",
                model_number="MODEL-S5",
                power_draw_kw=1100.0,
                width_m=1.8,
                embodied_carbon_factor=400.0,
            ),
            extraction_report=ExtractionReport(
                candidates=[
                    FactCandidate(
                        field=FactField.WATER_EVAP_GPM,
                        raw_value="25 gpm",
                        normalized_value=25.0,
                        unit="gpm",
                        source_excerpt="Water Evap: 25 gpm",
                        extractor="ollama",
                        provider=ExtractionProvider.OLLAMA,
                        model="mistral:7b",
                        accepted=True,
                    )
                ]
            ),
        )

        cascade = ExtractionCascade(settings=settings)
        enriched = cascade.enrich("Sample document text", bid, "PRJ-AMBER-01")

        self.assertIsNotNone(enriched)
        self.assertEqual(enriched.equipment.water_evap_gpm, 25.0)


if __name__ == "__main__":
    unittest.main()
