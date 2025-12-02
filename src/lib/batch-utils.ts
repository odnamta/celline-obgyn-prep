/**
 * Batch Processing Utilities
 * V9.2: Helper functions for batch operations
 * 
 * Requirements: 2.3 - Batch size limit for API calls
 */

/**
 * Split an array into batches of a specified size.
 * 
 * @param items - Array of items to batch
 * @param batchSize - Maximum items per batch (default: 20)
 * @returns Array of batches
 */
export function batchArray<T>(items: T[], batchSize: number = 20): T[][] {
  if (items.length === 0) {
    return []
  }
  
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }
  return batches
}

/**
 * Process items in batches with a callback function.
 * Useful for rate-limited API calls.
 * 
 * @param items - Array of items to process
 * @param batchSize - Maximum items per batch
 * @param processor - Async function to process each batch
 * @returns Combined results from all batches
 */
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const batches = batchArray(items, batchSize)
  const results: R[] = []
  
  for (const batch of batches) {
    const batchResults = await processor(batch)
    results.push(...batchResults)
  }
  
  return results
}
