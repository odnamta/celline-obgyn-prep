'use client'

/**
 * V16: Audit Log Viewer
 *
 * Admin+ only page showing a filterable timeline of org actions.
 */

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useOrg } from '@/components/providers/OrgProvider'
import { hasMinimumRole } from '@/lib/org-authorization'
import { getAuditLogs } from '@/actions/audit-actions'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import type { AuditAction, AuditLogWithActor } from '@/types/database'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'assessment.created': { label: 'Assessment Created', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  'assessment.published': { label: 'Assessment Published', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  'assessment.archived': { label: 'Assessment Archived', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
  'assessment.deleted': { label: 'Assessment Deleted', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'assessment.unpublished': { label: 'Assessment Unpublished', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  'candidate.attempts_reset': { label: 'Attempts Reset', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  'candidate.imported': { label: 'Candidates Imported', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  'member.invited': { label: 'Member Invited', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  'member.removed': { label: 'Member Removed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'member.role_changed': { label: 'Role Changed', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  'member.joined': { label: 'Member Joined', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  'settings.updated': { label: 'Settings Updated', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  'notification.sent': { label: 'Notification Sent', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' },
}

const ALL_ACTIONS: AuditAction[] = [
  'assessment.created', 'assessment.published', 'assessment.archived',
  'assessment.deleted', 'assessment.unpublished',
  'candidate.attempts_reset', 'candidate.imported',
  'member.invited', 'member.removed', 'member.role_changed', 'member.joined',
  'settings.updated', 'notification.sent',
]

const PAGE_SIZE = 30

export default function AuditLogPage() {
  const { org, role } = useOrg()
  const router = useRouter()
  const isAdmin = hasMinimumRole(role, 'admin')

  const [logs, setLogs] = useState<AuditLogWithActor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!isAdmin) return
    loadLogs()
  }, [page, actionFilter, isAdmin])

  function loadLogs() {
    setLoading(true)
    startTransition(async () => {
      const result = await getAuditLogs({
        actionFilter: actionFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      if (result.ok && result.data) {
        setLogs(result.data.logs)
        setTotal(result.data.total)
      }
      setLoading(false)
    })
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        You do not have permission to view this page.
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push(`/orgs/${org.slug}/settings`)}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-slate-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total} event{total !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value as AuditAction | ''); setPage(0) }}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All actions</option>
          {ALL_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {ACTION_LABELS[action]?.label ?? action}
            </option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No audit events yet</p>
          <p className="mt-1">Actions will appear here as they happen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-slate-100 text-slate-800' }
            const meta = log.metadata as Record<string, unknown>

            return (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={actionInfo.color}>
                        {actionInfo.label}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {log.actor_name || log.actor_email}
                      </span>
                    </div>
                    {/* Metadata details */}
                    {meta && Object.keys(meta).length > 0 && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {meta.title ? `Title: ${String(meta.title)}` : ''}
                        {meta.count ? ` Count: ${String(meta.count)}` : ''}
                        {meta.from && meta.to ? ` Role: ${String(meta.from)} → ${String(meta.to)}` : ''}
                        {meta.sessionsDeleted ? ` ${String(meta.sessionsDeleted)} session(s) deleted` : ''}
                        {meta.changes ? ` Changed: ${(meta.changes as string[]).join(', ')}` : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString()}{' '}
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
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
