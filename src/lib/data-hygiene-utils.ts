/**
 * Data Hygiene Utilities
 * V9.2: Helper functions for data hygiene features
 * 
 * Requirements: 1.2, 1.3, 3.2
 */

interface CardWithTags {
  id: string
  tags: Array<{ id: string; name: string }>
}

/**
 * Filter cards to show only untagged cards.
 * 
 * Requirements: 1.2, 1.3
 * 
 * @param cards - Array of cards with tags
 * @param showUntaggedOnly - Whether to filter to untagged only
 * @returns Filtered array of cards
 */
export function filterUntaggedCards<T extends CardWithTags>(
  cards: T[],
  showUntaggedOnly: boolean
): T[] {
  if (!showUntaggedOnly) {
    return cards
  }
  return cards.filter(card => card.tags.length === 0)
}

/**
 * Count untagged cards in an array.
 * 
 * @param cards - Array of cards with tags
 * @returns Number of untagged cards
 */
export function countUntaggedCards<T extends CardWithTags>(cards: T[]): number {
  return cards.filter(card => card.tags.length === 0).length
}

/**
 * Determine if the merge button should be shown/enabled.
 * 
 * Requirements: 3.2
 * 
 * @param selectedTagIds - Array of selected tag IDs
 * @returns true if merge button should be enabled
 */
export function shouldShowMergeButton(selectedTagIds: string[]): boolean {
  return selectedTagIds.length >= 2
}

/**
 * Simulate tag merge operation for testing.
 * Replaces source tags with target tag and deduplicates.
 * 
 * @param tagIds - Original tag IDs on a card
 * @param sourceTagIds - Tag IDs being merged away
 * @param targetTagId - Tag ID to merge into
 * @returns Deduplicated tag IDs after merge
 */
export function simulateTagMerge(
  tagIds: string[],
  sourceTagIds: string[],
  targetTagId: string
): string[] {
  const merged = tagIds.map(tagId => 
    sourceTagIds.includes(tagId) ? targetTagId : tagId
  )
  return [...new Set(merged)]
}
