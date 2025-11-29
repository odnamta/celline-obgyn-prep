'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCard } from '@/actions/card-actions'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import type { Card } from '@/types/database'

interface EditCardFormProps {
  card: Card
  deckId: string
}

/**
 * EditCardForm - Client component for editing flashcards and MCQs
 * Requirements: FR-2.1–FR-2.5
 */
export function EditCardForm({ card, deckId }: EditCardFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isMCQ = card.card_type === 'mcq'

  // Flashcard state
  const [front, setFront] = useState(card.front || '')
  const [back, setBack] = useState(card.back || '')
  const [imageUrl, setImageUrl] = useState(card.image_url || '')

  // MCQ state
  const [stem, setStem] = useState(card.stem || '')
  const [options, setOptions] = useState<string[]>(
    Array.isArray(card.options) ? card.options : ['', '', '', '', '']
  )
  const [correctIndex, setCorrectIndex] = useState(card.correct_index ?? 0)
  const [explanation, setExplanation] = useState(card.explanation || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = isMCQ
        ? await updateCard({
            cardId: card.id,
            type: 'mcq',
            stem,
            options: options.filter(o => o.trim()),
            correctIndex,
            explanation,
          })
        : await updateCard({
            cardId: card.id,
            type: 'flashcard',
            front,
            back,
            imageUrl,
          })

      if (result.ok) {
        showToast('Card updated', 'success')
        router.push(`/decks/${deckId}`)
        router.refresh()
      } else {
        showToast(result.error || 'Could not save changes', 'error')
      }
    } catch {
      showToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    setOptions(prev => {
      const newOptions = [...prev]
      newOptions[index] = value
      return newOptions
    })
  }

  if (isMCQ) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Stem */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Question Stem
          </label>
          <textarea
            value={stem}
            onChange={(e) => setStem(e.target.value)}
            placeholder="Enter the question..."
            rows={3}
            required
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Answer Options
          </label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-6">
                {String.fromCharCode(65 + index)}.
              </span>
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Explanation (optional)
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain why the correct answer is correct..."
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  // Flashcard form
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Front */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Front (Question)
        </label>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Enter the question or prompt..."
          rows={3}
          required
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* Back */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Back (Answer)
        </label>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Enter the answer..."
          rows={3}
          required
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Image URL (optional)
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
