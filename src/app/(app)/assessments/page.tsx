'use client'

/**
 * V13: Assessment Dashboard
 *
 * Shows available assessments (candidates) or all assessments (creators).
 * Role-based views with session history.
 * Creators get publish/archive/edit controls.
 */

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Play, Eye, BarChart3, Clock, Target, CheckCircle2, XCircle,
  Pencil, Send, Archive,
} from 'lucide-react'
import { useOrg } from '@/components/providers/OrgProvider'
import {
  getOrgAssessments,
  getMyAssessmentSessions,
  publishAssessment,
  archiveAssessment,
} from '@/actions/assessment-actions'
import { hasMinimumRole } from '@/lib/org-authorization'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { AssessmentWithDeck, SessionWithAssessment } from '@/types/database'

export default function AssessmentsPage() {
  const { org, role } = useOrg()
  const router = useRouter()
  const [assessments, setAssessments] = useState<AssessmentWithDeck[]>([])
  const [sessions, setSessions] = useState<SessionWithAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const isCreator = hasMinimumRole(role, 'creator')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [aResult, sResult] = await Promise.all([
      getOrgAssessments(),
      getMyAssessmentSessions(),
    ])
    if (aResult.ok) setAssessments(aResult.data ?? [])
    if (sResult.ok) setSessions(sResult.data ?? [])
    setLoading(false)
  }

  function handlePublish(assessmentId: string) {
    startTransition(async () => {
      const result = await publishAssessment(assessmentId)
      if (result.ok) await loadData()
    })
  }

  function handleArchive(assessmentId: string) {
    startTransition(async () => {
      const result = await archiveAssessment(assessmentId)
      if (result.ok) await loadData()
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Assessments</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{org.name}</p>
        </div>
        {isCreator && (
          <Button onClick={() => router.push('/assessments/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assessment
          </Button>
        )}
      </div>

      {/* Available Assessments */}
      {assessments.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No assessments yet</p>
          {isCreator && (
            <p className="mt-1">Create your first assessment to get started.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {assessments.map((assessment) => {
            const mySessions = sessions.filter((s) => s.assessment_id === assessment.id)
            const lastSession = mySessions[0]

            return (
              <div
                key={assessment.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {assessment.title}
                      </h3>
                      <Badge variant={assessment.status === 'published' ? 'default' : 'secondary'}>
                        {assessment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {assessment.deck_title}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {assessment.time_limit_minutes} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {assessment.pass_score}% to pass
                      </span>
                      <span>{assessment.question_count} questions</span>
                      {isCreator && (
                        <span>{assessment.session_count} attempts</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Candidate: last score */}
                    {lastSession?.status === 'completed' && (
                      <div className="text-right mr-2">
                        <div className={`text-lg font-bold ${lastSession.passed ? 'text-green-600' : 'text-red-500'}`}>
                          {lastSession.score}%
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {lastSession.passed ? (
                            <><CheckCircle2 className="h-3 w-3 text-green-600" /> Passed</>
                          ) : (
                            <><XCircle className="h-3 w-3 text-red-500" /> Failed</>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Candidate: Start/Retake */}
                    {assessment.status === 'published' && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/assessments/${assessment.id}/take`)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {lastSession ? 'Retake' : 'Start'}
                      </Button>
                    )}

                    {/* Creator: Publish draft */}
                    {isCreator && assessment.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePublish(assessment.id)}
                        disabled={isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                    )}

                    {/* Creator: Archive published */}
                    {isCreator && assessment.status === 'published' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchive(assessment.id)}
                        disabled={isPending}
                        title="Archive assessment"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Creator: Edit (draft only) */}
                    {isCreator && assessment.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/assessments/${assessment.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Creator: View results */}
                    {isCreator && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/assessments/${assessment.id}/results`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* My Recent Sessions */}
      {sessions.length > 0 && (
        <>
          <Separator className="mb-6" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">My Attempts</h2>
          <div className="space-y-2">
            {sessions.slice(0, 10).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {session.assessment_title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {session.completed_at
                      ? new Date(session.completed_at).toLocaleDateString()
                      : 'In progress'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {session.status === 'completed' && session.score !== null && (
                    <span className={`text-sm font-bold ${session.passed ? 'text-green-600' : 'text-red-500'}`}>
                      {session.score}%
                    </span>
                  )}
                  {session.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/assessments/${session.assessment_id}/take`)}
                    >
                      Resume
                    </Button>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {session.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
