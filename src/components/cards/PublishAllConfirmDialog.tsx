'use client'

import { Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PublishAllConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  draftCount: number
  isPublishing: boolean
}

/**
 * V11.4: Publish All Confirmation Dialog
 * Shows confirmation before publishing all draft cards in a deck.
 * Requirements: 4.2
 */
export function PublishAllConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  draftCount,
  isPublishing,
}: PublishAllConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Send className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 text-center mb-2">
          Publish All Draft Cards?
        </h2>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
          This will publish all <span className="font-semibold text-blue-600 dark:text-blue-400">{draftCount}</span> draft card{draftCount !== 1 ? 's' : ''} in this deck. 
          Published cards will be visible in study sessions.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPublishing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPublishing}
            className="flex-1"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish All
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
