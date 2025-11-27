'use client'

import Link from 'next/link'
import { MarkdownContent } from './MarkdownContent'
import { Button } from '@/components/ui/Button'
import type { Card, MCQCard } from '@/types/database'

export interface MistakeRecord {
  card: Card
  selectedIndex: number
}

export interface LessonSummaryProps {
  lessonId: string
  courseId: string
  totalItems: number
  correctCount: number
  mistakes: MistakeRecord[]
  bestScore: number
  isNewBest: boolean
}

/**
 * LessonSummary component for displaying lesson completion results.
 * Requirements: 5.5
 * - Display score (correct/total)
 * - List mistakes with correct answers
 * - Show "Repeat Lesson" and "Continue" buttons
 */
export function LessonSummary({
  lessonId,
  courseId,
  totalItems,
  correctCount,
  mistakes,
  bestScore,
  isNewBest,
}: LessonSummaryProps) {
  const scorePercent = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0
  const isPerfect = correctCount === totalItems

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Score card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-none text-center mb-6">
        {/* Celebration emoji */}
        <div className="text-4xl mb-4">
          {isPerfect ? '🎉' : scorePercent >= 70 ? '👍' : '💪'}
        </div>

        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Lesson Complete!
        </h2>

        {/* Score display */}
        <div className="mb-4">
          <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {correctCount}
          </span>
          <span className="text-2xl text-slate-500 dark:text-slate-400">
            {' / '}{totalItems}
          </span>
          <span className="ml-2 text-lg text-slate-600 dark:text-slate-400">
            ({scorePercent}%)
          </span>
        </div>

        {/* Score breakdown */}
        <div className="flex justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {correctCount}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {mistakes.length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Incorrect</div>
          </div>
        </div>

        {/* Best score indicator */}
        {isNewBest && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full text-yellow-700 dark:text-yellow-400 text-sm font-medium mb-4">
            🏆 New Best Score!
          </div>
        )}

        {!isNewBest && (
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Best score: {bestScore}/{totalItems}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
          <Link href={`/lesson/${lessonId}`}>
            <Button variant="secondary" size="lg">
              Repeat Lesson
            </Button>
          </Link>
          <Link href={`/course/${courseId}`}>
            <Button size="lg">
              Continue
            </Button>
          </Link>
        </div>
      </div>

      {/* Mistakes review section */}
      {mistakes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Review Your Mistakes
          </h3>

          <div className="space-y-4">
            {mistakes.map((mistake, index) => (
              <MistakeCard key={index} mistake={mistake} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface MistakeCardProps {
  mistake: MistakeRecord
  index: number
}

function MistakeCard({ mistake, index }: MistakeCardProps) {
  const { card, selectedIndex } = mistake
  const isMCQ = card.card_type === 'mcq'

  if (isMCQ) {
    const mcqCard = card as MCQCard
    const correctAnswer = mcqCard.options[mcqCard.correct_index]
    const selectedAnswer = selectedIndex >= 0 ? mcqCard.options[selectedIndex] : 'N/A'

    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
          Question {index + 1}
        </div>
        
        {/* Question stem */}
        <div className="text-slate-900 dark:text-slate-100 mb-3">
          <MarkdownContent content={mcqCard.stem} />
        </div>

        {/* Your answer vs correct answer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-red-600 dark:text-red-400 font-medium">Your answer: </span>
            <span className="text-slate-700 dark:text-slate-300">{selectedAnswer}</span>
          </div>
          <div>
            <span className="text-green-600 dark:text-green-400 font-medium">Correct answer: </span>
            <span className="text-slate-700 dark:text-slate-300">{correctAnswer}</span>
          </div>
        </div>

        {/* Explanation if available */}
        {mcqCard.explanation && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
              Explanation
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-200">
              <MarkdownContent content={mcqCard.explanation} />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Flashcard mistake
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
        Card {index + 1}
      </div>
      
      {/* Front */}
      <div className="text-slate-900 dark:text-slate-100 mb-2">
        <MarkdownContent content={card.front} />
      </div>

      {/* Back (correct answer) */}
      <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
        <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
          Answer
        </div>
        <div className="text-sm text-green-700 dark:text-green-200">
          <MarkdownContent content={card.back} />
        </div>
      </div>
    </div>
  )
}
