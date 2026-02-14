'use client'

import Link from 'next/link'
import { memo, useState, useTransition } from 'react'
import { deleteCourseAction } from '@/actions/course-actions'
import { Button } from '@/components/ui/Button'
import { BookOpen, CheckCircle, Lock } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Course } from '@/types/database'

export interface CourseWithProgress extends Course {
  totalLessons: number
  completedLessons: number
  nextLessonId: string | null
}

interface CourseCardProps {
  course: CourseWithProgress
}

/**
 * CourseCard Component
 * 
 * Displays a course card with progress summary and navigation.
 * Shows total lessons, completed lessons, and a "Continue Course" button.
 * 
 * Requirements: 6.1
 */
export const CourseCard = memo(function CourseCard({ course }: CourseCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    setShowDeleteConfirm(false)
    startTransition(() => {
      deleteCourseAction(course.id)
    })
  }

  const progressPercent = course.totalLessons > 0 
    ? Math.round((course.completedLessons / course.totalLessons) * 100)
    : 0

  const isComplete = course.totalLessons > 0 && course.completedLessons === course.totalLessons

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <Link 
          href={`/course/${course.id}`}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 truncate">
              {course.title}
            </h3>
          </div>

          {course.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {course.description}
            </p>
          )}
          
          {/* Progress Summary */}
          <div className="mt-3">
            {course.totalLessons > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {course.completedLessons} / {course.totalLessons} lessons
                  </span>
                  <span className="text-slate-500 dark:text-slate-500">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      isComplete 
                        ? 'bg-green-500 dark:bg-green-400' 
                        : 'bg-indigo-500 dark:bg-indigo-400'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <Lock className="w-4 h-4" />
                <span>No lessons yet</span>
              </div>
            )}
          </div>
        </Link>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? '...' : 'Delete'}
        </Button>
      </div>
      
      {/* Continue Button */}
      {course.totalLessons > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          <Link href={`/course/${course.id}`}>
            <Button 
              variant={isComplete ? 'secondary' : 'primary'}
              size="sm"
              className="w-full"
            >
              {isComplete ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Review Course
                </>
              ) : (
                'Continue Course'
              )}
            </Button>
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Course"
        description="Are you sure you want to delete this course? All units, lessons, and progress will be removed."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  )
})
