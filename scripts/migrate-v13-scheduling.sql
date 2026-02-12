-- ============================================
-- V13 Phase 7: Assessment Scheduling
-- ============================================
-- Adds start_date and end_date to assessments for time-windowed availability.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
