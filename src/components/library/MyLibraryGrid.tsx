'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { MyDeckCard } from './MyDeckCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import type { MyDeckItem } from '@/types/database'

interface MyLibraryGridProps {
  decks: MyDeckItem[]
}

export function MyLibraryGrid({ decks }: MyLibraryGridProps) {
  const router = useRouter()

  const handleUnsubscribeSuccess = () => {
    router.refresh()
  }

  if (decks.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-12 w-12" />}
        title="No decks in your library yet"
        description="Browse the library to find study materials."
        action={
          <Link href="/library">
            <Button variant="primary">Browse Library</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => (
        <MyDeckCard
          key={deck.id}
          deck={deck}
          onUnsubscribeSuccess={handleUnsubscribeSuccess}
        />
      ))}
    </div>
  )
}
