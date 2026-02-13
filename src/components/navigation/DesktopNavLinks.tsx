'use client'

/**
 * V17: Desktop navigation links with badge counts.
 *
 * Shows unread notification count on Assessments link for candidates.
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/components/providers/OrgProvider'
import { getUnreadNotificationCount } from '@/actions/notification-actions'

export function DesktopNavLinks() {
  const pathname = usePathname()
  const { org } = useOrg()
  const isAssessmentMode = org.settings?.features?.assessment_mode
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    getUnreadNotificationCount().then((r) => {
      if (r.ok && r.data) setUnreadCount(r.data)
    })
  }, [])

  const links = [
    { href: '/library', label: 'Library' },
    { href: '/library/my', label: 'My Library' },
    ...(isAssessmentMode ? [{ href: '/assessments', label: 'Assessments' }] : []),
  ]

  return (
    <nav className="hidden sm:flex items-center gap-4">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href)
        return (
          <a
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              isActive
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {link.label}
          </a>
        )
      })}
    </nav>
  )
}
