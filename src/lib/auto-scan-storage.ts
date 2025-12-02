/**
 * V8.3: Auto-Scan localStorage utilities
 * 
 * Extracted from use-auto-scan.ts to enable testing without server-side imports.
 */

// ============================================
// Types
// ============================================

export interface AutoScanStats {
  cardsCreated: number
  pagesProcessed: number
  errorsCount: number
}

export interface SkippedPage {
  pageNumber: number
  reason: string
}

export interface AutoScanState {
  isScanning: boolean
  currentPage: number
  totalPages: number
  stats: AutoScanStats
  skippedPages: SkippedPage[]
  consecutiveErrors: number
  lastUpdated: number
}

// ============================================
// localStorage Helpers
// ============================================

export function getStorageKey(deckId: string, sourceId: string): string {
  return `autoscan_state_${deckId}_${sourceId}`
}

export function saveAutoScanState(
  deckId: string,
  sourceId: string,
  state: AutoScanState
): void {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey(deckId, sourceId)
    localStorage.setItem(key, JSON.stringify(state))
  } catch (err) {
    console.warn('[useAutoScan] Failed to save state to localStorage:', err)
  }
}

/**
 * V8.3: Validates that parsed object has the expected AutoScanState shape.
 * Returns true if valid, false otherwise.
 */
export function isValidAutoScanState(obj: unknown): obj is AutoScanState {
  if (!obj || typeof obj !== 'object') return false
  const state = obj as Record<string, unknown>
  
  // Check required fields exist and have correct types
  if (typeof state.isScanning !== 'boolean') return false
  if (typeof state.currentPage !== 'number') return false
  if (typeof state.totalPages !== 'number') return false
  if (typeof state.consecutiveErrors !== 'number') return false
  if (typeof state.lastUpdated !== 'number') return false
  
  // Check stats object
  if (!state.stats || typeof state.stats !== 'object') return false
  const stats = state.stats as Record<string, unknown>
  if (typeof stats.cardsCreated !== 'number') return false
  if (typeof stats.pagesProcessed !== 'number') return false
  if (typeof stats.errorsCount !== 'number') return false
  
  // Check skippedPages array
  if (!Array.isArray(state.skippedPages)) return false
  
  return true
}

export function clearAutoScanState(deckId: string, sourceId: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey(deckId, sourceId)
    localStorage.removeItem(key)
  } catch (err) {
    console.warn('[useAutoScan] Failed to clear state from localStorage:', err)
  }
}

/**
 * V8.3: Load auto-scan state from localStorage with corruption recovery.
 * If JSON is corrupted or shape is invalid, clears the entry and returns null.
 */
export function loadAutoScanState(
  deckId: string,
  sourceId: string
): AutoScanState | null {
  if (typeof window === 'undefined') return null
  try {
    const key = getStorageKey(deckId, sourceId)
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    
    // V8.3: Validate shape before returning
    if (!isValidAutoScanState(parsed)) {
      console.warn('[useAutoScan] Invalid state shape in localStorage, clearing')
      clearAutoScanState(deckId, sourceId)
      return null
    }
    
    return parsed
  } catch (err) {
    // V8.3: Corrupted JSON - clear it and return null instead of throwing
    console.warn('[useAutoScan] Corrupted localStorage, clearing:', err)
    try {
      clearAutoScanState(deckId, sourceId)
    } catch {
      // Ignore errors during cleanup
    }
    return null
  }
}
