'use client'

/**
 * V13 Phase 6: Organization Stats Card for Creator Dashboard
 *
 * Shows key org metrics: members, assessments, attempts, pass rate.
 * Includes recent activity feed.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, BarChart3, Target, TrendingUp, CheckCircle2, XCircle, Trophy, Activity } from 'lucide-react'
import { getOrgDashboardStats } from '@/actions/assessment-actions'

type OrgStats = {
  memberCount: number
  assessmentCount: number
  totalAttempts: number
  avgPassRate: number
  activeCandidatesThisWeek: number
  topPerformers: Array<{ email: string; avgScore: number; totalCompleted: number }>
  recentSessions: Array<{
    assessmentTitle: string
    userEmail: string
    score: number | null
    passed: boolean | null
    completedAt: string | null
  }>
}

export function OrgStatsCard() {
  const router = useRouter()
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getOrgDashboardStats()
      if (result.ok && result.data) {
        setStats(result.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg animate-pulse">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="mb-6 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Organization Overview
        </h2>
        <button
          onClick={() => router.push('/assessments')}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Assessments
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <Users className="h-4 w-4 mx-auto text-slate-400 mb-1" />
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {stats.memberCount}
          </div>
          <div className="text-[10px] text-slate-500">Members</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <BarChart3 className="h-4 w-4 mx-auto text-blue-500 mb-1" />
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {stats.assessmentCount}
          </div>
          <div className="text-[10px] text-slate-500">Assessments</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-1" />
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {stats.totalAttempts}
          </div>
          <div className="text-[10px] text-slate-500">Attempts</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <Target className="h-4 w-4 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {stats.avgPassRate}%
          </div>
          <div className="text-[10px] text-slate-500">Pass Rate</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <Activity className="h-4 w-4 mx-auto text-amber-500 mb-1" />
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {stats.activeCandidatesThisWeek}
          </div>
          <div className="text-[10px] text-slate-500">Active (7d)</div>
        </div>
      </div>

      {/* Top Performers & Recent Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Performers */}
        {stats.topPerformers.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              Top Performers
            </h3>
            <div className="space-y-1.5">
              {stats.topPerformers.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 text-right font-bold text-amber-500 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {p.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-slate-400">{p.totalCompleted} exams</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {p.avgScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {stats.recentSessions.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Recent Activity
            </h3>
            <div className="space-y-1.5">
              {stats.recentSessions.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {s.passed ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {s.userEmail}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-slate-500 truncate max-w-[120px]">
                      {s.assessmentTitle}
                    </span>
                    <span className={`font-medium ${s.passed ? 'text-green-600' : 'text-red-500'}`}>
                      {s.score ?? 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
