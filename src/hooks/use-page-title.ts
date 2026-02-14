'use client'

import { useEffect } from 'react'

/**
 * Sets the document title for client components.
 * Follows the same pattern as the root layout title template: "Page - GamaTest"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - GamaTest` : 'GamaTest'
  }, [title])
}
