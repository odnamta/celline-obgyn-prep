# Requirements Document

## Introduction

V7.2 Auto-Scan Integration Patch addresses remaining integration issues discovered after V7.1. The core problem is that Auto-Scan and Manual Scan Page use different backend actions (`bulkCreateMCQV2` vs `bulkCreateMCQ`), causing payload mismatches. Additionally, the resume/restart behavior conflates fresh starts with resumption, and the AI generates figure-dependent questions when no image is provided.

## Glossary

- **Auto-Scan**: Automated loop that processes PDF pages sequentially, extracting MCQs via AI and saving them
- **Manual Scan Page**: The existing "Scan Page" button that processes a single page and opens BatchReviewPanel
- **Ground Truth**: The manual Scan Page flow is the reference implementation; Auto-Scan must match it exactly
- **bulkCreateMCQ**: V1 server action that creates cards in the `cards` table (used by BatchReviewPanel)
- **bulkCreateMCQV2**: V2 server action that creates card_templates in the `card_templates` table (used by Auto-Scan)
- **deck_template_id**: The ID of the deck template in V2 schema
- **startFresh**: Action to begin a new scan from page 1, clearing all saved state
- **resume**: Action to continue a paused scan from the saved page, preserving stats
- **Figure Reference**: Text mentioning a figure (e.g., "See Figure 19-1") that requires visual context

## Requirements

### Requirement 1: Payload Consistency Between Auto-Scan and Manual Scan

**User Story:** As a user, I want Auto-Scan to save cards the same way Manual Scan Page does, so that my cards are stored consistently regardless of which method I use.

#### Acceptance Criteria

1. WHEN Auto-Scan calls the bulk create action THEN the System SHALL use the same action (`bulkCreateMCQV2`) that Manual Scan Page uses
2. WHEN BatchReviewPanel saves cards THEN the System SHALL call `bulkCreateMCQV2` with `deckTemplateId` (not `bulkCreateMCQ` with `deckId`)
3. WHEN Auto-Scan constructs the cards payload THEN the System SHALL include `{ stem, options, correctIndex, explanation, tagNames }` matching Manual Scan Page exactly
4. WHEN Auto-Scan passes session tags THEN the System SHALL pass `sessionTagNames` array identical to Manual Scan Page

### Requirement 2: Smart Deck ID Resolution

**User Story:** As a developer, I want the server action to handle legacy deck IDs gracefully, so that edge cases don't cause silent failures.

#### Acceptance Criteria

1. WHEN `bulkCreateMCQV2` receives an ID THEN the System SHALL first attempt to find a `deck_template` by that ID
2. WHEN deck_template lookup fails THEN the System SHALL attempt to resolve the ID as a `user_deck_id` and extract its `deck_template_id`
3. WHEN fallback resolution succeeds THEN the System SHALL log a warning with both original and resolved IDs
4. WHEN both lookups fail THEN the System SHALL return an error message including the received ID for debugging

### Requirement 3: Separate Start Fresh and Resume Actions

**User Story:** As a user, I want clear options to either start a new scan or resume a paused one, so that I don't accidentally lose my progress or restart from page 1.

#### Acceptance Criteria

1. WHEN user clicks "Start Auto-Scan" with no saved state THEN the System SHALL begin scanning from page 1 with fresh stats
2. WHEN user clicks "Resume Auto-Scan" with saved state THEN the System SHALL continue from the saved page without resetting stats
3. WHEN user pauses a scan THEN the System SHALL immediately persist the current page and stats to localStorage
4. WHEN saved state exists THEN the System SHALL display "Resume Auto-Scan (Page X)" button instead of "Start Auto-Scan"
5. WHEN no PDF is loaded THEN the System SHALL disable both Start and Resume buttons

### Requirement 4: Figure-Safety AI Prompting

**User Story:** As a user scanning text that references figures, I want the AI to skip figure-dependent questions when no image is provided, so that I don't get unanswerable MCQs.

#### Acceptance Criteria

1. WHEN source text references a figure (e.g., "Figure 19-1") and no image is provided THEN the System SHALL instruct the AI to skip questions requiring that figure
2. WHEN AI generates MCQs THEN the System SHALL only include questions answerable from the provided text alone
3. WHEN image IS provided THEN the System SHALL allow figure-dependent questions as normal

### Requirement 5: UI Label Clarity

**User Story:** As a user, I want button labels to clearly indicate what action will be taken, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN no saved state exists THEN the System SHALL display button label "Start Auto-Scan (Page 1)"
2. WHEN saved state exists at page N THEN the System SHALL display button label "Resume Auto-Scan (Page N)"
3. WHEN resume banner is shown THEN the System SHALL display "Last auto-scan stopped at Page X. Please re-select your PDF to resume from this page."
