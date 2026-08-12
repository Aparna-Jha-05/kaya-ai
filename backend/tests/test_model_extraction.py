from __future__ import annotations

import json
import os
import unittest
from unittest.mock import patch

from pydantic import ValidationError

from app.models.schemas import (
    ExtractionProvider,
    FactCandidate,
    FactField,
    ProviderExtractionResponse,
)
from app.services.extractor import PDFExtractorService
from app.services.model_extraction import (
    ExtractionCascade,
    ExtractionSettings,
    GeminiExtractor,
    OllamaExtractor,
    ProviderRequestError,
    _select_candidates,
    candidates_equivalent,
    normalize_fact_value,
    validate_provider_candidates,
)


def settings(**updates: object) -> ExtractionSettings:
    values = {
        "ollama_enabled": False,
        "ollama_base_url": "http://localhost:11434",
        "ollama_model": "mistral:test",
        "deadline_seconds": 5.0,
        "remote_enabled": False,
        "remote_project_ids": frozenset(),
        "gemini_api_key": None,
        "gemini_model": None,
    }
    values.update(updates)
    return ExtractionSettings(**values)


def candidate(
    field: FactField,
    raw_value: str,
    normalized_value: str | float | int | bool,
    source_excerpt: str,
    *,
    provider: ExtractionProvider = ExtractionProvider.OLLAMA,
) -> FactCandidate:
    units = {
        FactField.POWER_DRAW_KW: "kW",
        FactField.WIDTH_M: "m",
        FactField.DELIVERY_WEEKS: "week",
        FactField.BID_AMOUNT_INR: "INR",
    }
    return FactCandidate(
        field=field,
        raw_value=raw_value,
        normalized_value=normalized_value,
        unit=units.get(field),
        source_excerpt=source_excerpt,
        extractor="structured-output",
        provider=provider,
        model="test-model",
    )


class CandidateContractTests(unittest.TestCase):
    def test_rejects_incompatible_canonical_unit(self) -> None:
        with self.assertRaises(ValidationError):
            FactCandidate(
                field=FactField.POWER_DRAW_KW,
                raw_value="1.1 MW",
                normalized_value=1.1,
                unit="MW",
                source_excerpt="Rated demand 1.1 MW",
                extractor="structured-output",
                provider=ExtractionProvider.OLLAMA,
                model="test",
            )

    def test_normalizes_supported_variants(self) -> None:
        self.assertEqual(normalize_fact_value(FactField.POWER_DRAW_KW, "1.1 MW"), 1100)
        self.assertEqual(normalize_fact_value(FactField.WIDTH_M, "1850 mm"), 1.85)
        self.assertEqual(normalize_fact_value(FactField.DELIVERY_WEEKS, "70 Days"), 10)
        with self.assertRaises(ValueError):
            normalize_fact_value(FactField.OSHA_CERT, "unknown")

    def test_rejects_candidate_without_exact_source_support(self) -> None:
        accepted, issues = validate_provider_candidates(
            "No engineering power value is stated.",
            [candidate(FactField.POWER_DRAW_KW, "999 kW", 999, "Power: 999 kW")],
            {FactField.POWER_DRAW_KW},
        )
        self.assertEqual(accepted, [])
        self.assertEqual(issues[0].code, "UNSUPPORTED_BY_SOURCE")

    def test_equivalence_and_disagreement_use_normalized_values(self) -> None:
        first = candidate(FactField.POWER_DRAW_KW, "1.1 MW", 1100, "Demand 1.1 MW")
        equivalent = candidate(FactField.POWER_DRAW_KW, "1100 kW", 1100, "Demand 1100 kW")
        different = candidate(FactField.POWER_DRAW_KW, "1200 kW", 1200, "Demand 1200 kW")
        self.assertTrue(candidates_equivalent(first, equivalent))
        self.assertFalse(candidates_equivalent(first, different))
        selected, issues = _select_candidates({}, [first, different])
        self.assertNotIn(FactField.POWER_DRAW_KW.value, selected)
        self.assertEqual(issues[0].code, "MATERIAL_DISAGREEMENT")

    def test_provider_verdict_is_not_part_of_the_schema(self) -> None:
        with self.assertRaises(ValidationError):
            ProviderExtractionResponse.model_validate(
                {"candidates": [], "compliance_verdict": "PASS"}
            )


class ProviderContractTests(unittest.TestCase):
    def test_ollama_uses_schema_without_tools(self) -> None:
        captured: dict = {}
        payload = ProviderExtractionResponse(
            candidates=[
                candidate(FactField.WIDTH_M, "1.8 m", 1.8, "Equipment clearance is 1.8 m")
            ]
        )

        def transport(url: str, body: dict, headers: dict[str, str], timeout: float) -> dict:
            captured.update(url=url, body=body, headers=headers, timeout=timeout)
            return {"message": {"content": payload.model_dump_json()}}

        result = OllamaExtractor(settings(ollama_enabled=True), transport).extract(
            "Equipment clearance is 1.8 m", [FactField.WIDTH_M]
        )
        self.assertEqual(result[0].provider, ExtractionProvider.OLLAMA)
        self.assertIn("format", captured["body"])
        self.assertNotIn("tools", captured["body"])
        self.assertIn("<DOCUMENT>", captured["body"]["messages"][1]["content"])

    def test_gemini_uses_header_key_and_structured_schema(self) -> None:
        captured: dict = {}
        payload = ProviderExtractionResponse(
            candidates=[
                candidate(
                    FactField.POWER_DRAW_KW,
                    "1.1 MW",
                    1100,
                    "Rated electrical demand is 1.1 MW",
                    provider=ExtractionProvider.GEMINI,
                )
            ]
        )

        def transport(url: str, body: dict, headers: dict[str, str], timeout: float) -> dict:
            captured.update(url=url, body=body, headers=headers, timeout=timeout)
            return {
                "candidates": [
                    {"content": {"parts": [{"text": payload.model_dump_json()}]}}
                ]
            }

        extractor = GeminiExtractor(
            settings(
                remote_enabled=True,
                remote_project_ids=frozenset({"demo"}),
                gemini_api_key="secret-test-key",
                gemini_model="gemini-test",
            ),
            transport,
        )
        result = extractor.extract(
            "Rated electrical demand is 1.1 MW", [FactField.POWER_DRAW_KW]
        )
        self.assertEqual(result[0].provider, ExtractionProvider.GEMINI)
        self.assertEqual(captured["headers"]["x-goog-api-key"], "secret-test-key")
        self.assertNotIn("secret-test-key", captured["url"])
        schema = captured["body"]["generationConfig"]["responseJsonSchema"]
        self.assertNotIn("pattern", json.dumps(schema))
        self.assertNotIn("maxLength", json.dumps(schema))


class CascadeTests(unittest.TestCase):
    def test_complete_deterministic_extract_skips_models(self) -> None:
        text = (
            "VENDOR: Complete Systems\nUpfront Bid Amount: INR 4,20,00,000\n"
            "Promised Delivery: 10 Weeks\nOSHA Certified: Yes\nEquipment Model: C-1\n"
            "Substation Power Draw: 1100 kW\nCooling Capacity: 1200 kW\n"
            "Equipment Width: 1.8 m\nEmbodied Carbon Factor: 380 kgCO2e/ton\n"
            "Water Evaporation Rate: 18 gpm\nFloor Load: 2200 kg"
        )
        bid = PDFExtractorService.parse_bid_text(text)

        class MustNotRun:
            def extract(self, document_text: str, requested_fields: list[FactField]) -> list[FactCandidate]:
                raise AssertionError("provider must not run")

        enriched = ExtractionCascade(
            settings(ollama_enabled=True),
            ollama=MustNotRun(),
        ).enrich(text, bid, "demo")
        self.assertEqual(
            enriched.extraction_report.providers_attempted,
            [ExtractionProvider.DETERMINISTIC],
        )

    def test_local_provider_fills_only_evidence_supported_missing_fact(self) -> None:
        text = "VENDOR: Local Test\nEquipment Model: LT-1\nRated electrical demand is 1.1 MW"
        bid = PDFExtractorService.parse_bid_text(text)

        class Local:
            def extract(self, document_text: str, requested_fields: list[FactField]) -> list[FactCandidate]:
                return [
                    candidate(
                        FactField.POWER_DRAW_KW,
                        "1.1 MW",
                        1.1,
                        "Rated electrical demand is 1.1 MW",
                    )
                ]

        enriched = ExtractionCascade(
            settings(ollama_enabled=True),
            ollama=Local(),
        ).enrich(text, bid, "demo")
        self.assertEqual(enriched.equipment.power_draw_kw, 1100)
        self.assertTrue(
            enriched.extraction_report.selected[FactField.POWER_DRAW_KW.value].accepted
        )

    def test_provider_failure_leaves_fact_unresolved(self) -> None:
        text = "VENDOR: Local Test\nEquipment Model: LT-1"
        bid = PDFExtractorService.parse_bid_text(text)

        class Unavailable:
            def extract(self, document_text: str, requested_fields: list[FactField]) -> list[FactCandidate]:
                raise ProviderRequestError("local provider unavailable")

        enriched = ExtractionCascade(
            settings(ollama_enabled=True),
            ollama=Unavailable(),
        ).enrich(text, bid, "demo")
        self.assertIsNone(enriched.equipment.power_draw_kw)
        self.assertIn(
            "OLLAMA_UNAVAILABLE",
            [issue.code for issue in enriched.extraction_report.issues],
        )

    def test_remote_requires_project_authorization_and_audits_disclosure(self) -> None:
        text = (
            "VENDOR: Remote Test\nEquipment Model: RT-1\n"
            "Bank account: 00000000\nEquipment clearance is 1.75 m"
        )
        bid = PDFExtractorService.parse_bid_text(text)
        disclosed_text: list[str] = []

        class Remote:
            def extract(self, document_text: str, requested_fields: list[FactField]) -> list[FactCandidate]:
                disclosed_text.append(document_text)
                return [
                    candidate(
                        FactField.WIDTH_M,
                        "1.75 m",
                        1.75,
                        "Equipment clearance is 1.75 m",
                        provider=ExtractionProvider.GEMINI,
                    )
                ]

        configuration = settings(
            remote_enabled=True,
            remote_project_ids=frozenset({"allowed"}),
            gemini_api_key="secret-test-key",
            gemini_model="gemini-test",
        )
        unauthorized = ExtractionCascade(configuration, gemini=Remote()).enrich(
            text, bid, "blocked"
        )
        self.assertIsNone(unauthorized.equipment.width_m)
        self.assertEqual(unauthorized.extraction_report.remote_disclosures, [])

        authorized = ExtractionCascade(configuration, gemini=Remote()).enrich(
            text, bid, "allowed"
        )
        self.assertEqual(authorized.equipment.width_m, 1.75)
        self.assertEqual(len(authorized.extraction_report.remote_disclosures), 1)
        self.assertNotIn("Bank account", disclosed_text[0])
        self.assertNotIn("secret-test-key", authorized.model_dump_json())

    def test_settings_reject_invalid_url_and_secret_repr(self) -> None:
        with patch.dict(
            os.environ,
            {"OLLAMA_BASE_URL": "http://user:password@localhost:11434"},
            clear=False,
        ):
            with self.assertRaises(ValueError):
                ExtractionSettings.from_env()
        with patch.dict(os.environ, {"OLLAMA_ENABLED": "true"}, clear=True):
            with self.assertRaises(ValueError):
                ExtractionSettings.from_env()
        configuration = settings(gemini_api_key="secret-test-key")
        self.assertNotIn("secret-test-key", repr(configuration))


if __name__ == "__main__":
    unittest.main()
