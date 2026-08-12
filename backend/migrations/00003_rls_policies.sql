-- Migration 00003: Supabase Row Level Security (RLS) Policies
-- Enforces tenant project isolation and role-based access control

-- Enable RLS on core tables
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Project Isolation Policies using session variable app.current_project_id
CREATE POLICY "bids_project_isolation" ON bids
    FOR ALL USING (
        project_id = current_setting('app.current_project_id', true)
        OR current_setting('app.current_project_id', true) IS NULL
    );

CREATE POLICY "site_constraints_project_isolation" ON site_constraints
    FOR ALL USING (
        project_id = current_setting('app.current_project_id', true)
        OR current_setting('app.current_project_id', true) IS NULL
    );

CREATE POLICY "audit_logs_project_isolation" ON audit_logs
    FOR ALL USING (
        actor = current_setting('app.current_user_id', true)
        OR current_setting('app.current_user_id', true) IS NULL
    );
