-- ============================================
-- V13 Phase 6: Tab Switch Tracking
-- ============================================
-- Adds tab_switch_count to assessment_sessions for anti-cheating.

ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS tab_switch_count INT NOT NULL DEFAULT 0;
