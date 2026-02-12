-- V13 Phase 13: Exam Security & Access Control
-- Adds access_code and ip_address fields

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS access_code TEXT DEFAULT NULL;

ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT NULL;
