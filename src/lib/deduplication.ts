/**
 * V8.3: Deduplication utility functions
 * Pure functions for identifying duplicate cards.
 */

/**
 * V8.3: Normalize stem for comparison.
 * Converts to lowercase and trims whitespace.
 */
export function normalizeStem(stem: string | null): string {
  return (stem || '').toLowerCase().trim()
}

/**
 * V8.3: Pure function to identify duplicate cards.
 * Returns array of card IDs to delete (keeps oldest per stem).
 */
export function identifyDuplicates(
  cards: Array<{ id: string; stem: string | null; created_at: string }>
): string[] {
  // Group by normalized stem
  const stemGroups = new Map<string, typeof cards>()

  for (const card of cards) {
    const normalizedStem = normalizeStem(card.stem)
    if (!normalizedStem) continue // Skip empty stems

    const group = stemGroups.get(normalizedStem) || []
    group.push(card)
    stemGroups.set(normalizedStem, group)
  }

  // For each group with duplicates, keep oldest, mark rest for deletion
  const toDelete: string[] = []

  for (const [, group] of stemGroups) {
    if (group.length <= 1) continue // No duplicates

    // Sort by created_at ascending (oldest first)
    group.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Keep first (oldest), delete rest
    for (let i = 1; i < group.length; i++) {
      toDelete.push(group[i].id)
    }
  }

  return toDelete
}
