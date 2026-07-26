"""Insert labeled synthetic PO-LICE demo records idempotently."""

import asyncio
import os

import asyncpg


async def seed_database(explicit_url: str | None = None) -> None:
    db_url = explicit_url or os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("SUPABASE_DATABASE_URL is required")

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    conn = await asyncpg.connect(db_url)
    try:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO projects (id, name, description, is_synthetic)
                VALUES (
                    'PRJ-AMBER-01',
                    'Amber Substation Project',
                    'Synthetic procurement project for the PO-LICE demo.',
                    TRUE
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    is_synthetic = TRUE
                """
            )
            await conn.execute(
                """
                INSERT INTO site_constraints (
                    id, project_id, version, is_current, max_substation_kw,
                    max_door_width_m, max_embodied_carbon_kg,
                    daily_delay_penalty_inr, actor, reason, is_synthetic
                )
                VALUES (
                    '00000000-0000-0000-0000-000000000001',
                    'PRJ-AMBER-01', 1, TRUE, 1200.0, 1.9, 450.0,
                    200000.0, 'SYSTEM_SEEDER',
                    'Synthetic baseline for the PO-LICE demo.', TRUE
                )
                ON CONFLICT (project_id, version) DO NOTHING
                """
            )

            bids_data = [
                ("BID-2026-001", "PRJ-AMBER-01", "CoolTech Global Solutions", "Substituted Modular Chiller CTX-1400", 38000000.0, 1400.0, 2.1, 540.0, 28, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "PRE_AWARD", True, '{"power_kw": 1400.0, "door_width_m": 2.1, "embodied_carbon_kg": 540.0}', "seed-bid-001"),
                ("BID-2026-002", "PRJ-AMBER-01", "Trane Solutions Pvt Ltd", "Standard Centrifugal Chiller TR-1100", 42000000.0, 1100.0, 1.8, 380.0, 84, "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e", "PRE_AWARD", True, '{"power_kw": 1100.0, "door_width_m": 1.8, "embodied_carbon_kg": 380.0}', "seed-bid-002"),
                ("BID-2026-003", "PRJ-AMBER-01", "Carrier HVAC India Ltd", "Industrial Chiller CR-1180", 45000000.0, 1180.0, 1.85, 410.0, 56, "b8c37e33defde51cf91e1e03e51657da2cf806871032338c2079493eb42ae909", "PRE_AWARD", True, '{"power_kw": 1180.0, "door_width_m": 1.85, "embodied_carbon_kg": 410.0}', "seed-bid-003"),
            ]

            for bid in bids_data:
                await conn.execute(
                    """
                    INSERT INTO bids (
                        id, project_id, vendor_name, equipment_model, bid_price_inr,
                        power_kw, door_width_m, embodied_carbon_kg, lead_time_days,
                        pdf_fingerprint, lifecycle_mode, is_synthetic, extracted_json,
                        created_by, idempotency_key
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                        $13::jsonb, 'SYSTEM_SEEDER', $14
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        bid_price_inr = EXCLUDED.bid_price_inr,
                        power_kw = EXCLUDED.power_kw,
                        door_width_m = EXCLUDED.door_width_m,
                        embodied_carbon_kg = EXCLUDED.embodied_carbon_kg,
                        is_synthetic = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    *bid,
                )

            vendor_docs_data = [
                ("PRJ-AMBER-01", "CoolTech Global Solutions", "CoolTech Substation 2024 Contract Breach Audit", 3, 7.5, "CoolTech Global experienced 3 major contractual disputes in 2024 regarding unapproved equipment substitution and delayed delivery penalty defaults.", True),
                ("PRJ-AMBER-01", "Trane Solutions Pvt Ltd", "Trane 2025 Performance Review", 0, 1.2, "Trane Solutions has maintained a 100% compliance record with zero contract disputes across 12 infrastructure projects.", True),
            ]

            for vendor_doc in vendor_docs_data:
                await conn.execute(
                    """
                    INSERT INTO vendor_docs (
                        project_id, vendor_name, doc_title, dispute_count,
                        risk_score, content_text, is_synthetic
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (project_id, vendor_name, doc_title) DO UPDATE SET
                        dispute_count = EXCLUDED.dispute_count,
                        risk_score = EXCLUDED.risk_score,
                        content_text = EXCLUDED.content_text,
                        is_synthetic = TRUE
                    """,
                    *vendor_doc,
                )

            await conn.execute("""
                INSERT INTO audit_logs (
                    project_id, actor, action, target_id, details,
                    is_synthetic, idempotency_key
                )
                VALUES (
                    'PRJ-AMBER-01', 'SYSTEM_SEEDER', 'DATABASE_INITIALIZED',
                    'PRJ-AMBER-01', '{"status": "SUCCESS", "is_synthetic": true}'::jsonb,
                    TRUE, 'seed-database-initialized-v1'
                )
                ON CONFLICT (project_id, idempotency_key)
                    WHERE idempotency_key IS NOT NULL
                DO NOTHING
            """)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
