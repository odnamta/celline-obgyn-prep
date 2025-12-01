# Implementation Plan: V7.2 Auto-Scan Integration Patch

**Ground Truth**: Manual Scan Page is the reference. Auto-Scan must call `bulkCreateMCQV2` with identical payload structure.

## Fix 1: Unify Backend Action (BLOCKER)

- [x] 1. Update BatchReviewPanel to use bulkCreateMCQV2
  - [x] 1.1 Change import from `bulkCreateMCQ` to `bulkCreateMCQV2`
    - In `src/components/batch/BatchReviewPanel.tsx`, update import statement
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Update the save call to use `deckTemplateId` parameter
    - Change `bulkCreateMCQ({ deckId, sessionTags, cards })` to `bulkCreateMCQV2({ deckTemplateId: deckId, sessionTags, cards })`
    - _Requirements: 1.2_
  - [x] 1.3 Write property test for unified backend action
    - **Property 1: Unified Backend Action**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 1.4 Write property test for payload shape consistency
    - **Property 2: Payload Shape Consistency**
    - **Validates: Requirements 1.3, 1.4**

- [x] 2. Add ground truth comment to manual scan handler
  - [x] 2.1 Add comment above `handleScanPage` in `add-bulk/page.tsx`
    - Comment: `// GROUND TRUTH: Auto-Scan must match this payload structure exactly.`
    - _Requirements: 1.1_

## Fix 2: Smart Deck ID Resolution

- [x] 3. Add fallback logic to bulkCreateMCQV2
  - [x] 3.1 Add user_decks fallback lookup after deck_templates fails
    - Query `user_decks` table by ID, extract `deck_template_id`
    - Log warning if fallback is used
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 3.2 Ensure error message includes received ID
    - Already implemented in V7.1, verify it's still present
    - _Requirements: 2.4_
  - [x] 3.3 Write property test for error message content
    - **Property 3: Error Message Contains ID**
    - **Validates: Requirements 2.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Fix 3: Separate Start Fresh and Resume

- [x] 5. Split startScan into startFresh and resume in useAutoScan
  - [x] 5.1 Implement `startFresh()` method
    - Clear localStorage state
    - Reset currentPage to 1
    - Reset stats to initial values
    - Reset skippedPages to empty array
    - Set isScanning = true
    - _Requirements: 3.1_
  - [x] 5.2 Implement `resume()` method
    - If no saved state, call startFresh()
    - Keep currentPage at saved value
    - Keep stats at saved values
    - Set isScanning = true
    - _Requirements: 3.2_
  - [x] 5.3 Update `pauseScan()` to persist immediately
    - Call `persistState()` after setting isScanning = false
    - _Requirements: 3.3_
  - [x] 5.4 Update return type to expose both methods
    - Add `startFresh` and `resume` to return object
    - Keep `startScan` as alias for backwards compatibility
    - _Requirements: 3.1, 3.2_
  - [x] 5.5 Write property test for startFresh state reset
    - **Property 4: StartFresh Resets State**
    - **Validates: Requirements 3.1**
  - [x] 5.6 Write property test for resume state preservation
    - **Property 5: Resume Preserves State**
    - **Validates: Requirements 3.2**
  - [x] 5.7 Write property test for pause persistence
    - **Property 6: Pause Persists Immediately**
    - **Validates: Requirements 3.3**

- [x] 6. Update AutoScanControls component
  - [x] 6.1 Add new props to interface
    - Add `onStartFresh`, `onResume`, `hasResumableState`, `resumePage`
    - _Requirements: 3.4, 5.1, 5.2_
  - [x] 6.2 Update button rendering logic
    - Show "Resume Auto-Scan (Page N)" when hasResumableState is true
    - Show "Start Auto-Scan (Page 1)" when hasResumableState is false
    - _Requirements: 5.1, 5.2_
  - [x] 6.3 Ensure buttons disabled when canStart is false
    - Already implemented, verify it works with new props
    - _Requirements: 3.5_
  - [x] 6.4 Write property test for button label rendering
    - **Property 7: Button Label Reflects State**
    - **Validates: Requirements 3.4, 5.1, 5.2**
  - [x] 6.5 Write property test for disabled state
    - **Property 8: Disabled Without PDF**
    - **Validates: Requirements 3.5**

- [x] 7. Wire new props in add-bulk/page.tsx
  - [x] 7.1 Update AutoScanControls usage
    - Pass `onStartFresh={autoScan.startFresh}`
    - Pass `onResume={autoScan.resume}`
    - Pass `hasResumableState={autoScan.hasResumableState}`
    - Pass `resumePage={autoScan.currentPage}`
    - _Requirements: 3.4, 5.1, 5.2_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Fix 4: Figure-Safety AI Prompting

- [x] 9. Add figure-safety instruction to AI prompts
  - [x] 9.1 Create FIGURE_SAFETY_INSTRUCTION constant
    - Add instruction about skipping figure-dependent questions when no image provided
    - _Requirements: 4.1_
  - [x] 9.2 Insert into BATCH_EXTRACT_SYSTEM_PROMPT
    - Add after existing rules, before DATA_INTEGRITY_RULES
    - _Requirements: 4.1_
  - [x] 9.3 Insert into BATCH_GENERATE_SYSTEM_PROMPT
    - Add after existing rules, before DATA_INTEGRITY_RULES
    - _Requirements: 4.1_

## Fix 5: Final Verification

- [-] 10. Manual verification
  - [x] 10.1 Test Manual Scan Page flow
    - Upload PDF, click Scan Page, save cards
    - Verify console shows bulkCreateMCQV2 call
    - _Requirements: 1.1, 1.2_
  - [-] 10.2 Test Auto-Scan flow
    - Start Auto-Scan, let it process a few pages
    - Verify console shows bulkCreateMCQV2 calls with same structure
    - _Requirements: 1.1, 1.2_
  - [-] 10.3 Test resume flow
    - Start Auto-Scan, pause at page 5
    - Refresh page, re-upload PDF
    - Verify "Resume Auto-Scan (Page 5)" button appears
    - Click resume, verify scan continues from page 5
    - _Requirements: 3.2, 5.2_
  - [x] 10.4 Test startFresh flow
    - With saved state, verify can still start fresh from page 1
    - _Requirements: 3.1, 5.1_

- [x] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
