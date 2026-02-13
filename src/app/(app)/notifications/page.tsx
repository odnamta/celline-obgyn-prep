'use client'

/**
 * V17: Notification Center
 *
 * Full notification history with type filters, bulk mark-read, and pagination.
 */

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import {
  getNotificationsPaginated,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/actions/notification-actions'
import type { Notification } from '@/actions/notification-actions'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  assessment_published: { label: 'Published', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  assessment_reminder: { label: 'Reminder', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  assessment_deadline_approaching: { label: 'Deadline', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  assessment_assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
}

const ALL_TYPES = [
  'assessment_published',
  'assessment_reminder',
  'assessment_deadline_approaching',
  'assessment_assigned',
]

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadNotifications()
  }, [page, typeFilter])

  function loadNotifications() {
    setLoading(true)
    startTransition(async () => {
      const result = await getNotificationsPaginated({
        typeFilter: typeFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      if (result.ok && result.data) {
        setNotifications(result.data.notifications)
        setTotal(result.data.total)
      }
      setLoading(false)
    })
  }

  function handleClick(n: Notification) {
    if (!n.read_at) {
      markNotificationRead(n.id)
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item
        )
      )
    }
    if (n.link) {
      router.push(n.link)
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      )
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {total} notification{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={handleMarkAllRead} disabled={isPending}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="h-4 w-4 text-slate-400" />
        <button
          onClick={() => { setTypeFilter(''); setPage(0) }}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !typeFilter
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All
        </button>
        {ALL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => { setTypeFilter(type); setPage(0) }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === type
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {TYPE_LABELS[type]?.label ?? type}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="mt-1">{typeFilter ? 'Try a different filter.' : 'You\'re all caught up.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const typeInfo = TYPE_LABELS[n.type]
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  !n.read_at
                    ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {!n.read_at && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <div className={!n.read_at ? '' : 'ml-4'}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {n.title}
                        </p>
                        {typeInfo && (
                          <Badge className={`text-[10px] ${typeInfo.color}`}>
                            {typeInfo.label}
                          </Badge>
                        )}
                      </div>
                      {n.body && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {n.body}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}
