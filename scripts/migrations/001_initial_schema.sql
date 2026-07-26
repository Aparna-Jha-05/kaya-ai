-- PO-LICE Migration 001: Initial Schema with Project Isolation and Versioned Assessments

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Projects (Isolation Unit)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO projects (id, name, description)
VALUES ('PRJ-AMBER-01', 'Amber Substation Project', 'Default procurement project for high-voltage substation transformers.')
ON CONFLICT (id) DO NOTHING;

-- 2. Versioned Site Constraints
CREATE TABLE IF NOT EXISTS site_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    max_substation_kw DOUBLE PRECISION NOT NULL DEFAULT 1200.0,
    max_door_width_m DOUBLE PRECISION NOT NULL DEFAULT 1.9,
    max_embodied_carbon_kg DOUBLE PRECISION NOT NULL DEFAULT 450.0,
    daily_delay_penalty_inr DOUBLE PRECISION NOT NULL DEFAULT 200000.0,
    actor VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
    reason TEXT NOT NULL DEFAULT 'Initial baseline constraint version',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_project_constraint_version UNIQUE (project_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_constraints_current
ON site_constraints (project_id) WHERE is_current = TRUE;

-- 3. Bids & Dockets
CREATE TABLE IF NOT EXISTS bids (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vendor_name VARCHAR(128) NOT NULL,
    equipment_model VARCHAR(128) NOT NULL,
    bid_price_inr DOUBLE PRECISION NOT NULL,
    power_kw DOUBLE PRECISION NOT NULL,
    door_width_m DOUBLE PRECISION NOT NULL,
    embodied_carbon_kg DOUBLE PRECISION NOT NULL,
    lead_time_days INT NOT NULL,
    pdf_url TEXT,
    pdf_fingerprint VARCHAR(64) NOT NULL,
    lifecycle_mode VARCHAR(32) NOT NULL DEFAULT 'PRE_AWARD'
        CHECK (lifecycle_mode IN ('PRE_AWARD', 'AWARDED', 'REJECTED', 'RFI_PENDING')),
    version INT NOT NULL DEFAULT 1,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    extracted_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_project_pdf_fingerprint UNIQUE (project_id, pdf_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_bids_project ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_fingerprint ON bids(pdf_fingerprint);

-- 4. Extracted Facts & Provenance
CREATE TABLE IF NOT EXISTS extracted_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id VARCHAR(64) NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    fact_key VARCHAR(64) NOT NULL,
    raw_value TEXT NOT NULL,
    normalized_value DOUBLE PRECISION,
    unit VARCHAR(32),
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    page_number INT NOT NULL DEFAULT 1,
    evidence_region JSONB, -- [x0, y0, x1, y1]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_bid ON extracted_facts(bid_id);

-- 5. Versioned Patrol Results
CREATE TABLE IF NOT EXISTS patrol_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id VARCHAR(64) NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    patrol_type VARCHAR(32) NOT NULL, -- 'BUILDING', 'GREEN', 'VICE', 'TRAFFIC'
    assessment_version INT NOT NULL DEFAULT 1,
    constraint_version_id UUID REFERENCES site_constraints(id),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PASS', 'FAIL', 'FLAG')),
    evidence_json JSONB NOT NULL,
    breach_details TEXT,
    is_latest BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patrol_results_bid_latest ON patrol_results(bid_id, is_latest);

-- 6. Vice Squad Historical Vendor Documents & Disputes (pgvector 1536 dim)
CREATE TABLE IF NOT EXISTS vendor_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vendor_name VARCHAR(128) NOT NULL,
    doc_title TEXT NOT NULL,
    dispute_count INT NOT NULL DEFAULT 0,
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    content_text TEXT NOT NULL,
    embedding vector(1536),
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_docs_project ON vendor_docs(project_id);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_vector ON vendor_docs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 7. Generated RFIs (Counter-Spec Requests)
CREATE TABLE IF NOT EXISTS rfis (
    id VARCHAR(64) PRIMARY KEY,
    bid_id VARCHAR(64) NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'RESOLVED')),
    rfi_content TEXT NOT NULL,
    human_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rfis_bid ON rfis(bid_id);

-- 8. Append-Only Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    actor VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    details JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_project_ts ON audit_logs(project_id, timestamp DESC);

-- DB Rule: Enforce Append-Only Audit Logs (Prevent UPDATE and DELETE)
CREATE OR REPLACE RULE no_update_audit_logs AS
ON UPDATE TO audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_audit_logs AS
ON DELETE TO audit_logs DO INSTEAD NOTHING;
