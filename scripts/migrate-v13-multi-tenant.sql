-- ============================================
-- V13: Multi-Tenant Foundation Migration
-- ============================================
-- Adds organization support to the platform.
-- Every content table gets an org_id column.
-- RLS policies updated for org-scoped access.
-- ============================================

-- ============================================
-- 1. ORGANIZATION TABLES
-- ============================================

-- Organization role enum
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'creator', 'candidate');

-- Organizations table (tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  -- Feature flags and settings (JSONB for flexibility)
  settings JSONB NOT NULL DEFAULT '{
    "features": {
      "study_mode": true,
      "assessment_mode": false,
      "proctoring": false,
      "certification": false,
      "ai_generation": true,
      "pdf_extraction": true,
      "flashcards": true,
      "erp_integration": false
    },
    "branding": {
      "primary_color": "#2563eb"
    },
    "default_language": "en"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Members can view their own orgs
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organizations.id
      AND organization_members.user_id = (SELECT auth.uid())
    )
  );

-- Only owners can update org settings
CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organizations.id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Any authenticated user can create an org (they become owner)
CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);


-- Organization members (join table: users <-> organizations)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'candidate',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON organization_members(org_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their orgs
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = (SELECT auth.uid())
    )
  );

-- Admins/owners can manage members
CREATE POLICY "org_members_insert" ON organization_members
  FOR INSERT WITH CHECK (
    -- User creating their own membership (owner on org create) OR admin/owner adding members
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_members_update" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_members_delete" ON organization_members
  FOR DELETE USING (
    -- Can remove self OR admin/owner can remove others
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );


-- ============================================
-- 2. ADD org_id TO CONTENT TABLES
-- ============================================

-- Add org_id to deck_templates
ALTER TABLE deck_templates
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_deck_templates_org_id ON deck_templates(org_id);

-- Add org_id to tags
ALTER TABLE tags
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_tags_org_id ON tags(org_id);

-- Add org_id to book_sources
ALTER TABLE book_sources
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_book_sources_org_id ON book_sources(org_id);


-- ============================================
-- 3. DATA MIGRATION
-- Creates a default org for all existing data
-- ============================================

-- Create a migration function that:
-- 1. Creates a default org for each existing author
-- 2. Makes each author the owner of their org
-- 3. Assigns all their content to that org
CREATE OR REPLACE FUNCTION migrate_to_multi_tenant()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author RECORD;
  new_org_id UUID;
  author_name TEXT;
  org_slug TEXT;
BEGIN
  -- For each unique author, create a personal org
  FOR author IN
    SELECT DISTINCT author_id FROM deck_templates WHERE org_id IS NULL
  LOOP
    -- Get author info for naming
    SELECT COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      email
    ) INTO author_name
    FROM auth.users WHERE id = author.author_id;

    -- Generate a slug from the name
    org_slug := lower(regexp_replace(
      COALESCE(author_name, author.author_id::text),
      '[^a-zA-Z0-9]+', '-', 'g'
    ));
    -- Ensure uniqueness
    org_slug := org_slug || '-' || substring(author.author_id::text from 1 for 8);

    -- Create org
    INSERT INTO organizations (name, slug)
    VALUES (COALESCE(author_name, 'Personal') || '''s Workspace', org_slug)
    RETURNING id INTO new_org_id;

    -- Make author the owner
    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, author.author_id, 'owner')
    ON CONFLICT (org_id, user_id) DO NOTHING;

    -- Assign their deck_templates
    UPDATE deck_templates SET org_id = new_org_id
    WHERE author_id = author.author_id AND org_id IS NULL;

    -- Assign their tags
    UPDATE tags SET org_id = new_org_id
    WHERE user_id = author.author_id AND org_id IS NULL;

    -- Assign their book_sources
    UPDATE book_sources SET org_id = new_org_id
    WHERE author_id = author.author_id AND org_id IS NULL;
  END LOOP;

  -- Also handle users who have tags/book_sources but no deck_templates
  FOR author IN
    SELECT DISTINCT user_id AS author_id FROM tags WHERE org_id IS NULL
    UNION
    SELECT DISTINCT author_id FROM book_sources WHERE org_id IS NULL
  LOOP
    -- Check if they already have an org
    IF NOT EXISTS (
      SELECT 1 FROM organization_members WHERE user_id = author.author_id
    ) THEN
      SELECT COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        email
      ) INTO author_name
      FROM auth.users WHERE id = author.author_id;

      org_slug := lower(regexp_replace(
        COALESCE(author_name, author.author_id::text),
        '[^a-zA-Z0-9]+', '-', 'g'
      ));
      org_slug := org_slug || '-' || substring(author.author_id::text from 1 for 8);

      INSERT INTO organizations (name, slug)
      VALUES (COALESCE(author_name, 'Personal') || '''s Workspace', org_slug)
      RETURNING id INTO new_org_id;

      INSERT INTO organization_members (org_id, user_id, role)
      VALUES (new_org_id, author.author_id, 'owner')
      ON CONFLICT (org_id, user_id) DO NOTHING;

      UPDATE tags SET org_id = new_org_id
      WHERE user_id = author.author_id AND org_id IS NULL;

      UPDATE book_sources SET org_id = new_org_id
      WHERE author_id = author.author_id AND org_id IS NULL;
    ELSE
      -- Assign to their existing org
      SELECT om.org_id INTO new_org_id
      FROM organization_members om
      WHERE om.user_id = author.author_id
      LIMIT 1;

      UPDATE tags SET org_id = new_org_id
      WHERE user_id = author.author_id AND org_id IS NULL;

      UPDATE book_sources SET org_id = new_org_id
      WHERE author_id = author.author_id AND org_id IS NULL;
    END IF;
  END LOOP;
END;
$$;


-- ============================================
-- 4. UPDATE RLS POLICIES FOR ORG-SCOPED ACCESS
-- ============================================

-- Drop existing deck_templates policies and replace with org-scoped ones
DROP POLICY IF EXISTS "Authors can manage own deck_templates" ON deck_templates;
DROP POLICY IF EXISTS "Public deck_templates readable by all" ON deck_templates;
DROP POLICY IF EXISTS "deck_templates_select" ON deck_templates;
DROP POLICY IF EXISTS "deck_templates_insert" ON deck_templates;
DROP POLICY IF EXISTS "deck_templates_update" ON deck_templates;
DROP POLICY IF EXISTS "deck_templates_delete" ON deck_templates;

-- Org members can view deck_templates in their org (+ public ones)
CREATE POLICY "deck_templates_select_v13" ON deck_templates
  FOR SELECT USING (
    visibility = 'public'
    OR (
      org_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.org_id = deck_templates.org_id
        AND organization_members.user_id = (SELECT auth.uid())
      )
    )
    OR author_id = (SELECT auth.uid()) -- Fallback for unassigned templates
  );

-- Org admins/creators/owners can create deck_templates
CREATE POLICY "deck_templates_insert_v13" ON deck_templates
  FOR INSERT WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      org_id IS NULL -- Allow during migration
      OR EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.org_id = deck_templates.org_id
        AND organization_members.user_id = (SELECT auth.uid())
        AND organization_members.role IN ('owner', 'admin', 'creator')
      )
    )
  );

-- Authors and org admins can update
CREATE POLICY "deck_templates_update_v13" ON deck_templates
  FOR UPDATE USING (
    author_id = (SELECT auth.uid())
    OR (
      org_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.org_id = deck_templates.org_id
        AND organization_members.user_id = (SELECT auth.uid())
        AND organization_members.role IN ('owner', 'admin')
      )
    )
  );

-- Authors and org admins can delete
CREATE POLICY "deck_templates_delete_v13" ON deck_templates
  FOR DELETE USING (
    author_id = (SELECT auth.uid())
    OR (
      org_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.org_id = deck_templates.org_id
        AND organization_members.user_id = (SELECT auth.uid())
        AND organization_members.role IN ('owner', 'admin')
      )
    )
  );

-- Update card_templates policies to also respect org membership
-- (card_templates inherit org scope through deck_templates.org_id)
DROP POLICY IF EXISTS "Authors can manage card_templates in own decks" ON card_templates;
DROP POLICY IF EXISTS "Public card_templates readable by all" ON card_templates;
DROP POLICY IF EXISTS "card_templates_select" ON card_templates;
DROP POLICY IF EXISTS "card_templates_insert" ON card_templates;
DROP POLICY IF EXISTS "card_templates_update" ON card_templates;
DROP POLICY IF EXISTS "card_templates_delete" ON card_templates;

CREATE POLICY "card_templates_select_v13" ON card_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deck_templates dt
      WHERE dt.id = card_templates.deck_template_id
      AND (
        dt.visibility = 'public'
        OR dt.author_id = (SELECT auth.uid())
        OR (dt.org_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.org_id = dt.org_id
          AND om.user_id = (SELECT auth.uid())
        ))
      )
    )
  );

CREATE POLICY "card_templates_modify_v13" ON card_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deck_templates dt
      WHERE dt.id = card_templates.deck_template_id
      AND (
        dt.author_id = (SELECT auth.uid())
        OR (dt.org_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.org_id = dt.org_id
          AND om.user_id = (SELECT auth.uid())
          AND om.role IN ('owner', 'admin', 'creator')
        ))
      )
    )
  );

-- Update tags policies for org-scoped access
DROP POLICY IF EXISTS "tags_all" ON tags;
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;

CREATE POLICY "tags_select_v13" ON tags
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = tags.org_id
      AND om.user_id = (SELECT auth.uid())
    ))
  );

CREATE POLICY "tags_modify_v13" ON tags
  FOR ALL USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = tags.org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin', 'creator')
    ))
  );

-- Update book_sources policies
DROP POLICY IF EXISTS "book_sources_all" ON book_sources;
DROP POLICY IF EXISTS "Users can manage own book_sources" ON book_sources;

CREATE POLICY "book_sources_v13" ON book_sources
  FOR ALL USING (
    author_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = book_sources.org_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin', 'creator')
    ))
  );


-- ============================================
-- 5. MAKE org_id NOT NULL AFTER MIGRATION
-- (Run migrate_to_multi_tenant() first, then these)
-- ============================================

-- After running: SELECT migrate_to_multi_tenant();
-- Then run:
-- ALTER TABLE deck_templates ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE tags ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE book_sources ALTER COLUMN org_id SET NOT NULL;

-- Note: Keep org_id nullable during the transition period.
-- Once all data is migrated, uncomment and run the ALTER TABLE statements above.
