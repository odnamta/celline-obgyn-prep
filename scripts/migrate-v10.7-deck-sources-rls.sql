-- Migration: v10.7 - Fix deck_sources RLS policy
-- Aligns WITH CHECK with the cards insert policy pattern

ALTER POLICY "Users can manage deck_sources for own decks"
ON public.deck_sources
USING (
  EXISTS (
    SELECT 1 FROM decks
    WHERE decks.id = deck_sources.deck_id
      AND decks.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM decks
    WHERE decks.id = deck_sources.deck_id
      AND decks.user_id = auth.uid()
  )
);
