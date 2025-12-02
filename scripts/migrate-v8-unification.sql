-- V8.0 "The Great Unification" Migration Script
-- Migrates ALL remaining legacy data from V1 tables to V2 Shared Schema
-- This function is idempotent - safe to run multiple times

CREATE OR REPLACE FUNCTION migrate_v1_to_v2_complete()
RETURNS JSON AS $$
DECLARE
  deck_count INTEGER := 0;
  card_count INTEGER := 0;
  tag_count INTEGER := 0;
  progress_count INTEGER := 0;
  subscription_count INTEGER := 0;
BEGIN
  -- ============================================
  -- Step 1: Migrate decks → deck_templates
  -- ============================================
  -- Select all decks that don't have a matching deck_template (by legacy_id)
  -- Insert with legacy_id = decks.id, author_id = decks.user_id, visibility = 'private'
  
  WITH inserted_decks AS (
    INSERT INTO deck_templates (title, description, visibility, author_id, legacy_id, created_at, updated_at)
    SELECT 
      d.title,
      NULL as description,
      'private' as visibility,
      d.user_id as author_id,
      d.id as legacy_id,
      d.created_at,
      NOW() as updated_at
    FROM decks d
    WHERE NOT EXISTS (
      SELECT 1 FROM deck_templates dt WHERE dt.legacy_id = d.id
    )
    ON CONFLICT (legacy_id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO deck_count FROM inserted_decks;

  -- ============================================
  -- Step 2: Migrate cards → card_templates
  -- ============================================
  -- Select all cards that don't have a matching card_template (by legacy_id)
  -- Resolve deck_template_id via deck_templates.legacy_id = cards.deck_id
  -- Copy stem, options, correct_index, explanation
  
  WITH inserted_cards AS (
    INSERT INTO card_templates (deck_template_id, stem, options, correct_index, explanation, source_meta, legacy_id, created_at)
    SELECT 
      dt.id as deck_template_id,
      COALESCE(c.stem, c.front) as stem,
      COALESCE(c.options, '["Option A", "Option B", "Option C", "Option D"]'::jsonb) as options,
      COALESCE(c.correct_index, 0) as correct_index,
      COALESCE(c.explanation, c.back) as explanation,
      NULL as source_meta,
      c.id as legacy_id,
      c.created_at
    FROM cards c
    JOIN deck_templates dt ON dt.legacy_id = c.deck_id
    WHERE NOT EXISTS (
      SELECT 1 FROM card_templates ct WHERE ct.legacy_id = c.id
    )
    ON CONFLICT (legacy_id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO card_count FROM inserted_cards;

  -- ============================================
  -- Step 3: Migrate card_tags → card_template_tags
  -- ============================================
  -- For each card_tags row, resolve card_template_id via card_templates.legacy_id
  -- Insert into card_template_tags
  
  WITH inserted_tags AS (
    INSERT INTO card_template_tags (card_template_id, tag_id, created_at)
    SELECT 
      ct.id as card_template_id,
      cta.tag_id,
      cta.created_at
    FROM card_tags cta
    JOIN card_templates ct ON ct.legacy_id = cta.card_id
    WHERE NOT EXISTS (
      SELECT 1 FROM card_template_tags ctt 
      WHERE ctt.card_template_id = ct.id AND ctt.tag_id = cta.tag_id
    )
    ON CONFLICT (card_template_id, tag_id) DO NOTHING
    RETURNING card_template_id
  )
  SELECT COUNT(*) INTO tag_count FROM inserted_tags;

  -- ============================================
  -- Step 4: Create user_card_progress from cards SRS state
  -- ============================================
  -- For each migrated card, create user_card_progress row
  -- Copy interval, ease_factor, next_review from legacy card
  -- Resolve user_id from decks.user_id
  
  WITH inserted_progress AS (
    INSERT INTO user_card_progress (user_id, card_template_id, interval, ease_factor, repetitions, next_review, last_answered_at, suspended)
    SELECT 
      d.user_id,
      ct.id as card_template_id,
      COALESCE(c.interval, 0) as interval,
      COALESCE(c.ease_factor, 2.5) as ease_factor,
      CASE WHEN COALESCE(c.interval, 0) > 0 THEN 1 ELSE 0 END as repetitions,
      COALESCE(c.next_review, NOW()) as next_review,
      NULL as last_answered_at,
      false as suspended
    FROM cards c
    JOIN decks d ON d.id = c.deck_id
    JOIN card_templates ct ON ct.legacy_id = c.id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_card_progress ucp 
      WHERE ucp.user_id = d.user_id AND ucp.card_template_id = ct.id
    )
    ON CONFLICT (user_id, card_template_id) DO NOTHING
    RETURNING card_template_id
  )
  SELECT COUNT(*) INTO progress_count FROM inserted_progress;

  -- ============================================
  -- Step 5: Create user_decks subscriptions
  -- ============================================
  -- For each deck_template, create user_decks row for the author
  
  WITH inserted_subscriptions AS (
    INSERT INTO user_decks (user_id, deck_template_id, is_active, created_at)
    SELECT 
      dt.author_id as user_id,
      dt.id as deck_template_id,
      true as is_active,
      dt.created_at
    FROM deck_templates dt
    WHERE NOT EXISTS (
      SELECT 1 FROM user_decks ud 
      WHERE ud.user_id = dt.author_id AND ud.deck_template_id = dt.id
    )
    ON CONFLICT (user_id, deck_template_id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO subscription_count FROM inserted_subscriptions;

  -- Return migration report as JSON
  RETURN json_build_object(
    'deck_templates_created', deck_count,
    'card_templates_created', card_count,
    'card_template_tags_created', tag_count,
    'user_card_progress_created', progress_count,
    'user_decks_created', subscription_count,
    'migration_complete', true
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper function to check migration status
-- ============================================
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS JSON AS $$
DECLARE
  legacy_cards_count INTEGER;
  legacy_decks_count INTEGER;
  v2_card_templates_count INTEGER;
  v2_deck_templates_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_cards_count FROM cards;
  SELECT COUNT(*) INTO legacy_decks_count FROM decks;
  SELECT COUNT(*) INTO v2_card_templates_count FROM card_templates;
  SELECT COUNT(*) INTO v2_deck_templates_count FROM deck_templates;
  
  RETURN json_build_object(
    'legacy_cards_count', legacy_cards_count,
    'legacy_decks_count', legacy_decks_count,
    'v2_card_templates_count', v2_card_templates_count,
    'v2_deck_templates_count', v2_deck_templates_count,
    'migration_needed', legacy_cards_count > 0 OR legacy_decks_count > 0
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Usage Instructions:
-- ============================================
-- 1. Run this script in Supabase SQL Editor to create the functions
-- 2. Execute: SELECT migrate_v1_to_v2_complete();
-- 3. Check status: SELECT check_migration_status();
-- 4. Run migration again if needed (it's idempotent)
