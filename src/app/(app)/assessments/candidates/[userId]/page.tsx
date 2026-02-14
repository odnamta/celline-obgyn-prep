'use client'

/**
 * V13 Phase 10: Individual Candidate Progress Page
 *
 * Shows a candidate's full assessment history across all org assessments.
 * Creator+ only.
 */

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  TrendingUp,
  Target,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Download,
} from 'lucide-react'
import { useOrg } from '@/components/providers/OrgProvider'
import { hasMinimumRole } from '@/lib/org-authorization'
import { getCandidateProgress, resetCandidateAttempts, exportCandidateProfile } from '@/actions/assessment-actions'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/Toast'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { usePageTitle } from '@/hooks/use-page-title'

type SessionRow = {
  assessmentTitle: string
  score: number | null
  passed: boolean | null
  completedAt: string | null
  tabSwitchCount: number
  tabSwitchLog: Array<{ timestamp: string; type: string }>
  status: string
}

export default function CandidateProgressPage() {
  usePageTitle('Candidate Details')
  const { role } = useOrg()
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  const isCreator = hasMinimumRole(role, 'creator')

  const [candidate, setCandidate] = useState<{ email: string; fullName: string | null } | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [summary, setSummary] = useState<{ totalCompleted: number; avgScore: number; passRate: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedViolation, setExpandedViolation] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmReset, setConfirmReset] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!isCreator) return
    getCandidateProgress(userId).then((result) => {
      if (!result.ok) {
        setError(result.error ?? 'Failed to load candidate data')
      } else if (result.data) {
        setCandidate(result.data.candidate)
        setSessions(result.data.sessions)
        setSummary(result.data.summary)
      }
      setLoading(false)
    })
  }, [userId, isCreator])

  function handleResetAttempts() {
    startTransition(async () => {
      const result = await resetCandidateAttempts(userId)
      if (result.ok) {
        showToast(`${result.data?.deleted ?? 0} attempt(s) deleted`, 'success')
        setConfirmReset(false)
        // Reload data
        const fresh = await getCandidateProgress(userId)
        if (fresh.ok && fresh.data) {
          setSessions(fresh.data.sessions)
          setSummary(fresh.data.summary)
        }
      } else {
        showToast(result.error, 'error')
      }
    })
  }

  function handleExportProfile() {
    startTransition(async () => {
      const result = await exportCandidateProfile(userId)
      if (result.ok && result.data) {
        const json = JSON.stringify(result.data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `candidate-${result.data.candidate.email}-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        showToast('Profile exported', 'success')
      } else if (!result.ok) {
        showToast(result.error, 'error')
      }
    })
  }

  if (!isCreator) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        You do not have permission to view this page.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        Loading candidate data...
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error ?? 'Candidate not found'}</p>
        <Button variant="secondary" onClick={() => router.push('/assessments/candidates')}>
          Back to Candidates
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: 'Assessments', href: '/assessments' },
        { label: 'Candidates', href: '/assessments/candidates' },
        { label: candidate.fullName || candidate.email },
      ]} />

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
        {candidate.fullName || candidate.email}
      </h1>
      {candidate.fullName && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {candidate.email}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 mb-6">
        <Button size="sm" variant="secondary" onClick={handleExportProfile} disabled={isPending}>
          <Download className="h-4 w-4 mr-1" />
          Export Profile
        </Button>
        {!confirmReset ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmReset(true)}
            disabled={isPending || sessions.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset Attempts
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 dark:text-red-400">Delete all attempts?</span>
            <Button size="sm" variant="secondary" onClick={handleResetAttempts} disabled={isPending} className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20">
              Confirm
            </Button>
            <button
              onClick={() => setConfirmReset(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.totalCompleted}
            </div>
            <div className="text-xs text-slate-500">Completed</div>
          </div>
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.avgScore}%
            </div>
            <div className="text-xs text-slate-500">Average Score</div>
          </div>
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
            <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.passRate}%
            </div>
            <div className="text-xs text-slate-500">Pass Rate</div>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No assessment attempts yet.</p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]" aria-label="Assessment history">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Assessment</th>
                <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Score</th>
                <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tab Switches</th>
                <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sessions.map((s, idx) => (
                <React.Fragment key={idx}>
                  <tr className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                      {s.assessmentTitle}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'completed' && s.score !== null ? (
                        <span className={`font-bold ${s.passed ? 'text-green-600' : 'text-red-500'}`}>
                          {s.score}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'completed' ? (
                        s.passed ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Passed
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Failed
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary">{s.status.replace('_', ' ')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.tabSwitchCount > 0 ? (
                        <button
                          onClick={() => setExpandedViolation(expandedViolation === idx ? null : idx)}
                          className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium hover:underline"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {s.tabSwitchCount}
                        </button>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                  {expandedViolation === idx && s.tabSwitchLog.length > 0 && (
                    <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <p className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                            Violation Timeline
                          </p>
                          <div className="space-y-1">
                            {s.tabSwitchLog.map((entry, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                <span className="text-slate-400">—</span>
                                <span>Left exam window</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
