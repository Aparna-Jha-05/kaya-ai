"""
PO-LICE Idempotent Supabase Seeder
Applies migration 001_initial_schema.sql and inserts labeled synthetic demo records.
"""

import os
import sys
import asyncpg
import asyncio

async def seed_database():
    db_url = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL"))
    if not db_url:
        print("⚠ SUPABASE_DATABASE_URL not set. Seeding skipped for offline/demo mode.")
        return

    # Convert postgresql:// to postgresql:// if needed for asyncpg
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    print("Connecting to Supabase PostgreSQL...")
    conn = await asyncpg.connect(db_url)
    try:
        # 1. Apply Migration 001
        migration_path = os.path.join(os.path.dirname(__file__), "migrations", "001_initial_schema.sql")
        if os.path.exists(migration_path):
            with open(migration_path, "r", encoding="utf-8") as f:
                sql_script = f.read()
            await conn.execute(sql_script)
            print("✓ Applied migration 001_initial_schema.sql")

        # 2. Seed Synthetic Bids
        bids_data = [
            ("BID-2026-001", "PRJ-AMBER-01", "CoolTech Global Solutions", "Substituted Modular Chiller CTX-1400", 38000000.0, 1400.0, 2.1, 540.0, 28, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "PRE_AWARD", True, '{"power_kw": 1400.0, "door_width_m": 2.1, "embodied_carbon_kg": 540.0}'),
            ("BID-2026-002", "PRJ-AMBER-01", "Trane Solutions Pvt Ltd", "Standard Centrifugal Chiller TR-1100", 42000000.0, 1100.0, 1.8, 380.0, 84, "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e", "PRE_AWARD", True, '{"power_kw": 1100.0, "door_width_m": 1.8, "embodied_carbon_kg": 380.0}'),
            ("BID-2026-003", "PRJ-AMBER-01", "Carrier HVAC India Ltd", "Industrial Chiller CR-1180", 45000000.0, 1180.0, 1.85, 410.0, 56, "b8c37e33defde51cf91e1e03e51657da2cf806871032338c2079493eb42ae909", "PRE_AWARD", True, '{"power_kw": 1180.0, "door_width_m": 1.85, "embodied_carbon_kg": 410.0}')
        ]

        for bid in bids_data:
            await conn.execute("""
                INSERT INTO bids (id, project_id, vendor_name, equipment_model, bid_price_inr, power_kw, door_width_m, embodied_carbon_kg, lead_time_days, pdf_fingerprint, lifecycle_mode, is_synthetic, extracted_json)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    bid_price_inr = EXCLUDED.bid_price_inr,
                    power_kw = EXCLUDED.power_kw,
                    door_width_m = EXCLUDED.door_width_m,
                    embodied_carbon_kg = EXCLUDED.embodied_carbon_kg,
                    updated_at = CURRENT_TIMESTAMP;
            """, *bid)

        print("✓ Idempotently seeded synthetic bids")

        # 3. Seed Synthetic Vendor Docs for Vice Squad RAG
        vendor_docs_data = [
            ("PRJ-AMBER-01", "CoolTech Global Solutions", "CoolTech Substation 2024 Contract Breach Audit", 3, 7.5, "CoolTech Global experienced 3 major contractual disputes in 2024 regarding unapproved equipment substitution and delayed delivery penalty defaults.", True),
            ("PRJ-AMBER-01", "Trane Solutions Pvt Ltd", "Trane 2025 Performance Review", 0, 1.2, "Trane Solutions has maintained a 100% compliance record with zero contract disputes across 12 infrastructure projects.", True)
        ]

        for vdoc in vendor_docs_data:
            await conn.execute("""
                INSERT INTO vendor_docs (project_id, vendor_name, doc_title, dispute_count, risk_score, content_text, is_synthetic)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (project_id, vendor_name, doc_title) DO UPDATE SET
                    dispute_count = EXCLUDED.dispute_count,
                    risk_score = EXCLUDED.risk_score,
                    content_text = EXCLUDED.content_text,
                    is_synthetic = TRUE;
            """, *vdoc)

        print("✓ Idempotently seeded synthetic vendor docs")

        # 4. Seed Audit Event
        await conn.execute("""
            INSERT INTO audit_logs (project_id, actor, action, target_id, details)
            SELECT 'PRJ-AMBER-01', 'SYSTEM_SEEDER', 'DATABASE_INITIALIZED', 'PRJ-AMBER-01',
                   '{"status": "SUCCESS", "is_synthetic": true}'::jsonb
            WHERE NOT EXISTS (
                SELECT 1 FROM audit_logs
                WHERE project_id = 'PRJ-AMBER-01'
                  AND actor = 'SYSTEM_SEEDER'
                  AND action = 'DATABASE_INITIALIZED'
                  AND target_id = 'PRJ-AMBER-01'
            );
        """)
        print("✓ Seeded audit log event")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
