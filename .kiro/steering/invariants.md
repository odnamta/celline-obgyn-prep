# Agent Steering Rules & Invariants

## 1. The "V2 Only" Law (Critical)

- **Database:** NEVER read/write to legacy tables (`public.cards`, `public.decks`)
- **Architecture:** ALWAYS use the Shared Library schema:
  - Content: `deck_templates`, `card_templates` (Shared)
  - Progress: `user_decks`, `user_card_progress` (Private)
- **Code:** If you see `USE_V2_SCHEMA`, assume it is TRUE. Do not write fallback logic for V1.

## 2. Medical Data Integrity

- **Units:** NEVER convert units (e.g., lb to kg, cm to inches). Medical thresholds are specific.
- **Numbers:** Do not round or "clean up" clinical values.
- **Prompting:** When writing AI prompts, always include: "Extract verbatim. Do not invent missing values."

## 3. Tech Stack Constraints

- **Mutations:** ALL database writes must happen in **Server Actions** (`src/actions/`). Never call Supabase directly from Client Components.
- **Fetching:** Use `createSupabaseServerClient` in Server Components.
- **Styling:** Mobile-First is mandatory. Default to `flex-col` for layouts. Test for 375px width.

## 4. Study Engine Logic

- **Groundhog Day Prevention:** When updating a card review, you must calculate `next_review` > `now()`.
- **Lazy Seeding:** Do NOT create `user_card_progress` rows on subscription. Only create them when the user *answers* the card (Just-in-Time).

## 5. File Structure Enforcement

- **New Components:** Place in `src/components/[feature]/`. Do not dump in root.
- **Tests:** Property tests (`__tests__`) are required for complex logic (SRS math, Batch parsing).
