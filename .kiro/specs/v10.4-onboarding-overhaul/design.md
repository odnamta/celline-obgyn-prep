# Design Document: V10.4 Complete Onboarding Overhaul

## Overview

V10.4 revamps the First Time User Experience (FTUE) through three pillars: a minimalist Pinterest-style Google-only login, smart "Zero State" dashboard that guides new users to content, and library visibility controls for deck authors. This creates a frictionless onboarding flow that gets users studying faster.

## Architecture

### Component Hierarchy

```
LoginPage (Simplified)
├── AppLogo
├── WelcomeHeading
├── GoogleSignInButton
└── LegalFooter (Terms + Privacy links)

DashboardPage
├── ZeroStateCheck (redirect logic)
└── DashboardHero
    ├── WelcomeMode (if zero state)
    │   ├── WelcomeMessage
    │   ├── BrowseLibraryButton
    │   └── CreateDeckButton (admin only)
    └── NormalMode (existing)

DeckDetailPage
└── DeckSettingsModal (author only)
    └── VisibilityToggle
```

### Data Flow

```mermaid
flowchart TD
    A[User visits /login] --> B{Has account?}
    B -->|No| C[Click Google Sign In]
    B -->|Yes| C
    C --> D[Supabase OAuth]
    D --> E[/auth/callback]
    E --> F[/dashboard]
    F --> G{subscribedDecks == 0?}
    G -->|Yes| H[Redirect to /library]
    G -->|No| I[Show Normal Dashboard]
    
    J[Author opens deck] --> K[DeckSettingsModal]
    K --> L[Toggle Visibility]
    L --> M[updateDeckVisibility Action]
    M --> N[deck_templates.visibility updated]
```

## Components and Interfaces

### LoginPage (Refactored)

```typescript
// src/app/(auth)/login/page.tsx
// Simplified to Google-only authentication

export default function LoginPage() {
  // Remove: email/password form, mode toggle, register action
  // Keep: Google OAuth button, error handling
  // Add: Legal footer with Terms/Privacy links
}
```

### LegalFooter Component

```typescript
// src/components/auth/LegalFooter.tsx
export function LegalFooter() {
  // Renders: "By continuing, you agree to our Terms and Privacy Policy"
  // Links open in new tab (target="_blank")
}
```

### DashboardHero (Extended)

```typescript
// src/components/dashboard/DashboardHero.tsx
export interface DashboardHeroProps {
  globalDueCount: number
  completedToday: number
  dailyGoal: number | null
  currentStreak: number
  hasNewCards: boolean
  userName?: string
  subscribedDecks: number  // NEW: for zero state detection
  isAdmin?: boolean        // NEW: for create deck button
}

// Logic: if subscribedDecks === 0 && globalDueCount === 0 -> Welcome Mode
```

### VisibilityToggle Component

```typescript
// src/components/decks/VisibilityToggle.tsx
interface VisibilityToggleProps {
  deckId: string
  currentVisibility: DeckVisibility
  isAuthor: boolean
  onVisibilityChange?: (newVisibility: DeckVisibility) => void
}

export function VisibilityToggle({ 
  deckId, 
  currentVisibility, 
  isAuthor,
  onVisibilityChange 
}: VisibilityToggleProps)
```

### Server Actions

```typescript
// src/actions/deck-actions.ts (additions)

/**
 * Updates deck visibility (author only)
 */
export async function updateDeckVisibilityAction(
  deckId: string,
  visibility: DeckVisibility
): Promise<ActionResult>
```

### Utility Functions

```typescript
// src/lib/onboarding-utils.ts

/**
 * Determines if user should see Welcome Mode
 */
export function shouldShowWelcomeMode(
  subscribedDecks: number,
  totalCards: number
): boolean

/**
 * Determines if user should be redirected to library
 */
export function shouldRedirectToLibrary(subscribedDecks: number): boolean

/**
 * Checks if user is admin (can create decks)
 */
export function isUserAdmin(userId: string, adminIds: string[]): boolean
```

## Data Models

### Existing Types (unchanged)

```typescript
// src/types/database.ts
export type DeckVisibility = 'private' | 'public'

export interface DeckTemplate {
  id: string
  title: string
  description: string | null
  visibility: DeckVisibility  // Already exists
  author_id: string
  // ...
}
```

### New Route Pages

```typescript
// src/app/(auth)/terms/page.tsx
// src/app/(auth)/privacy/page.tsx
// Static pages with placeholder legal text
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Welcome Mode activation

*For any* combination of subscribedDecks and totalCards values, `shouldShowWelcomeMode` returns true if and only if both subscribedDecks equals 0 AND totalCards equals 0.

**Validates: Requirements 3.1**

### Property 2: Admin-conditional Create Deck visibility

*For any* user in Welcome Mode, the "Create my own Deck" action is visible if and only if the user is an admin.

**Validates: Requirements 3.4, 3.5**

### Property 3: Zero-deck redirect logic

*For any* user with subscribedDecks count, `shouldRedirectToLibrary` returns true if and only if subscribedDecks equals 0.

**Validates: Requirements 4.1, 4.2**

### Property 4: Author-conditional Visibility toggle

*For any* user viewing a deck, the Visibility toggle is visible if and only if the user's ID matches the deck's author_id.

**Validates: Requirements 5.1, 5.4**

### Property 5: Private deck filtering

*For any* deck with visibility="private" and any user who is not the author, the deck should not appear in that user's library browse results.

**Validates: Requirements 5.2, 5.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Google OAuth fails | Display error message, keep user on login page |
| User has no subscribed decks | Redirect to /library instead of empty dashboard |
| Non-author tries to change visibility | Hide toggle, reject action server-side |
| Visibility update fails | Show error toast, revert toggle state |

## Testing Strategy

### Property-Based Testing

Use **fast-check** library for property-based tests. Each property test should run a minimum of 100 iterations.

Property tests will be located in `src/__tests__/onboarding-v10.4.property.test.ts`.

Each test must be tagged with the format: `**Feature: v10.4-onboarding-overhaul, Property {number}: {property_text}**`

### Unit Tests

Unit tests cover specific examples and edge cases:

- LoginPage renders only Google button (no email/password)
- Terms and Privacy pages render with placeholder content
- Links open in new tab (target="_blank" attribute)
- DashboardHero shows Welcome Mode when subscribedDecks=0
- VisibilityToggle hidden for non-authors
- updateDeckVisibilityAction rejects non-author requests

### Integration Points

- Verify Google OAuth flow completes successfully
- Verify redirect from /dashboard to /library works
- Verify visibility changes persist to database
- Verify library filtering respects visibility setting
