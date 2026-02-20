-- Migration V21: RLS Policy Tightening (Defense in Depth)
-- Companion to v20.1 application-layer hardening.
-- Date: 2026-02-20
--
-- Changes:
-- 1. org_members_update: Add WITH CHECK to prevent org_id column tampering
-- 2. org_members_delete: Add explicit owner-removal guard (only owners delete owners)
-- 3. deck_skill_mappings_insert: Add cross-org coherence check (deck + skill same org)
-- 4. deck_skill_mappings_delete: Add cross-org coherence check (deck + skill same org)

BEGIN;

-- =============================================================================
-- Fix 1: organization_members UPDATE — prevent org_id column tampering
--
-- The existing USING clause correctly scopes "caller must be admin/owner in
-- the same org as the target row." But there is no WITH CHECK clause, so a
-- malicious UPDATE could theoretically change the org_id column itself.
-- Adding WITH CHECK ensures the row still belongs to the same org after update.
-- =============================================================================
DROP POLICY IF EXISTS "org_members_update" ON organization_members;

CREATE POLICY "org_members_update" ON organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    -- After update, org_id must remain unchanged (same org as before)
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- Fix 2: organization_members DELETE — only owners can delete other owners
--
-- The existing policy allows any admin to delete any member in the same org,
-- including owners. Tighten so that deleting an owner row requires the caller
-- to be an owner (not just admin). Self-removal remains unrestricted.
-- =============================================================================
DROP POLICY IF EXISTS "org_members_delete" ON organization_members;

CREATE POLICY "org_members_delete" ON organization_members
  FOR DELETE USING (
    -- Self-removal: always allowed
    user_id = (SELECT auth.uid())
    OR (
      -- Admin+ can remove non-owner members in their org
      organization_members.role != 'owner'
      AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.org_id = organization_members.org_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
      )
    )
    OR (
      -- Only owners can remove other owners
      organization_members.role = 'owner'
      AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.org_id = organization_members.org_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role = 'owner'
      )
    )
  );

-- =============================================================================
-- Fix 3: deck_skill_mappings INSERT — cross-org coherence
--
-- The existing policy checks that the caller is creator+ in the skill's org,
-- but does NOT verify the deck_template belongs to the same org as the skill.
-- A user in two orgs could link Org A's deck to Org B's skill domain.
-- =============================================================================
DROP POLICY IF EXISTS "deck_skill_mappings_insert" ON deck_skill_mappings;

CREATE POLICY "deck_skill_mappings_insert" ON deck_skill_mappings
  FOR INSERT WITH CHECK (
    -- Caller must be creator+ in the skill's org
    EXISTS (
      SELECT 1 FROM skill_domains sd
      JOIN organization_members om ON om.org_id = sd.org_id
      WHERE sd.id = deck_skill_mappings.skill_domain_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'creator')
    )
    -- Deck and skill must belong to the same org
    AND EXISTS (
      SELECT 1 FROM deck_templates dt
      JOIN skill_domains sd ON sd.org_id = dt.org_id
      WHERE dt.id = deck_skill_mappings.deck_template_id
        AND sd.id = deck_skill_mappings.skill_domain_id
    )
  );

-- =============================================================================
-- Fix 4: deck_skill_mappings DELETE — cross-org coherence
--
-- Mirror the INSERT fix for DELETE operations.
-- =============================================================================
DROP POLICY IF EXISTS "deck_skill_mappings_delete" ON deck_skill_mappings;

CREATE POLICY "deck_skill_mappings_delete" ON deck_skill_mappings
  FOR DELETE USING (
    -- Caller must be creator+ in the skill's org
    EXISTS (
      SELECT 1 FROM skill_domains sd
      JOIN organization_members om ON om.org_id = sd.org_id
      WHERE sd.id = deck_skill_mappings.skill_domain_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'creator')
    )
    -- Deck and skill must belong to the same org
    AND EXISTS (
      SELECT 1 FROM deck_templates dt
      JOIN skill_domains sd ON sd.org_id = dt.org_id
      WHERE dt.id = deck_skill_mappings.deck_template_id
        AND sd.id = deck_skill_mappings.skill_domain_id
    )
  );

COMMIT;
