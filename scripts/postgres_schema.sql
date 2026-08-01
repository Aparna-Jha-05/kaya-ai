-- PO-LICE Enriched Constraint Graph. Apply with: psql "$DATABASE_URL" -f scripts/postgres_schema.sql
ALTER TABLE site_constraints ADD COLUMN IF NOT EXISTS contractual_warranty_min_years SMALLINT;
ALTER TABLE site_constraints ADD COLUMN IF NOT EXISTS max_water_evap_gpm DOUBLE PRECISION;
ALTER TABLE site_constraints ADD COLUMN IF NOT EXISTS max_floor_load_kg_m2 DOUBLE PRECISION;
ALTER TABLE site_constraints ADD COLUMN IF NOT EXISTS mcp_sync_source VARCHAR(32);
CREATE TABLE IF NOT EXISTS commodity_benchmarks (
  material_type VARCHAR(64) NOT NULL, benchmark_index VARCHAR(64) NOT NULL,
  price_per_unit DOUBLE PRECISION NOT NULL, valid_from DATE NOT NULL, valid_to DATE NOT NULL
);
ALTER TABLE vendor_docs ADD COLUMN IF NOT EXISTS agreement_risk_score DOUBLE PRECISION;
ALTER TABLE vendor_docs ADD COLUMN IF NOT EXISTS communication_audit_log JSONB;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS submission_ip INET;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS bank_account VARCHAR(128);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS pdf_fingerprint VARCHAR(64);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS bid_integrity_signals JSONB;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS lifecycle_mode VARCHAR(16) NOT NULL DEFAULT 'PRE_AWARD'
  CHECK (lifecycle_mode IN ('PRE_AWARD', 'POST_AWARD'));
