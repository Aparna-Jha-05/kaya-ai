-- Migration 00001: Initial PostgreSQL Schema for PO-LICE
-- Track 3: Procurement & Vendor Compliance Engine

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_constraints (
    project_id VARCHAR(128) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    max_budget_inr NUMERIC(15, 2) NOT NULL,
    max_delivery_weeks INT NOT NULL,
    max_power_draw_kw NUMERIC(10, 2) NOT NULL,
    max_cooling_capacity_kw NUMERIC(10, 2) NOT NULL,
    max_equipment_width_m NUMERIC(6, 2) NOT NULL,
    max_carbon_footprint NUMERIC(10, 2) NOT NULL,
    floor_load_limit_kg_m2 NUMERIC(10, 2) DEFAULT 2500.0,
    water_evap_cap_gpm NUMERIC(10, 2) DEFAULT 20.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bids (
    id VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(512) NOT NULL,
    pdf_fingerprint VARCHAR(64) NOT NULL,
    vendor_name VARCHAR(256),
    bid_amount_inr NUMERIC(15, 2),
    promised_delivery_weeks INT,
    has_osha_cert BOOLEAN,
    overall_status VARCHAR(32) NOT NULL,
    patrol_scorecard JSONB NOT NULL,
    extracted_bid JSONB NOT NULL,
    uploader_identity VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id VARCHAR(128) NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    actor VARCHAR(128) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
