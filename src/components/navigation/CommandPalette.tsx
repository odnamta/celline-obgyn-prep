'use client'

/**
 * V17: Global Command Palette (Cmd+K / Ctrl+K)
 *
 * Fuzzy-searchable list of pages & actions. Keyboard-navigable.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, BarChart3, Users, BookOpen, Bell, Settings, Shield, PieChart, User, Layout, GraduationCap } from 'lucide-react'
import { useOrg } from '@/components/providers/OrgProvider'
import { hasMinimumRole } from '@/lib/org-authorization'

type PaletteItem = {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  keywords: string[]
  minRole?: 'candidate' | 'creator' | 'admin' | 'owner'
}

export function CommandPalette() {
  const router = useRouter()
  const { org, role } = useOrg()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const isAssessmentMode = org.settings?.features?.assessment_mode

  const items: PaletteItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <Layout className="h-4 w-4" />, keywords: ['home', 'overview'] },
    { id: 'library', label: 'Library', href: '/library', icon: <BookOpen className="h-4 w-4" />, keywords: ['decks', 'cards', 'browse'] },
    { id: 'my-library', label: 'My Library', href: '/library/my', icon: <BookOpen className="h-4 w-4" />, keywords: ['my decks', 'created'] },
    { id: 'study', label: 'Study', href: '/study', icon: <GraduationCap className="h-4 w-4" />, keywords: ['learn', 'flashcards', 'review'] },
    { id: 'stats', label: 'Statistics', href: '/stats', icon: <BarChart3 className="h-4 w-4" />, keywords: ['progress', 'analytics'] },
    { id: 'profile', label: 'Profile', href: '/profile', icon: <User className="h-4 w-4" />, keywords: ['account', 'settings'] },
    { id: 'notifications', label: 'Notifications', href: '/notifications', icon: <Bell className="h-4 w-4" />, keywords: ['alerts', 'messages'] },
    ...(isAssessmentMode ? [
      { id: 'assessments', label: 'Assessments', href: '/assessments', icon: <FileText className="h-4 w-4" />, keywords: ['exams', 'tests', 'quizzes'] },
      { id: 'candidates', label: 'Candidates', href: '/assessments/candidates', icon: <Users className="h-4 w-4" />, keywords: ['students', 'members'], minRole: 'creator' as const },
      { id: 'questions', label: 'Question Bank', href: '/assessments/questions', icon: <FileText className="h-4 w-4" />, keywords: ['mcq', 'manage questions'], minRole: 'creator' as const },
    ] : []),
    { id: 'org-settings', label: 'Organization Settings', href: `/orgs/${org.slug}/settings`, icon: <Settings className="h-4 w-4" />, keywords: ['org', 'configuration'], minRole: 'admin' },
    { id: 'org-analytics', label: 'Organization Analytics', href: `/orgs/${org.slug}/analytics`, icon: <PieChart className="h-4 w-4" />, keywords: ['org stats', 'metrics'], minRole: 'creator' },
    { id: 'audit-log', label: 'Audit Log', href: `/orgs/${org.slug}/audit`, icon: <Shield className="h-4 w-4" />, keywords: ['history', 'activity'], minRole: 'admin' },
  ]

  // Filter by role
  const roleFiltered = items.filter((item) => {
    if (!item.minRole) return true
    return hasMinimumRole(role, item.minRole)
  })

  // Fuzzy match
  const filtered = query.trim()
    ? roleFiltered.filter((item) => {
        const q = query.toLowerCase()
        if (item.label.toLowerCase().includes(q)) return true
        return item.keywords.some((k) => k.toLowerCase().includes(q))
      })
    : roleFiltered

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      navigate(filtered[selectedIndex].href)
    }
  }

  return (
    <>
      {/* Trigger button for header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <kbd className="ml-1 font-mono text-[10px] text-slate-400">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No results found
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  idx === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className="flex-shrink-0 text-slate-400">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-[10px] text-slate-400">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
      )}
    </>
  )
}
