# V10.0: The Complete Native Experience

> Transform Specialize into a polished PWA with home screen install, clinical-grade UI, and Google Login.

---

## Feature 1: PWA Infrastructure — Priority: Highest

### 1.1 Manifest & Config
- [ ] Install `next-pwa` package
- [ ] Update `next.config.ts` with PWA config
  - CRITICAL: Add `buildExcludes: [/middleware-manifest\.json$/]` for Vercel
  - Disable in dev mode
- [ ] Create `public/manifest.json` (name="Specialize", theme="#ffffff", display="standalone")
- [ ] Create placeholder icons (192x192, 512x512, apple-touch-icon)
- [ ] Add PWA meta tags to root layout

### 1.2 Install Banner
- [ ] Create `src/components/pwa/InstallBanner.tsx`
- [ ] Implement standalone mode detection
- [ ] Implement dismissal persistence (localStorage)
- [ ] iOS instructions: "Tap Share → Add to Home Screen"
- [ ] Style: Fixed bottom bar, dismissible
- [ ] Integrate into root layout

---

## Feature 2: UI & Onboarding Polish — Priority: High

### 2.1 Button Component Upgrade
- [ ] Add `variant` prop: primary (blue), secondary (slate), ghost, destructive
- [ ] Add `loading` prop with spinner (Loader2 + animate-spin)
- [ ] Ensure disabled state during loading

### 2.2 Card Component Upgrade
- [ ] Enforce: `rounded-xl`, `border-slate-200`, `shadow-sm`

### 2.3 Empty States
- [ ] Create `src/components/ui/EmptyState.tsx`
- [ ] Add to deck list: "No decks yet"
- [ ] Add to library: "No subscriptions yet"

### 2.4 Mobile Navigation
- [ ] Create `src/components/navigation/MobileNavBar.tsx`
- [ ] Items: Home, Library, Profile (fixed bottom)
- [ ] Active state highlighting (blue)
- [ ] Hide sidebar on mobile, show bottom nav

---

## Feature 3: Google Authentication — Priority: Medium

### 3.1 Login UI
- [ ] Add app logo centered above form
- [ ] Add "Continue with Google" button
- [ ] Style with Card component

### 3.2 OAuth Integration
- [ ] Implement `supabase.auth.signInWithOAuth({ provider: 'google' })`
- [ ] Set redirectTo: `/auth/callback`
- [ ] Handle and display errors
- [ ] Ensure callback redirects to `/dashboard`

---

## Technical Notes

```ts
// next.config.ts — PWA setup
import withPWA from 'next-pwa';

const config = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/], // Vercel fix
})({
  // existing config
});
```

```json
// public/manifest.json
{
  "name": "Specialize",
  "short_name": "Specialize",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Progress

| Feature | Status |
|---------|--------|
| 1.1 Manifest & Config | ⬜ |
| 1.2 Install Banner | ⬜ |
| 2.1 Button Upgrade | ⬜ |
| 2.2 Card Upgrade | ⬜ |
| 2.3 Empty States | ⬜ |
| 2.4 Mobile Navigation | ⬜ |
| 3.1 Login UI | ⬜ |
| 3.2 OAuth Integration | ⬜ |

Legend: ⬜ Not Started | 🟡 In Progress | ✅ Complete
