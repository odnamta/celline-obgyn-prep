'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, X } from 'lucide-react'
import type { ChecklistItem } from '@/lib/setup-checklist'

const DISMISSED_KEY = 'cekatan_checklist_dismissed'

interface SetupChecklistProps {
  items: ChecklistItem[]
  onDismiss?: () => void
}

export function SetupChecklist({ items, onDismiss }: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DISMISSED_KEY)
      if (stored === 'true') {
        setDismissed(true)
      }
    }
  }, [])

  // Don't render until mounted (avoids hydration mismatch with localStorage)
  if (!mounted) return null

  const doneCount = items.filter((item) => item.done).length
  const total = items.length
  const allDone = doneCount === total

  // Hide if all items are done or user dismissed
  if (allDone || dismissed) return null

  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, 'true')
    }
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-800 dark:bg-blue-950/30 dark:shadow-none">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Mulai Menggunakan Cekatan
          </h2>
          <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
            {doneCount} dari {total} langkah selesai
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:text-blue-500 dark:hover:bg-blue-900 dark:hover:text-blue-300"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300 dark:bg-blue-400"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist items */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50 ${
                item.done
                  ? 'text-blue-400 line-through dark:text-blue-600'
                  : 'text-blue-900 dark:text-blue-100'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500 dark:text-green-400" />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
