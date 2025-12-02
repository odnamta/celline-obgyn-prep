-- V9: Add tag category enum for 3-tier taxonomy
-- Categories: source (textbook), topic (chapter/domain), concept (specific medical concept)

-- Create the enum type
DO $$ BEGIN
  CREATE TYPE tag_category AS ENUM ('source', 'topic', 'concept');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add category column to tags table with default 'concept'
ALTER TABLE tags ADD COLUMN IF NOT EXISTS category tag_category NOT NULL DEFAULT 'concept';

-- Migrate all existing tags to 'concept' category (they were flat tags before)
UPDATE tags SET category = 'concept' WHERE category IS NULL;

-- Create index for efficient category filtering
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- Add comment for documentation
COMMENT ON COLUMN tags.category IS 'V9: Tag category - source (textbook), topic (chapter), concept (medical concept)';
