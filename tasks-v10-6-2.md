# V10.6.2: Dashboard Performance & Actions Remediation

**Goal:** Fix the INP/Freeze issue on deck operations and clarify Delete vs. Unsubscribe actions.

---

## Current State Analysis

### Existing Implementation
- `MyDeckCard.tsx` already uses `useTransition` for unsubscribe ✅
- `DeckCard.tsx` uses `useTransition` for delete ✅
- **Problem:** `MyDeckCard` only shows "Unsubscribe" regardless of author status
- **Problem:** Authors cannot delete their own decks from the library view
- **Problem:** No optimistic UI updates (cards remain visible during server action)

---

## Fix 1: Unsubscribe vs Delete Logic (Highest Priority)

### 1.1 Update `MyDeckCard.tsx` - Author Actions
- [ ] Add dropdown menu with two options for authors:
  - "Unsubscribe" - Remove from my view, keep deck alive for other subscribers
  - "Delete Deck" - Destructive action (red), requires confirmation modal
- [ ] For non-authors (students), show only "Unsubscribe" button
- [ ] Import `deleteDeckAction` from `@/actions/deck-actions`
- [ ] Add state for dropdown visibility: `const [showMenu, setShowMenu] = useState(false)`
- [ ] Add delete confirmation state: `const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)`
- [ ] Delete warning text: "This will permanently delete the deck for ALL users. This action cannot be undone."

### 1.2 Update `MyLibraryGrid.tsx` - Callback Support
- [ ] Add `onDeleteSuccess` callback prop alongside `onUnsubscribeSuccess`
- [ ] Pass both callbacks to `MyDeckCard`

### 1.3 Ensure Library Browse View Consistency
- [ ] Verify `/library` browse view uses same action patterns for subscribed decks
- [ ] Check `BrowseDeckCard` or equivalent component for consistency

---

## Fix 2: Performance - INP Fix (High Priority)

### 2.1 Verify `useTransition` Usage
- [x] `MyDeckCard.tsx` - Already uses `useTransition` ✅
- [x] `DeckCard.tsx` - Already uses `useTransition` ✅

### 2.2 Add Loading States
- [ ] Show spinner immediately when delete/unsubscribe clicked
- [ ] Disable all action buttons during pending state
- [ ] Use `isPending` from `useTransition` to control UI

### 2.3 Button State Pattern
```tsx
// Pattern to implement:
<Button
  onClick={handleAction}
  disabled={isPending}
  className={isPending ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isPending ? <Spinner className="h-4 w-4 animate-spin" /> : 'Action'}
</Button>
```

---

## Fix 3: Optimistic Updates (Medium Priority)

### 3.1 Implement Optimistic Hide
- [ ] Add `const [isVisible, setIsVisible] = useState(true)` to `MyDeckCard`
- [ ] Set `isVisible = false` immediately on action click (before server response)
- [ ] Wrap card in conditional: `if (!isVisible) return null`
- [ ] On error, restore visibility: `setIsVisible(true)`

### 3.2 Pattern Implementation
```tsx
const handleUnsubscribe = () => {
  setIsVisible(false) // Optimistic hide
  startTransition(async () => {
    const result = await unsubscribeFromDeck(deck.id)
    if (!result.success) {
      setIsVisible(true) // Restore on error
      // Show error toast
    } else {
      onUnsubscribeSuccess?.()
    }
  })
}
```

---

## Implementation Order

1. **Fix 1.1** - Update `MyDeckCard.tsx` with author/student logic
2. **Fix 2.2** - Add loading spinners to buttons
3. **Fix 3.1** - Add optimistic hide behavior
4. **Fix 1.2** - Update `MyLibraryGrid.tsx` callbacks
5. **Fix 1.3** - Verify library browse consistency

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/library/MyDeckCard.tsx` | Add dropdown menu, delete action, optimistic UI |
| `src/components/library/MyLibraryGrid.tsx` | Add delete callback |
| `src/components/ui/Spinner.tsx` | Create if not exists |

---

## Testing Checklist

- [ ] Author can see both "Unsubscribe" and "Delete Deck" options
- [ ] Non-author only sees "Unsubscribe"
- [ ] Delete shows warning about affecting all users
- [ ] Delete requires confirmation before executing
- [ ] UI responds immediately (no freeze)
- [ ] Card disappears instantly on action (optimistic)
- [ ] Error restores card visibility
- [ ] Loading spinner shows during pending state
