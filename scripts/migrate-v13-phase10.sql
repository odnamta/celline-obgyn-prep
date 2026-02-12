-- ============================================
-- V13 Phase 10: Proctoring Violations Log
-- ============================================

-- Add JSONB column for timestamped tab-switch violations
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS tab_switch_log JSONB NOT NULL DEFAULT '[]'::jsonb;
