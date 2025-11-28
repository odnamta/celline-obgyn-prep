'use client'

import { useMemo } from 'react'
import { generateDayArray, type HeatmapIntensity } from '@/lib/heatmap'
import { useResponsiveDayCount } from '@/lib/use-responsive-day-count'

/**
 * StudyHeatmap Component - Client Component
 * GitHub-style contribution graph with right-aligned layout.
 * - Small screens (< 1024px): 28 days (4 rows × 7 cols)
 * - Large screens (>= 1024px): 84 days (12 rows × 7 cols)
 * - Today is always bottom-right-most square
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

interface StudyHeatmapProps {
  studyLogs: Array<{
    study_date: string
    cards_reviewed: number
  }>
}

// GitHub-style grid: always 7 columns (one week per row)
const COLS = 7

/**
 * Maps intensity level to Tailwind CSS classes for cell colors.
 * GitHub-style green gradient.
 */
function getIntensityClasses(intensity: HeatmapIntensity): string {
  switch (intensity) {
    case 0:
      return 'bg-slate-100 dark:bg-slate-800/60'
    case 1:
      return 'bg-emerald-200 dark:bg-emerald-900/70'
    case 2:
      return 'bg-emerald-400 dark:bg-emerald-700'
    case 3:
      return 'bg-emerald-600 dark:bg-emerald-500'
    default:
      return 'bg-slate-100 dark:bg-slate-800/60'
  }
}

/**
 * Formats a date string for tooltip display.
 */
function formatDateForTooltip(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function StudyHeatmap({ studyLogs }: StudyHeatmapProps) {
  // Get responsive day count (28 for mobile, 84 for desktop)
  const dayCount = useResponsiveDayCount()

  // Create a map of date -> cards_reviewed for quick lookup
  const logMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of studyLogs) {
      map.set(log.study_date, log.cards_reviewed)
    }
    return map
  }, [studyLogs])

  // Generate day array using pure function (ordered oldest to newest, today is last)
  const days = useMemo(() => {
    return generateDayArray(dayCount, logMap)
  }, [dayCount, logMap])

  // Calculate rows: 28 days = 4 rows, 84 days = 12 rows
  const rows = dayCount / COLS

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Study Activity
      </h3>
      
      {/* GitHub-style grid: right-aligned, 7 columns, today at bottom-right */}
      <div className="flex justify-end">
        <div 
          className="grid gap-[3px]"
          style={{ 
            gridTemplateColumns: `repeat(${COLS}, 12px)`,
            gridTemplateRows: `repeat(${rows}, 12px)`,
          }}
        >
          {days.map(({ date, count, intensity }) => {
            const classes = getIntensityClasses(intensity)
            
            return (
              <div
                key={date}
                className={`w-3 h-3 rounded-sm ${classes} cursor-default transition-all hover:scale-125 hover:ring-1 hover:ring-slate-400`}
                title={`${formatDateForTooltip(date)}: ${count} cards`}
                aria-label={`${formatDateForTooltip(date)}: ${count} cards reviewed`}
              />
            )
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Less</span>
        <div className="flex gap-[3px]">
          <div className={`w-3 h-3 rounded-sm ${getIntensityClasses(0)}`} title="0 cards" />
          <div className={`w-3 h-3 rounded-sm ${getIntensityClasses(1)}`} title="1-5 cards" />
          <div className={`w-3 h-3 rounded-sm ${getIntensityClasses(2)}`} title="6-15 cards" />
          <div className={`w-3 h-3 rounded-sm ${getIntensityClasses(3)}`} title="16+ cards" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
