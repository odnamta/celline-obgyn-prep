'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:bottom-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium shadow-lg">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>You&apos;re offline — changes won&apos;t be saved</span>
      </div>
    </div>
  )
}
