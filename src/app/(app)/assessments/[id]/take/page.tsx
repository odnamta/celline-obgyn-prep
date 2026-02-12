'use client'

/**
 * V13: Assessment Take Page — Timed Exam Engine
 *
 * Starts/resumes session, displays questions with timer,
 * submits answers, and auto-completes when time expires or user finishes.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  startAssessmentSession,
  submitAnswer,
  completeSession,
  getAssessment,
  getSessionQuestions,
  getExistingAnswers,
  reportTabSwitch,
} from '@/actions/assessment-actions'
import { Button } from '@/components/ui/Button'
import type { Assessment, AssessmentSession } from '@/types/database'

type QuestionData = {
  cardTemplateId: string
  stem: string
  options: string[]
  selectedIndex: number | null
  answered: boolean
}

export default function TakeAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [session, setSession] = useState<AssessmentSession | null>(null)
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmFinish, setShowConfirmFinish] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completingRef = useRef(false)

  // Load assessment and start session
  useEffect(() => {
    async function init() {
      const aResult = await getAssessment(assessmentId)
      if (!aResult.ok) {
        setError(aResult.error)
        setLoading(false)
        return
      }
      if (!aResult.data) {
        setError('Assessment not found')
        setLoading(false)
        return
      }
      setAssessment(aResult.data)

      const sResult = await startAssessmentSession(assessmentId)
      if (!sResult.ok) {
        setError(sResult.error)
        setLoading(false)
        return
      }
      if (!sResult.data) {
        setError('Failed to start session')
        setLoading(false)
        return
      }

      const sessionData = sResult.data
      setSession(sessionData)
      setTimeRemaining(sessionData.time_remaining_seconds)

      // Fetch question stems and options via server action
      const qResult = await getSessionQuestions(sessionData.id)
      let qs: QuestionData[]
      if (qResult.ok && qResult.data) {
        qs = qResult.data.map((q) => ({
          cardTemplateId: q.cardTemplateId,
          stem: q.stem,
          options: q.options,
          selectedIndex: null,
          answered: false,
        }))
      } else {
        // Fallback: show placeholders
        qs = sessionData.question_order.map((cardId) => ({
          cardTemplateId: cardId,
          stem: '',
          options: [],
          selectedIndex: null,
          answered: false,
        }))
      }

      // Restore previously submitted answers (session resume)
      const existingResult = await getExistingAnswers(sessionData.id)
      if (existingResult.ok && existingResult.data && existingResult.data.length > 0) {
        const answerMap = new Map(
          existingResult.data.map((a) => [a.cardTemplateId, a.selectedIndex])
        )
        qs = qs.map((q) => {
          const existing = answerMap.get(q.cardTemplateId)
          if (existing !== undefined) {
            return { ...q, selectedIndex: existing, answered: true }
          }
          return q
        })
      }

      setQuestions(qs)
      setLoading(false)
    }
    init()
  }, [assessmentId])

  // Auto-complete handler (stable ref to avoid stale closures in timer)
  const handleCompleteRef = useCallback(async () => {
    if (completingRef.current) return
    completingRef.current = true
    setCompleting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    // Read session from ref via state updater to avoid stale closure
    setSession((currentSession) => {
      if (currentSession) {
        completeSession(currentSession.id).then((result) => {
          if (result.ok) {
            router.push(`/assessments/${assessmentId}/results?sessionId=${currentSession.id}`)
          } else {
            setError(result.error ?? 'Failed to complete session')
            setCompleting(false)
            completingRef.current = false
          }
        })
      }
      return currentSession
    })
  }, [assessmentId, router])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || completing) return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleCompleteRef()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timeRemaining !== null, completing, handleCompleteRef])

  // Tab-switch detection
  useEffect(() => {
    if (!session || completing) return

    const sessionId = session.id
    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1)
        setShowTabWarning(true)
        // Fire-and-forget: report to server
        reportTabSwitch(sessionId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, completing])

  // Warn before closing/navigating away from in-progress exam
  useEffect(() => {
    if (!session || completing) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [session, completing])

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  async function handleSelectAnswer(optionIndex: number) {
    if (!session || completing) return

    const q = questions[currentIndex]
    if (!q) return

    // Optimistic update
    const updated = [...questions]
    updated[currentIndex] = { ...q, selectedIndex: optionIndex, answered: true }
    setQuestions(updated)

    // Submit to server (piggyback timer sync)
    await submitAnswer(session.id, q.cardTemplateId, optionIndex, timeRemaining ?? undefined)
  }

  async function handleComplete() {
    if (!session || completing) return
    setCompleting(true)
    completingRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)

    const result = await completeSession(session.id)
    if (result.ok) {
      router.push(`/assessments/${assessmentId}/results?sessionId=${session.id}`)
    } else {
      setError(result.error ?? 'Failed to complete session')
      setCompleting(false)
      completingRef.current = false
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-8" />
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button variant="secondary" onClick={() => router.push('/assessments')}>
          Back to Assessments
        </Button>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = questions.filter((q) => q.answered).length
  const isLastQuestion = currentIndex === questions.length - 1
  const isTimeLow = timeRemaining !== null && timeRemaining < 60

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header: Timer + Progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            {answeredCount}/{questions.length} answered
          </div>
          {timeRemaining !== null && (
            <div
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono font-medium ${
                isTimeLow
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-8">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-6 leading-relaxed">
            {currentQuestion.stem || `Question ${currentIndex + 1}`}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = currentQuestion.selectedIndex === idx
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={completing}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm text-slate-800 dark:text-slate-200 pt-0.5">
                      {option}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {/* Question dots */}
          <div className="hidden sm:flex items-center gap-1">
            {questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentIndex
                    ? 'bg-blue-600'
                    : q.answered
                      ? 'bg-green-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
                title={`Question ${idx + 1}${q.answered ? ' (answered)' : ''}`}
              />
            ))}
          </div>
        </div>

        {isLastQuestion ? (
          <Button
            size="sm"
            onClick={() => setShowConfirmFinish(true)}
            disabled={completing}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Finish
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Confirm Finish Modal */}
      {/* Tab Switch Warning */}
      {showTabWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Tab Switch Detected
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Leaving the exam window has been recorded.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              Tab switches: {tabSwitchCount}
            </p>
            <Button size="sm" onClick={() => setShowTabWarning(false)}>
              Return to Exam
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Finish Modal */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Submit Assessment?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              You have answered {answeredCount} of {questions.length} questions.
            </p>
            {answeredCount < questions.length && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                {questions.length - answeredCount} question(s) are unanswered and will be marked incorrect.
              </p>
            )}
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmFinish(false)}
                className="flex-1"
              >
                Continue
              </Button>
              <Button
                size="sm"
                loading={completing}
                onClick={handleComplete}
                className="flex-1"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
