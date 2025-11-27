'use client'

import { useState, useRef } from 'react'
import { uploadSourceAction } from '@/actions/source-actions'
import { Button } from '@/components/ui/Button'
import type { Source } from '@/types/database'

interface PDFUploadSectionProps {
  deckId: string
  linkedSource: Source | null
}

/**
 * Client Component for PDF upload section on bulk import page.
 * Displays "Upload PDF" button if no source linked, or shows linked source info.
 * Requirements: 9.1, 9.4
 */
export function PDFUploadSection({ deckId, linkedSource }: PDFUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSource, setCurrentSource] = useState<Source | null>(linkedSource)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.pdf$/i, ''))
      formData.append('deckId', deckId)

      const result = await uploadSourceAction(formData)

      if (!result.success) {
        setError(result.error || 'Upload failed')
      } else if (result.data) {
        setCurrentSource(result.data as Source)
      }
    } catch (err) {
      // Extract meaningful error message from the exception
      console.error('PDF upload error:', err)
      let errorMessage = 'An unexpected error occurred'
      if (err instanceof Error) {
        // Check for common Next.js/network errors
        if (err.message.includes('Body exceeded') || err.message.includes('413')) {
          errorMessage = 'File too large. Maximum size is 50MB.'
        } else if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Extract filename from metadata if available
  const getFilename = (source: Source): string => {
    const metadata = source.metadata as { original_filename?: string } | null
    return metadata?.original_filename || source.title
  }

  // If source is linked, show source info
  if (currentSource) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start gap-3">
          {/* PDF icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
              Source PDF Linked
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300 font-medium truncate">
              {currentSource.title}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 truncate">
              {getFilename(currentSource)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // No source linked - show upload button
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 border-dashed rounded-lg">
      <div className="text-center">
        {/* Upload icon */}
        <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Upload your PDF source document to reference while creating MCQs
        </p>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload PDF file"
        />
        
        <Button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          variant="secondary"
        >
          {isUploading ? 'Uploading...' : 'Upload PDF'}
        </Button>
        
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          PDF files only, max 50MB
        </p>
      </div>
    </div>
  )
}
