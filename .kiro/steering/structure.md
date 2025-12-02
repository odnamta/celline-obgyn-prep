# Project Structure

```
src/
├── actions/          # Server Actions (mutations)
├── app/              # Next.js App Router
│   ├── (app)/        # Authenticated routes (dashboard, study, decks, etc.)
│   ├── (auth)/       # Auth routes (login)
│   └── api/          # API routes
├── components/       # React components
│   ├── ai/           # AI-related (image upload, mode toggle)
│   ├── batch/        # Batch card creation
│   ├── cards/        # Card CRUD components
│   ├── course/       # Course hierarchy
│   ├── dashboard/    # Dashboard widgets (heatmap, hero)
│   ├── decks/        # Deck management
│   ├── library/      # Shared library browsing
│   ├── pdf/          # PDF viewer & scanning
│   ├── providers/    # Context providers (theme)
│   ├── study/        # Study session components
│   ├── tags/         # Tag management
│   └── ui/           # Reusable primitives (Button, Card, Input, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Pure functions & utilities
│   └── supabase/     # Supabase client setup (client.ts, server.ts)
├── types/            # TypeScript type definitions
│   ├── actions.ts    # Server action result types
│   ├── database.ts   # Database entity types
│   └── session.ts    # Study session types
├── utils/            # Legacy utilities
└── __tests__/        # Property-based tests (*.property.test.ts)

scripts/              # Database scripts (migrations, seed data)
schema.sql            # Full database schema with RLS policies
```

## Conventions

### Server Actions
- Located in `src/actions/`
- Use `'use server'` directive
- Return `ActionResult` type: `{ success: boolean; error?: string; data?: T }`
- Validate with Zod schemas from `src/lib/validations.ts`
- Always verify user authentication and authorization

### Components
- Functional components with TypeScript
- Props interfaces defined inline or in same file
- Client components use `'use client'` directive
- Server components are default (no directive needed)

### Database Access
- Server: `createSupabaseServerClient()` from `@/lib/supabase/server`
- Client: `createSupabaseBrowserClient()` from `@/lib/supabase/client`
- Always use RLS - never bypass with service role in app code

### Testing
- Property-based tests using fast-check
- Test files: `src/__tests__/*.property.test.ts`
- Focus on invariants and correctness properties
- Document which requirements each property validates

### Types
- Database types in `src/types/database.ts`
- Keep types close to their usage when component-specific
- Use discriminated unions for card types (`CardType = 'flashcard' | 'mcq'`)
