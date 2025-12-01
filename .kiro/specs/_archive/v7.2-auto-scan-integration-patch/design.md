# Design Document: V7.2 Auto-Scan Integration Patch

## Overview

This patch addresses integration issues between Auto-Scan and Manual Scan Page discovered after V7.1. The core problem is that these two paths use different backend actions (`bulkCreateMCQV2` vs `bulkCreateMCQ`), causing inconsistent card storage. Additionally, the resume/restart UX conflates two distinct actions, and the AI generates figure-dependent questions when no image is available.

**Core Invariant**: Manual Scan Page is the ground truth. Auto-Scan must produce identical backend calls.

## Architecture

The fix aligns both paths to use `bulkCreateMCQV2`:

```
┌─────────────────────────────────────────────────────────────────┐
│                    add-bulk/page.tsx                            │
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────────────────┐   │
│  │ Manual Scan Page│         │ Auto-Scan (useAutoScan)     │   │
│  │ handleScanPage  │         │ processPage                 │   │
│  └────────┬────────┘         └────────────┬────────────────┘   │
│           │                               │                     │
│           ▼                               ▼                     │
│  ┌─────────────────┐         ┌─────────────────────────────┐   │
│  │ BatchReviewPanel│         │ (direct save, no review)    │   │
│  │ (user review)   │         │                             │   │
│  └────────┬────────┘         └────────────┬────────────────┘   │
│           │                               │                     │
│           └───────────┬───────────────────┘                     │
│                       ▼                                         │
│              ┌─────────────────────────────────────────────┐   │
│              │ bulkCreateMCQV2 (UNIFIED)                   │   │
│              │ { deckTemplateId, sessionTags, cards[] }    │   │
│              └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. BatchReviewPanel (src/components/batch/BatchReviewPanel.tsx)

**Current Issue**: Uses `bulkCreateMCQ` (V1) instead of `bulkCreateMCQV2` (V2).

**Fix**: Change import and call to use `bulkCreateMCQV2`:

```typescript
// Before:
import { bulkCreateMCQ } from '@/actions/batch-mcq-actions'
const result = await bulkCreateMCQ({ deckId, sessionTags, cards })

// After:
import { bulkCreateMCQV2 } from '@/actions/batch-mcq-actions'
const result = await bulkCreateMCQV2({ deckTemplateId: deckId, sessionTags, cards })
```

### 2. useAutoScan Hook (src/hooks/use-auto-scan.ts)

**Current Issue**: Single `startScan` function conflates fresh start and resume.

**Fix**: Split into two distinct methods:

```typescript
interface UseAutoScanReturn {
  // State (unchanged)
  isScanning: boolean
  currentPage: number
  totalPages: number
  stats: AutoScanStats
  skippedPages: SkippedPage[]
  hasResumableState: boolean
  canStart: boolean
  
  // Controls (CHANGED)
  startFresh: () => void    // NEW: Always starts from page 1, clears state
  resume: () => void        // NEW: Continues from saved page, preserves stats
  pauseScan: () => void     // UPDATED: Persists state immediately
  stopScan: () => void
  resetScan: () => void
  
  // Export
  exportLog: () => void
}
```

**startFresh behavior**:
1. Clear localStorage state for this deck/source
2. Reset `currentPage` to 1
3. Reset `stats` to initial values
4. Reset `skippedPages` to empty array
5. Set `isScanning = true`
6. Begin scan loop

**resume behavior**:
1. If no saved state, fall back to `startFresh()`
2. Keep `currentPage` at saved value (already hydrated)
3. Keep `stats` at saved values
4. Keep `skippedPages` at saved values
5. Set `isScanning = true`
6. Begin scan loop from current page

**pauseScan behavior**:
1. Set `isScanning = false`
2. Immediately call `persistState()` to save current position

### 3. AutoScanControls (src/components/pdf/AutoScanControls.tsx)

**Current Issue**: Single "Start Auto-Scan" button doesn't indicate resume state.

**Fix**: Update props and rendering:

```typescript
interface AutoScanControlsProps {
  isScanning: boolean
  currentPage: number
  totalPages: number
  stats: { cardsCreated: number; pagesProcessed: number }
  skippedCount: number
  onStartFresh: () => void   // NEW
  onResume: () => void       // NEW
  onPause: () => void
  onStop: () => void
  onViewSkipped?: () => void
  disabled?: boolean
  canStart?: boolean
  hasResumableState: boolean // NEW
  resumePage?: number        // NEW
}
```

**Button rendering logic**:
```typescript
{!isScanning && (
  hasResumableState ? (
    <Button onClick={onResume} disabled={disabled || !canStart}>
      <Play /> Resume Auto-Scan (Page {resumePage})
    </Button>
  ) : (
    <Button onClick={onStartFresh} disabled={disabled || !canStart}>
      <Play /> Start Auto-Scan (Page 1)
    </Button>
  )
)}
```

### 4. bulkCreateMCQV2 Server Action (src/actions/batch-mcq-actions.ts)

**Current Issue**: No fallback for legacy deck IDs.

**Fix**: Add smart ID resolution:

```typescript
export async function bulkCreateMCQV2(input: BulkCreateV2Input): Promise<BulkCreateResult> {
  let { deckTemplateId } = input
  
  // Step 1: Try deck_template lookup
  let { data: deckTemplate, error } = await supabase
    .from('deck_templates')
    .select('id, author_id')
    .eq('id', deckTemplateId)
    .single()
  
  // Step 2: Fallback - try user_deck lookup
  if (error || !deckTemplate) {
    const { data: userDeck } = await supabase
      .from('user_decks')
      .select('id, deck_template_id')
      .eq('id', deckTemplateId)
      .single()
    
    if (userDeck?.deck_template_id) {
      console.warn('[bulkCreateMCQV2] Legacy UserDeckID passed; resolved:', {
        originalId: deckTemplateId,
        resolvedTemplateId: userDeck.deck_template_id,
      })
      deckTemplateId = userDeck.deck_template_id
      
      // Re-fetch with resolved ID
      const resolved = await supabase
        .from('deck_templates')
        .select('id, author_id')
        .eq('id', deckTemplateId)
        .single()
      
      deckTemplate = resolved.data
    }
  }
  
  // Step 3: Final check
  if (!deckTemplate) {
    return { ok: false, error: { 
      message: `Deck template not found for id=${input.deckTemplateId}`, 
      code: 'NOT_FOUND' 
    }}
  }
  
  // ... rest of function unchanged
}
```

### 5. AI System Prompts (src/actions/batch-mcq-actions.ts)

**Current Issue**: No instruction to avoid figure-dependent questions.

**Fix**: Add figure-safety instruction:

```typescript
const FIGURE_SAFETY_INSTRUCTION = `
FIGURE REFERENCE RULE:
If the text references a Figure (e.g., "Figure 19-1", "See diagram", "as shown below") but NO image is provided in this request, DO NOT create questions that require seeing that figure. Only create questions answerable from the text alone.`

// Insert into both BATCH_EXTRACT_SYSTEM_PROMPT and BATCH_GENERATE_SYSTEM_PROMPT
// after the existing rules, before DATA_INTEGRITY_RULES
```

## Data Models

No schema changes. This patch only fixes wiring to existing tables:
- `deck_templates` - primary lookup for deck template
- `user_decks` - fallback lookup (if exists)
- `card_templates` - where MCQs are stored
- `user_card_progress` - auto-created by bulkCreateMCQV2

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Unified Backend Action
*For any* card save operation (whether from Auto-Scan or BatchReviewPanel), the system SHALL call `bulkCreateMCQV2` with `deckTemplateId` parameter.
**Validates: Requirements 1.1, 1.2**

### Property 2: Payload Shape Consistency
*For any* card payload constructed by Auto-Scan or Manual Scan, the cards array SHALL contain objects with exactly `{ stem, options, correctIndex, explanation, tagNames }` structure.
**Validates: Requirements 1.3, 1.4**

### Property 3: Error Message Contains ID
*For any* failed deck template lookup, the error message SHALL contain the originally received ID string.
**Validates: Requirements 2.4**

### Property 4: StartFresh Resets State
*For any* `startFresh()` call, the resulting state SHALL have `currentPage = 1`, `stats.cardsCreated = 0`, `stats.pagesProcessed = 0`, and `skippedPages = []`.
**Validates: Requirements 3.1**

### Property 5: Resume Preserves State
*For any* `resume()` call with saved state at page N with stats S, the resulting state SHALL have `currentPage = N` and `stats = S`.
**Validates: Requirements 3.2**

### Property 6: Pause Persists Immediately
*For any* `pauseScan()` call at page N, localStorage SHALL contain state with `currentPage = N` immediately after the call.
**Validates: Requirements 3.3**

### Property 7: Button Label Reflects State
*For any* render of AutoScanControls with `hasResumableState = true` and `resumePage = N`, the button text SHALL contain "Resume" and the number N. For `hasResumableState = false`, the button text SHALL contain "Start" and "Page 1".
**Validates: Requirements 3.4, 5.1, 5.2**

### Property 8: Disabled Without PDF
*For any* state where `pdfDocument = null` or `canStart = false`, the Start/Resume button SHALL be disabled.
**Validates: Requirements 3.5**

## Error Handling

| Error Condition | Handling |
|-----------------|----------|
| `deckTemplateId` not found in deck_templates | Try user_decks fallback |
| Fallback also fails | Return error with original ID |
| `pdfDocument` null | `canStart = false`, buttons disabled |
| `deckId` or `sourceId` empty | `canStart = false`, buttons disabled |
| Figure reference without image | AI skips figure-dependent questions |

## Testing Strategy

### Property-Based Testing

Use **fast-check** (already in project) for property-based tests.

Each property test must:
1. Be annotated with `**Feature: v7.2-auto-scan-integration-patch, Property N: <name>**`
2. Run minimum 100 iterations
3. Reference the correctness property from this design document

### Unit Tests

- Test `bulkCreateMCQV2` fallback resolution with mock user_deck
- Test button label rendering with various state combinations
- Test figure-safety instruction presence in prompts

### Integration Tests

- Verify BatchReviewPanel → bulkCreateMCQV2 call
- Verify Auto-Scan → bulkCreateMCQV2 call
- Verify localStorage persistence on pause
