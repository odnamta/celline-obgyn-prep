# Requirements Document

## Introduction

V10.4 "The Complete Onboarding Overhaul" revamps the entire First Time User Experience (FTUE) through three pillars: (1) A minimalist Pinterest-style Google-only login that removes friction, (2) Smart "Zero State" dashboard that guides new users to the library instead of showing empty widgets, and (3) Library visibility controls that allow deck authors to publish content for other users to discover.

## Glossary

- **FTUE (First Time User Experience)**: The journey a new user takes from first visit through initial engagement with core features
- **Zero State**: The UI displayed when a user has no data (no cards, no subscribed decks)
- **Pinterest-Style Login**: A minimalist authentication page featuring a single OAuth button with clean typography and generous whitespace
- **Deck Visibility**: A setting controlling whether a deck template is discoverable by other users (Private/Public)
- **Library Navigation Loop**: A UX anti-pattern where new users are stuck on an empty dashboard with no clear path to content
- **Author**: The user who created a deck template and has permission to modify its settings

## Requirements

### Requirement 1

**User Story:** As a new visitor, I want a simple login page with only Google authentication, so that I can start studying without creating yet another account.

#### Acceptance Criteria

1. WHEN the login page renders THEN the System SHALL display a centered white card with shadow-lg styling
2. WHEN the login page renders THEN the System SHALL display the app logo and "Welcome to Specialize" heading
3. WHEN the login page renders THEN the System SHALL display a single "Continue with Google" button as the primary action
4. WHEN the login page renders THEN the System SHALL NOT display email/password inputs, sign-up toggles, or forgot password links
5. WHEN the login page renders THEN the System SHALL display footer text "By continuing, you agree to our Terms and Privacy Policy" with links
6. WHEN a user clicks "Continue with Google" THEN the System SHALL initiate OAuth flow via Supabase

### Requirement 2

**User Story:** As a user, I want to read the terms of service and privacy policy, so that I understand how my data is handled.

#### Acceptance Criteria

1. WHEN a user navigates to /terms THEN the System SHALL display a Terms of Service page with placeholder legal text
2. WHEN a user navigates to /privacy THEN the System SHALL display a Privacy Policy page with placeholder legal text
3. WHEN a user clicks the Terms link from the login page THEN the System SHALL open the terms page in a new tab
4. WHEN a user clicks the Privacy link from the login page THEN the System SHALL open the privacy page in a new tab

### Requirement 3

**User Story:** As a new user with no decks, I want to see a welcoming dashboard that guides me to find content, so that I know what to do next.

#### Acceptance Criteria

1. WHEN the DashboardHero renders AND totalCards equals 0 AND subscribedDecks equals 0 THEN the System SHALL display Welcome Mode
2. WHEN Welcome Mode is active THEN the System SHALL display "Welcome to Specialize. Let's find your first study deck." message
3. WHEN Welcome Mode is active THEN the System SHALL display a primary "Browse Library" button linking to /library
4. WHEN Welcome Mode is active AND the user is an admin THEN the System SHALL display a secondary "Create my own Deck" action
5. WHEN Welcome Mode is active AND the user is not an admin THEN the System SHALL hide the "Create my own Deck" action

### Requirement 4

**User Story:** As a new user, I want to be automatically directed to the library when I have no content, so that I can discover study materials immediately.

#### Acceptance Criteria

1. WHEN a user lands on /dashboard AND subscribedDecks equals 0 THEN the System SHALL redirect to /library
2. WHEN a user has at least one subscribed deck THEN the System SHALL display the normal dashboard
3. WHEN error or empty state pages render THEN the System SHALL ensure "Go to Dashboard" buttons use correct navigation

### Requirement 5

**User Story:** As a deck author, I want to control whether my deck is visible to other users, so that I can publish content when it's ready.

#### Acceptance Criteria

1. WHEN the DeckSettingsModal renders for a deck author THEN the System SHALL display a Visibility toggle
2. WHEN the Visibility toggle is set to "Private" THEN the System SHALL hide the deck from other users in the library
3. WHEN the Visibility toggle is set to "Public" THEN the System SHALL make the deck discoverable by all users in the library
4. WHEN a non-author views the DeckSettingsModal THEN the System SHALL hide the Visibility toggle
5. WHEN the author changes visibility THEN the System SHALL persist the setting to the deck_templates table

