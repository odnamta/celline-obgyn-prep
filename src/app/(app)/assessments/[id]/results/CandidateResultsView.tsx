'use client'

/**
 * Candidate Results View - shows score card, topic breakdown, and per-question review
 * Extracted from results/page.tsx for maintainability (#174).
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  BarChart3,
  Clock,
  Download,
  BookOpen,
  FileText,
  RotateCcw,
  History,
} from 'lucide-react'
import { useOrg } from '@/components/providers/OrgProvider'
import {
  getSessionResults,
  getAssessment,
  getSessionWeakAreas,
  getSessionPercentile,
  getMyAttemptsForAssessment,
} from '@/actions/assessment-actions'
import { Button } from '@/components/ui/Button'
import type { Assessment, AssessmentSession } from '@/types/database'

type EnrichedAnswer = {
  id: string
  session_id: string
  card_template_id: string
  selected_index: number | null
  is_correct: boolean | null
  answered_at: string | null
  stem: string
  options: string[]
  correct_index: number
  explanation: string | null
}

type TopicBreakdown = {
  tagId: string
  tagName: string
  tagColor: string
  correct: number
  total: number
  percent: number
}

export function CandidateResultsView({ assessmentId, sessionId }: { assessmentId: string; sessionId: string }) {
  const router = useRouter()
  const { org } = useOrg()
  const certificationEnabled = org.settings.features.certification
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [session, setSession] = useState<AssessmentSession | null>(null)
  const [answers, setAnswers] = useState<EnrichedAnswer[]>([])
  const [weakAreas, setWeakAreas] = useState<TopicBreakdown[]>([])
  const [percentile, setPercentile] = useState<{ percentile: number; rank: number; totalSessions: number } | null>(null)
  const [attemptData, setAttemptData] = useState<{
    attempts: Array<{ id: string; score: number | null; passed: boolean | null; status: string; completed_at: string | null; created_at: string }>
    maxAttempts: number | null
    canRetake: boolean
    cooldownEndsAt: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [aResult, sResult, wResult, pResult, attResult] = await Promise.all([
        getAssessment(assessmentId),
        getSessionResults(sessionId),
        getSessionWeakAreas(sessionId),
        getSessionPercentile(sessionId),
        getMyAttemptsForAssessment(assessmentId),
      ])

      if (aResult.ok && aResult.data) setAssessment(aResult.data)
      if (!sResult.ok) {
        setError(sResult.error)
      } else if (sResult.data) {
        setSession(sResult.data.session)
        setAnswers(sResult.data.answers)
      }
      if (wResult.ok && wResult.data) {
        setWeakAreas(wResult.data.topics)
      }
      if (pResult.ok && pResult.data) {
        setPercentile(pResult.data)
      }
      if (attResult.ok && attResult.data) {
        setAttemptData(attResult.data)
      }
      setLoading(false)
    }
    load()
  }, [assessmentId, sessionId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        {/* Score card skeleton */}
        <div className="rounded-xl p-6 mb-8 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3" />
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-2" />
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-4" />
          <div className="flex justify-center gap-6">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        {/* Question review skeleton */}
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
              <div className="space-y-2 ml-9">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error ?? 'Sesi tidak ditemukan'}</p>
        <Button variant="secondary" onClick={() => router.push('/assessments')}>
          Kembali ke Asesmen
        </Button>
      </div>
    )
  }

  const correctCount = answers.filter((a) => a.is_correct === true).length
  const totalCount = answers.length
  const score = session.score ?? 0
  const passed = session.passed ?? false

  // If show_results is false, show only basic submission confirmation
  if (assessment && !assessment.show_results) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/assessments')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Asesmen
        </button>
        <div className="rounded-xl p-6 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="h-12 w-12 mx-auto text-blue-600 mb-3" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Asesmen Dikirim
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Jawaban Anda telah dicatat. Hasil tidak tersedia untuk asesmen ini.
          </p>
        </div>
        <div className="mt-8 text-center">
          <Button variant="secondary" onClick={() => router.push('/assessments')}>
            Kembali ke Asesmen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/assessments')}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Asesmen
      </button>

      {/* Score Card */}
      <div
        className={`rounded-xl p-6 mb-8 text-center ${
          passed
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}
      >
        <div className="mb-3">
          {passed ? (
            <Trophy className="h-12 w-12 mx-auto text-green-600" />
          ) : (
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
          )}
        </div>
        <h1 className="text-3xl font-bold mb-1">
          <span className={passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
            {score}%
          </span>
        </h1>
        <p className={`text-lg font-medium ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {passed ? 'Lulus' : 'Tidak Lulus'}
        </p>
        {assessment && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {assessment.title} — Skor lulus: {assessment.pass_score}%
          </p>
        )}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            {correctCount}/{totalCount} benar
          </span>
          {session.completed_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(session.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>
        {percentile && percentile.totalSessions > 1 && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-3 font-medium">
            Lebih baik dari {percentile.percentile}% peserta · Peringkat {percentile.rank} dari {percentile.totalSessions}
          </p>
        )}
      </div>

      {/* PDF Export */}
      <div className="flex justify-center mb-8">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Laporan Asesmen</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; color: #1e293b; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 18px; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .score { font-size: 48px; font-weight: bold; color: ${passed ? '#16a34a' : '#dc2626'}; }
  .status { font-size: 20px; color: ${passed ? '#16a34a' : '#dc2626'}; margin-bottom: 8px; }
  .meta { color: #64748b; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th { text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; }
  td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
  .correct { color: #16a34a; font-weight: bold; }
  .incorrect { color: #dc2626; font-weight: bold; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${assessment?.title ?? 'Laporan Asesmen'}</h1>
<p class="meta">Tanggal: ${session.completed_at ? new Date(session.completed_at).toLocaleDateString('id-ID') : '—'} · Skor Lulus: ${assessment?.pass_score ?? 0}%</p>
<div style="text-align:center;margin:24px 0;">
  <div class="score">${score}%</div>
  <div class="status">${passed ? 'LULUS' : 'TIDAK LULUS'}</div>
  <p class="meta">${correctCount} dari ${totalCount} benar</p>
  ${percentile && percentile.totalSessions > 1 ? `<p class="meta">Lebih baik dari ${percentile.percentile}% peserta · Peringkat ${percentile.rank} dari ${percentile.totalSessions}</p>` : ''}
</div>
${assessment?.allow_review ? `
<h2>Tinjauan Soal</h2>
<table>
<thead><tr><th>#</th><th>Soal</th><th>Jawaban Anda</th><th>Hasil</th></tr></thead>
<tbody>
${answers.map((a, i) => `<tr>
  <td>${i + 1}</td>
  <td>${a.stem.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
  <td>${a.selected_index != null ? a.options[a.selected_index]?.replace(/</g, '&lt;').replace(/>/g, '&gt;') ?? '—' : 'Tidak dijawab'}</td>
  <td class="${a.is_correct ? 'correct' : 'incorrect'}">${a.is_correct ? '✓' : '✗'}</td>
</tr>`).join('')}
</tbody></table>` : ''}
<p class="meta" style="margin-top:32px;text-align:center;">Dibuat oleh Cekatan · ${new Date().toLocaleDateString('id-ID')}</p>
</body></html>`
            const win = window.open('', '_blank')
            if (win) {
              win.document.write(html)
              win.document.close()
              setTimeout(() => win.print(), 300)
            }
          }}
        >
          <FileText className="h-4 w-4 mr-1" />
          Unduh Laporan PDF
        </Button>
        {certificationEnabled && passed && (
          <>
            {session.certificate_url && (
              <a href={session.certificate_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary" className="ml-2">
                  <Download className="h-4 w-4 mr-1" />
                  Unduh Sertifikat
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="ml-2"
              onClick={() => router.push(`/assessments/${assessmentId}/certificate/${sessionId}`)}
            >
              Lihat Sertifikat
            </Button>
          </>
        )}
      </div>

      {/* Topic Breakdown (weak areas) */}
      {weakAreas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Rincian Topik
          </h2>
          <div className="space-y-2">
            {weakAreas.map((topic) => {
              const isWeak = topic.percent < 50
              return (
                <div
                  key={topic.tagId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: topic.tagColor }}
                  />
                  <span className="text-sm text-slate-900 dark:text-slate-100 flex-1 min-w-0 truncate">
                    {topic.tagName}
                  </span>
                  <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className={`h-full rounded-full ${isWeak ? 'bg-red-500' : topic.percent < 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${topic.percent}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium w-16 text-right flex-shrink-0 ${isWeak ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                    {topic.correct}/{topic.total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Study Recommendations — based on weak topics */}
      {(() => {
        const weak = weakAreas.filter((t) => t.percent < 70)
        if (weak.length === 0) return null
        const weakTagIds = weak.map((t) => t.tagId).join(',')
        return (
          <div className="mb-8 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Rekomendasi Belajar
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Fokus pada {weak.length} topik ini untuk meningkatkan skor Anda:
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {weak.map((t) => (
                <span
                  key={t.tagId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.tagColor }} />
                  {t.tagName}
                  <span className="text-red-500 ml-0.5">{t.percent}%</span>
                </span>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/study/global?tags=${weakTagIds}`)}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Pelajari Topik Lemah
            </Button>
          </div>
        )
      })()}

      {/* Per-Question Review — gated by allow_review */}
      {answers.length > 0 && assessment?.allow_review && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Tinjauan Soal
          </h2>
          <div className="space-y-4">
            {answers.map((answer, idx) => (
              <div
                key={answer.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      answer.is_correct
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                    {answer.stem}
                  </p>
                </div>

                <div className="ml-9 space-y-2">
                  {answer.options.map((option, optIdx) => {
                    const isSelected = answer.selected_index === optIdx
                    const isCorrect = answer.correct_index === optIdx
                    let className = 'p-2.5 rounded-lg text-sm flex items-start gap-2 '

                    if (isCorrect) {
                      className += 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                    } else if (isSelected && !isCorrect) {
                      className += 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                    } else {
                      className += 'text-slate-600 dark:text-slate-400'
                    }

                    return (
                      <div key={optIdx} className={className}>
                        <span className="flex-shrink-0 font-medium">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span>{option}</span>
                        {isCorrect && (
                          <CheckCircle2 className="h-4 w-4 ml-auto flex-shrink-0 text-green-600" />
                        )}
                        {isSelected && !isCorrect && (
                          <XCircle className="h-4 w-4 ml-auto flex-shrink-0 text-red-500" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {answer.explanation && (
                  <div className="ml-9 mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-medium">Penjelasan: </span>
                    {answer.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificate link for passed sessions (gated by feature flag) */}
      {passed && certificationEnabled && (
        <div className="mt-6 text-center flex items-center justify-center gap-2">
          {session.certificate_url && (
            <a href={session.certificate_url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <Download className="h-4 w-4 mr-2" />
                Download Certificate
              </Button>
            </a>
          )}
          <Button
            variant="secondary"
            onClick={() => router.push(`/assessments/${assessmentId}/certificate/${sessionId}`)}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Lihat Sertifikat
          </Button>
        </div>
      )}

      {answers.length > 0 && assessment && !assessment.allow_review && (
        <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
          Tinjauan jawaban tidak tersedia untuk asesmen ini.
        </div>
      )}

      {/* Attempt History & Retake */}
      {attemptData && attemptData.attempts.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-400" />
            Riwayat Percobaan
            {attemptData.maxAttempts && (
              <span className="text-sm font-normal text-slate-500">
                ({attemptData.attempts.filter((a) => a.status === 'completed' || a.status === 'timed_out').length}/{attemptData.maxAttempts})
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {attemptData.attempts.map((att, idx) => {
              const isCurrent = att.id === sessionId
              return (
                <div
                  key={att.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isCurrent
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-medium text-slate-400 w-6 text-right">
                    #{attemptData.attempts.length - idx}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {att.completed_at ? new Date(att.completed_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Sedang berlangsung'}
                    </span>
                    {isCurrent && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium">Saat ini</span>
                    )}
                  </div>
                  {att.score !== null ? (
                    <span className={`text-sm font-bold ${att.passed ? 'text-green-600' : 'text-red-500'}`}>
                      {att.score}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                  {!isCurrent && att.status !== 'in_progress' && (
                    <button
                      onClick={() => router.push(`/assessments/${assessmentId}/results?sessionId=${att.id}`)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Retake Button */}
      {attemptData?.canRetake && (
        <div className="mt-6 text-center">
          <Button onClick={() => router.push(`/assessments/${assessmentId}/take`)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Ulangi Asesmen
          </Button>
        </div>
      )}

      {attemptData && !attemptData.canRetake && attemptData.cooldownEndsAt && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ulangi tersedia setelah {new Date(attemptData.cooldownEndsAt).toLocaleString('id-ID')}
          </p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Button variant="secondary" onClick={() => router.push('/assessments')}>
          Kembali ke Asesmen
        </Button>
      </div>
    </div>
  )
}
