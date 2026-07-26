-- PO-LICE Migration 002: project scope, idempotency, and immutable audit enforcement

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE site_constraints
    ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS request_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

ALTER TABLE bids
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(128) NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

ALTER TABLE extracted_facts
    ADD COLUMN IF NOT EXISTS project_id VARCHAR(64);

UPDATE extracted_facts AS fact
SET project_id = bid.project_id
FROM bids AS bid
WHERE fact.bid_id = bid.id AND fact.project_id IS NULL;

ALTER TABLE extracted_facts
    ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE patrol_results
    ADD COLUMN IF NOT EXISTS project_id VARCHAR(64);

UPDATE patrol_results AS result
SET project_id = bid.project_id
FROM bids AS bid
WHERE result.bid_id = bid.id AND result.project_id IS NULL;

ALTER TABLE patrol_results
    ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE rfis
    ADD COLUMN IF NOT EXISTS project_id VARCHAR(64);

UPDATE rfis AS rfi
SET project_id = bid.project_id
FROM bids AS bid
WHERE rfi.bid_id = bid.id AND rfi.project_id IS NULL;

ALTER TABLE rfis
    ALTER COLUMN project_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unq_bids_project_id
    ON bids(project_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS unq_site_constraints_project_id
    ON site_constraints(project_id, id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_extracted_facts_project') THEN
        ALTER TABLE extracted_facts
            ADD CONSTRAINT fk_extracted_facts_project
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_extracted_facts_project_bid') THEN
        ALTER TABLE extracted_facts
            ADD CONSTRAINT fk_extracted_facts_project_bid
            FOREIGN KEY (project_id, bid_id) REFERENCES bids(project_id, id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_patrol_results_project') THEN
        ALTER TABLE patrol_results
            ADD CONSTRAINT fk_patrol_results_project
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_patrol_results_project_bid') THEN
        ALTER TABLE patrol_results
            ADD CONSTRAINT fk_patrol_results_project_bid
            FOREIGN KEY (project_id, bid_id) REFERENCES bids(project_id, id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_patrol_results_project_constraint') THEN
        ALTER TABLE patrol_results
            ADD CONSTRAINT fk_patrol_results_project_constraint
            FOREIGN KEY (project_id, constraint_version_id)
            REFERENCES site_constraints(project_id, id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rfis_project') THEN
        ALTER TABLE rfis
            ADD CONSTRAINT fk_rfis_project
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rfis_project_bid') THEN
        ALTER TABLE rfis
            ADD CONSTRAINT fk_rfis_project_bid
            FOREIGN KEY (project_id, bid_id) REFERENCES bids(project_id, id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bid_fingerprint_sha256') THEN
        ALTER TABLE bids
            ADD CONSTRAINT chk_bid_fingerprint_sha256
            CHECK (pdf_fingerprint ~ '^[0-9a-f]{64}$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_patrol_assessment_version') THEN
        ALTER TABLE patrol_results
            ADD CONSTRAINT chk_patrol_assessment_version
            CHECK (assessment_version > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_vendor_risk_score') THEN
        ALTER TABLE vendor_docs
            ADD CONSTRAINT chk_vendor_risk_score
            CHECK (risk_score BETWEEN 1.0 AND 10.0 AND dispute_count >= 0);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_extracted_facts_project_bid
    ON extracted_facts(project_id, bid_id);

CREATE INDEX IF NOT EXISTS idx_patrol_results_project_bid
    ON patrol_results(project_id, bid_id);

CREATE INDEX IF NOT EXISTS idx_rfis_project_bid
    ON rfis(project_id, bid_id);

CREATE UNIQUE INDEX IF NOT EXISTS unq_bids_project_idempotency
    ON bids(project_id, created_by, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unq_audit_project_idempotency
    ON audit_logs(project_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unq_patrol_assessment_version
    ON patrol_results(bid_id, patrol_type, assessment_version);

CREATE UNIQUE INDEX IF NOT EXISTS unq_patrol_latest
    ON patrol_results(bid_id, patrol_type)
    WHERE is_latest = TRUE;

DROP RULE IF EXISTS no_update_audit_logs ON audit_logs;
DROP RULE IF EXISTS no_delete_audit_logs ON audit_logs;

CREATE OR REPLACE FUNCTION reject_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_audit_log_mutation();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE UPDATE, DELETE ON audit_logs FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;
    END IF;
END
$$;
