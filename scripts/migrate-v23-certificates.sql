-- v23: Certificate generation support
-- Adds certificate_url to assessment_sessions for storing generated PDF certificate paths

ALTER TABLE assessment_sessions ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Storage bucket for certificates (run via Supabase dashboard or API):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);
