'use client'

import { useState } from 'react'
import { CreateCardForm } from './CreateCardForm'
import { CreateMCQForm } from './CreateMCQForm'

interface CardFormTabsProps {
  deckId: string
}

type TabType = 'flashcard' | 'mcq'

/**
 * Client Component for tabbed card creation forms.
 * Allows switching between flashcard and MCQ creation modes.
 * Requirements: 3.1
 */
export function CardFormTabs({ deckId }: CardFormTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('flashcard')

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('flashcard')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'flashcard'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Add Flashcard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mcq')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'mcq'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Add MCQ
        </button>
      </div>

      {/* Form content */}
      {activeTab === 'flashcard' ? (
        <CreateCardForm deckId={deckId} />
      ) : (
        <CreateMCQForm deckId={deckId} />
      )}
    </div>
  )
}
