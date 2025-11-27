import type { Source, DeckSource, Deck } from '@/types/database';

/**
 * Represents a source linked to a deck with the linking record.
 */
export interface LinkedSource {
  source: Source;
  deckSource: DeckSource;
}

/**
 * Filters sources that are linked to a specific deck.
 * This is a pure function that simulates the database query logic.
 * 
 * Requirements: 8.3, 9.3
 */
export function filterSourcesForDeck(
  deckId: string,
  sources: Source[],
  deckSources: DeckSource[]
): Source[] {
  // Get all source IDs linked to this deck
  const linkedSourceIds = new Set(
    deckSources
      .filter(ds => ds.deck_id === deckId)
      .map(ds => ds.source_id)
  );

  // Return sources that are linked to this deck
  return sources.filter(source => linkedSourceIds.has(source.id));
}

/**
 * Checks if a source is linked to a deck.
 * 
 * Requirements: 8.3
 */
export function isSourceLinkedToDeck(
  sourceId: string,
  deckId: string,
  deckSources: DeckSource[]
): boolean {
  return deckSources.some(
    ds => ds.source_id === sourceId && ds.deck_id === deckId
  );
}

/**
 * Creates a deck_source link record.
 * Returns null if the link already exists.
 * 
 * Requirements: 9.3
 */
export function createDeckSourceLink(
  sourceId: string,
  deckId: string,
  existingDeckSources: DeckSource[]
): DeckSource | null {
  // Check if link already exists
  if (isSourceLinkedToDeck(sourceId, deckId, existingDeckSources)) {
    return null;
  }

  // Create new link record
  return {
    id: crypto.randomUUID(),
    deck_id: deckId,
    source_id: sourceId,
    created_at: new Date().toISOString(),
  };
}

/**
 * Validates that a deck_source record correctly links a source to a deck.
 * 
 * Requirements: 8.3
 */
export function validateDeckSourceLink(
  deckSource: DeckSource,
  source: Source,
  deck: Deck
): { valid: boolean; error?: string } {
  if (deckSource.source_id !== source.id) {
    return { valid: false, error: 'DeckSource source_id does not match source id' };
  }

  if (deckSource.deck_id !== deck.id) {
    return { valid: false, error: 'DeckSource deck_id does not match deck id' };
  }

  return { valid: true };
}

/**
 * Gets all sources linked to a deck, with their linking records.
 * 
 * Requirements: 8.3
 */
export function getLinkedSourcesForDeck(
  deckId: string,
  sources: Source[],
  deckSources: DeckSource[]
): LinkedSource[] {
  const linkedDeckSources = deckSources.filter(ds => ds.deck_id === deckId);
  
  return linkedDeckSources
    .map(ds => {
      const source = sources.find(s => s.id === ds.source_id);
      if (!source) return null;
      return { source, deckSource: ds };
    })
    .filter((ls): ls is LinkedSource => ls !== null);
}
