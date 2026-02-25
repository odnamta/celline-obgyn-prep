import type { Card } from './database';

/**
 * @deprecated Use ActionResultV2 instead. This type uses { success: true/false }
 * which is being phased out in favor of { ok: true/false }.
 */
export type ActionResult =
  | { success: true; data?: unknown }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * V11.5: New standardized action result type.
 * Prefer this over ActionResult for new server actions.
 */
export type ActionResultV2<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type NextCardResult =
  | { ok: true; nextCard: Card | null; remainingCount: number }
  | { ok: false; error: string };

/**
 * V11.6: Draft card summary for Drafts Workspace
 * Used by getDeckDrafts and DeckDraftsPanel component.
 * 
 * **Feature: v11.6-bulk-import-reliability**
 * **Validates: Requirements 1.2**
 */
export interface DraftCardSummary {
  id: string
  questionNumber: number | null
  stem: string
  tags: Array<{ id: string; name: string; color: string; category: string }>
  importSessionId: string | null
  createdAt: string
}


/**
 * V11.7: Dashboard insights for companion-style dashboard.
 * Contains due count, weakest concepts, and optional reviewed today count.
 * 
 * **Feature: v11.7-companion-dashboard-tag-filtered-study**
 * **Validates: Requirements 4.2**
 */
export interface DashboardInsights {
  dueCount: number
  weakestConcepts: WeakestConceptSummary[]
  reviewedToday?: number
}

/**
 * V11.7: Weakest concept summary for dashboard display.
 */
export interface WeakestConceptSummary {
  tagId: string
  tagName: string
  accuracy: number
  totalAttempts: number
  isLowConfidence: boolean
}

export type DashboardInsightsResult = ActionResultV2<DashboardInsights>
