'use client'

/**
 * V16: Org-Level Analytics Dashboard
 *
 * Aggregate stats across all assessments for admins/creators.
 * Summary cards, per-assessment breakdown table, weekly trend chart.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  Users,
  CheckCircle2,
  TrendingUp,
  Target,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { useOrg } from '@/components/providers/OrgProvider'
import { hasMinimumRole } from '@/lib/org-authorization'
import { getOrgAnalytics, type OrgAnalytics } from '@/actions/org-analytics-actions'
import { Badge } from '@/components/ui/badge'

export default function OrgAnalyticsPage() {
  const { org, role } = useOrg()
  const router = useRouter()
  const isCreator = hasMinimumRole(role, 'creator')

  const [data, setData] = useState<OrgAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isCreator) return
    getOrgAnalytics().then((result) => {
      if (result.ok && result.data) setData(result.data)
      setLoading(false)
    })
  }, [isCreator])

  if (!isCreator) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        You do not have permission to view this page.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        Failed to load analytics.
      </div>
    )
  }

  const maxCompletions = Math.max(...data.weeklyTrend.map((w) => w.completions), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push(`/orgs/${org.slug}/settings`)}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
        Organization Analytics
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{org.name}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<BarChart3 className="h-5 w-5 text-blue-500" />} value={data.totalAssessments} label="Assessments" sub={`${data.publishedAssessments} published`} />
        <StatCard icon={<Users className="h-5 w-5 text-purple-500" />} value={data.uniqueCandidates} label="Candidates" sub={`${data.totalSessions} total attempts`} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-green-500" />} value={`${data.avgScore}%`} label="Avg Score" sub={`${data.completedSessions} completed`} />
        <StatCard icon={<Target className="h-5 w-5 text-amber-500" />} value={`${data.avgPassRate}%`} label="Pass Rate" sub={`${data.timedOutSessions} timed out`} />
      </div>

      {/* Weekly Trend */}
      {data.weeklyTrend.some((w) => w.completions > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Weekly Activity (Last 12 Weeks)
          </h2>
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-end gap-1 h-32">
              {data.weeklyTrend.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-500/80 dark:bg-blue-400/60 rounded-t transition-all"
                    style={{ height: `${(w.completions / maxCompletions) * 100}%`, minHeight: w.completions > 0 ? '4px' : '0px' }}
                    title={`${w.completions} completions, avg ${w.avgScore}%`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {data.weeklyTrend.map((w, i) => (
                <div key={i} className="flex-1 text-center text-[10px] text-slate-400 truncate">
                  {w.week}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500/80 rounded" />
                Completions
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Per-Assessment Table */}
      {data.assessmentStats.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Assessment Breakdown
          </h2>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]" aria-label="Assessment breakdown">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                  <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Assessment</th>
                  <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 text-right">Attempts</th>
                  <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 text-right">Completed</th>
                  <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 text-right">Avg Score</th>
                  <th scope="col" className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 text-right">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {data.assessmentStats.map((a) => (
                  <tr
                    key={a.id}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => router.push(`/assessments/${a.id}/analytics`)}
                  >
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{a.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{a.sessions}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{a.completedCount}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={a.avgScore >= 70 ? 'text-green-600' : a.avgScore > 0 ? 'text-amber-600' : 'text-slate-400'}>
                        {a.completedCount > 0 ? `${a.avgScore}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={a.passRate >= 70 ? 'text-green-600' : a.passRate > 0 ? 'text-amber-600' : 'text-slate-400'}>
                        {a.completedCount > 0 ? `${a.passRate}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.totalAssessments === 0 && (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No assessments yet</p>
          <p className="mt-1">Create assessments to see analytics here.</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, sub }: { icon: React.ReactNode; value: string | number; label: string; sub: string }) {
  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  )
}
