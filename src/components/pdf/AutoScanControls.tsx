/**
 * V7.0: Auto-Scan Controls Component
 * Floating control bar for the auto-scan loop.
 */

'use client'

import { Play, Pause, Square, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AutoScanControlsProps {
  isScanning: boolean
  currentPage: number
  totalPages: number
  stats: { cardsCreated: number; pagesProcessed: number }
  skippedCount: number
  onStart: () => void
  onStartFresh: () => void   // V7.2: Always starts from page 1
  onResume: () => void       // V7.2: Continues from saved page
  onPause: () => void
  onStop: () => void
  onViewSkipped?: () => void
  disabled?: boolean
  canStart?: boolean  // V7.1: true only when pdfDocument && deckId && sourceId are valid
  hasResumableState?: boolean  // V7.2: true when saved state exists
  resumePage?: number          // V7.2: page number to resume from
  // V8.3: Page range props for precision scanning
  startPage?: number
  endPage?: number
  onStartPageChange?: (page: number) => void
  onEndPageChange?: (page: number) => void
}

/**
 * V8.3: Validate page range
 * Returns error message if invalid, null if valid
 */
export function validatePageRange(startPage: number, endPage: number, totalPages: number): string | null {
  if (startPage < 1) return 'Start page must be at least 1'
  if (endPage > totalPages) return `End page cannot exceed ${totalPages}`
  if (startPage > endPage) return 'Start page cannot be greater than end page'
  return null
}

export function AutoScanControls({
  isScanning,
  currentPage,
  totalPages,
  stats,
  skippedCount,
  onStart,
  onStartFresh,
  onResume,
  onPause,
  onStop,
  onViewSkipped,
  disabled = false,
  canStart = true,  // V7.1: Default to true for backwards compatibility
  hasResumableState = false,  // V7.2: Default to false
  resumePage = 1,             // V7.2: Default to page 1
  // V8.3: Page range props
  startPage = 1,
  endPage = 1,
  onStartPageChange,
  onEndPageChange,
}: AutoScanControlsProps) {
  // V8.3: Calculate progress based on range
  const rangeSize = endPage - startPage + 1
  const pagesScanned = Math.max(0, currentPage - startPage)
  const progress = rangeSize > 0 ? Math.min((pagesScanned / rangeSize) * 100, 100) : 0
  const isComplete = currentPage > endPage && !isScanning
  
  // V8.3: Validate page range
  const rangeError = validatePageRange(startPage, endPage, totalPages)
  const isRangeValid = rangeError === null

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-3 shadow-lg z-10">
      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isComplete
              ? 'bg-green-500'
              : isScanning
              ? 'bg-blue-500'
              : 'bg-slate-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* V8.3: Page range inputs */}
      {!isScanning && onStartPageChange && onEndPageChange && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-400">From:</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={startPage}
              onChange={(e) => onStartPageChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={disabled}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-400">To:</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={endPage}
              onChange={(e) => onEndPageChange(Math.min(totalPages, parseInt(e.target.value) || totalPages))}
              className="w-16 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={disabled}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({endPage - startPage + 1} pages)
          </span>
          {rangeError && (
            <span className="text-xs text-red-600 dark:text-red-400">{rangeError}</span>
          )}
        </div>
      )}

      {/* Controls row - stack on mobile */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {!isScanning ? (
            hasResumableState ? (
              <Button
                onClick={onResume}
                disabled={disabled || totalPages === 0 || !canStart || !isRangeValid}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Resume Auto-Scan (Page {resumePage})</span>
                <span className="sm:hidden">Resume</span>
              </Button>
            ) : (
              <Button
                onClick={onStart}
                disabled={disabled || totalPages === 0 || !canStart || !isRangeValid}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Start Auto-Scan (Pages {startPage}-{endPage})</span>
                <span className="sm:hidden">Start</span>
              </Button>
            )
          ) : (
            <>
              <Button
                onClick={onPause}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline">Pause</span>
              </Button>
              <Button
                onClick={onStop}
                variant="ghost"
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Square className="w-4 h-4" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            </>
          )}
        </div>

        {/* Status text */}
        <div className="flex-1 text-center sm:text-left">
          {isScanning ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Scanning page {currentPage}</span> of {endPage}...
            </p>
          ) : isComplete ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Scan complete!
            </p>
          ) : currentPage > startPage ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Paused at page {currentPage} of {endPage}
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ready to scan pages {startPage}-{endPage}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {stats.cardsCreated}
            </span>{' '}
            cards
          </span>
          
          {skippedCount > 0 && (
            <button
              onClick={onViewSkipped}
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{skippedCount}</span> skipped
            </button>
          )}
        </div>
      </div>

      {/* Mode indicator when scanning */}
      {isScanning && (
        <div className="mt-2 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Auto-Scan Active
          </span>
        </div>
      )}
    </div>
  )
}
