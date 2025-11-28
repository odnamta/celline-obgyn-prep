'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Library } from 'lucide-react'
// CourseCard import commented out - courses hidden until AI Course Generator is built
// import { CourseCard } from '@/components/course/CourseCard'
import { DeckCard } from '@/components/decks/DeckCard'
import { CreateDeckForm } from '@/components/decks/CreateDeckForm'
// CourseWithProgress type commented out - courses hidden
// import type { CourseWithProgress } from '@/components/course/CourseCard'
import type { DeckWithDueCount } from '@/types/database'

export interface LibrarySectionProps {
  // courses prop kept for API compatibility but not rendered
  courses?: unknown[]
  decks: DeckWithDueCount[]
  defaultExpanded?: boolean
}

/**
 * LibrarySection Component
 * 
 * Collapsible section containing decks listing.
 * Courses section is completely hidden until AI Course Generator is built.
 * 
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2
 * - ALL courses rendering logic hidden (Req 2.1, 2.2)
 * - Create Course button hidden (Req 2.2)
 * - Only Decks section shown (Req 2.3)
 * - No floating Add Deck button (Req 3.1, 3.2)
 */
export function LibrarySection({
  // courses parameter ignored - hidden until AI Course Generator
  decks,
  defaultExpanded = false,
}: LibrarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="library-content"
      >
        <div className="flex items-center gap-2">
          <Library className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <span className="font-medium text-slate-900 dark:text-slate-100">
            Library &amp; Content
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({decks.length} decks)
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div id="library-content" className="p-4 bg-white dark:bg-slate-900/50">
          {/* 
           * COURSES SECTION HIDDEN - Req 2.1, 2.2, 2.3
           * Uncomment when AI Course Generator is built
           * 
           * {courses.length > 0 && (
           *   <div className="mb-8">
           *     <h3>Courses</h3>
           *     {courses.map(course => <CourseCard key={course.id} course={course} />)}
           *   </div>
           * )}
           */}

          {/* Decks Section - Only section shown (Req 2.3) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Decks
              </h3>
              {/* No floating Add Deck button - Req 3.1, 3.2 */}
            </div>

            {/* Create Deck Form - inline only */}
            <div 
              id="add-deck-form" 
              className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <CreateDeckForm />
            </div>

            {decks.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
                No decks yet. Create your first deck above!
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {decks.map((deck) => (
                  <DeckCard key={deck.id} deck={deck} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
