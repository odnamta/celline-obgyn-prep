'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export interface RatingButtonsProps {
  cardId: string
  onRate: (rating: 1 | 2 | 3 | 4) => Promise<void>
}

/**
 * Rating buttons component for study mode.
 * Displays Again, Hard, Good, Easy buttons and connects to rateCardAction.
 * Requirements: 4.4, 4.5, 5.4 - WCAG AA contrast in both light/dark modes
 */
export function RatingButtons({ cardId, onRate }: RatingButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    setIsLoading(true)
    try {
      await onRate(rating)
    } finally {
      setIsLoading(false)
    }
  }

  const ratings: { rating: 1 | 2 | 3 | 4; label: string; key: string; className: string }[] = [
    { rating: 1, label: 'Again', key: '1', className: 'bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-100' },
    { rating: 2, label: 'Hard', key: '2', className: 'bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/50 border border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-100' },
    { rating: 3, label: 'Good', key: '3', className: 'bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/50 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-100' },
    { rating: 4, label: 'Easy', key: '4', className: 'bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-100' },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {ratings.map(({ rating, label, key, className }) => (
        <Button
          key={rating}
          variant="secondary"
          onClick={() => handleRate(rating)}
          disabled={isLoading}
          className={`min-w-[80px] ${className}`}
        >
          <span className="flex items-center gap-1.5">
            {label}
            <kbd className="hidden sm:inline-flex items-center justify-center w-5 h-5 rounded bg-white/40 dark:bg-black/20 text-[10px] font-mono">{key}</kbd>
          </span>
        </Button>
      ))}
    </div>
  )
}
