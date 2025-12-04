'use client'

import { useRouter } from 'next/navigation'
import { Library } from 'lucide-react'
import { DeckBrowseCard } from './DeckBrowseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { BrowseDeckItem } from '@/types/database'

interface LibraryGridProps {
  decks: BrowseDeckItem[]
}

export function LibraryGrid({ decks }: LibraryGridProps) {
  const router = useRouter()

  const handleSubscribeSuccess = () => {
    router.refresh()
  }

  if (decks.length === 0) {
    return (
      <EmptyState
        icon={<Library className="h-12 w-12" />}
        title="No decks available yet"
        description="Check back later for new study materials."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => (
        <DeckBrowseCard
          key={deck.id}
          deck={deck}
          onSubscribeSuccess={handleSubscribeSuccess}
        />
      ))}
    </div>
  )
}
