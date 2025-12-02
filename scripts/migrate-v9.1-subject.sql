-- V9.1: Add subject column to deck_templates for multi-specialty AI support
-- This enables deck authors to specify the medical specialty for AI-generated MCQs

-- Add subject column with default value for backward compatibility
ALTER TABLE deck_templates 
ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Obstetrics & Gynecology';

-- Backfill existing rows that might have NULL subject
-- (This handles any edge cases where the default wasn't applied)
UPDATE deck_templates 
SET subject = 'Obstetrics & Gynecology' 
WHERE subject IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN deck_templates.subject IS 'V9.1: Medical specialty/subject for AI prompt customization (e.g., Obstetrics & Gynecology, Internal Medicine)';
