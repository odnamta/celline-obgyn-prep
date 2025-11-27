import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { CreateDeckForm } from '@/components/decks/CreateDeckForm'
import { DeckCard } from '@/components/decks/DeckCard'
import { StudyHeatmap } from '@/components/dashboard/StudyHeatmap'
import { CourseCard, CreateCourseForm } from '@/components/course'
import type { CourseWithProgress } from '@/components/course'
import { calculateDueCount } from '@/lib/due-count'
import { getStudyLogs, getUserStats } from '@/actions/stats-actions'
import { Flame, BookOpen, Layers } from 'lucide-react'
import type { DeckWithDueCount, Course, Lesson, LessonProgress } from '@/types/database'

/**
 * Dashboard Page - React Server Component
 * Displays user's courses and decks with progress.
 * Requirements: 2.2, 6.1, 6.2, 6.4
 */
export default async function DashboardPage() {
  const user = await getUser()
  
  if (!user) {
    return null // Layout handles redirect
  }

  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()

  // Fetch study logs for heatmap (Requirement 2.2)
  const { logs: studyLogs } = await getStudyLogs(60)

  // Fetch user stats for streak display (Requirement 1.7)
  const { stats: userStats } = await getUserStats()

  // Fetch user's courses with units and lessons for progress calculation (Requirement 6.1)
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch all units for user's courses
  const courseIds = (courses || []).map(c => c.id)
  let units: { id: string; course_id: string }[] = []
  if (courseIds.length > 0) {
    const { data: unitsData } = await supabase
      .from('units')
      .select('id, course_id')
      .in('course_id', courseIds)
    units = unitsData || []
  }

  // Fetch all lessons for those units
  const unitIds = units.map(u => u.id)
  let lessons: Lesson[] = []
  if (unitIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .in('unit_id', unitIds)
    lessons = (lessonsData || []) as Lesson[]
  }

  // Fetch lesson progress for the user
  const lessonIds = lessons.map(l => l.id)
  let progressRecords: LessonProgress[] = []
  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)
    progressRecords = (progressData || []) as LessonProgress[]
  }

  // Build progress map
  const progressMap = new Map<string, LessonProgress>()
  for (const p of progressRecords) {
    progressMap.set(p.lesson_id, p)
  }

  // Build unit to course mapping
  const unitToCourse = new Map<string, string>()
  for (const u of units) {
    unitToCourse.set(u.id, u.course_id)
  }

  // Calculate course progress
  const coursesWithProgress: CourseWithProgress[] = (courses || []).map((course: Course) => {
    // Get lessons for this course
    const courseLessons = lessons.filter(l => {
      const courseId = unitToCourse.get(l.unit_id)
      return courseId === course.id
    })
    
    const totalLessons = courseLessons.length
    const completedLessons = courseLessons.filter(l => progressMap.has(l.id)).length
    
    // Find next lesson (first incomplete lesson)
    const nextLesson = courseLessons.find(l => !progressMap.has(l.id))
    
    return {
      ...course,
      totalLessons,
      completedLessons,
      nextLessonId: nextLesson?.id || null,
    }
  })

  // Fetch user's decks with due counts (Requirement 6.1, 6.2)
  // RLS ensures only user's own decks are returned (Requirement 2.2)
  const { data: decks, error: decksError } = await supabase
    .from('decks')
    .select(`
      id,
      user_id,
      title,
      created_at,
      cards!left(id, next_review)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (coursesError || decksError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-400">Error loading data: {coursesError?.message || decksError?.message}</p>
      </div>
    )
  }

  // Calculate due counts for each deck using the tested utility function
  const decksWithDueCounts: DeckWithDueCount[] = (decks || []).map((deck) => {
    const cards = (deck.cards || []) as { next_review: string }[]
    const dueCount = calculateDueCount(cards, now)
    
    return {
      id: deck.id,
      user_id: deck.user_id,
      title: deck.title,
      created_at: deck.created_at,
      due_count: dueCount,
    }
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Current Streak Display (Requirement 1.7) */}
      {userStats && userStats.current_streak > 0 && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-lg">
          <Flame className="w-6 h-6 text-orange-500 dark:text-orange-400" />
          <span className="text-orange-600 dark:text-orange-400 font-medium">Current Streak:</span>
          <span className="text-orange-700 dark:text-orange-300 font-bold text-lg">
            {userStats.current_streak} day{userStats.current_streak !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Study Heatmap (Requirement 2.2) */}
      <div className="mb-8 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
        <StudyHeatmap studyLogs={studyLogs} />
      </div>

      {/* Courses Section (Requirement 6.1) */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Courses</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Follow structured learning paths with lessons and progress tracking.
        </p>

        {/* Create Course Form */}
        <div className="mb-6 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Create New Course</h3>
          <CreateCourseForm />
        </div>

        {/* Course List */}
        {coursesWithProgress.length === 0 ? (
          <div className="text-center py-8 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg">
            <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-400 mb-1">No courses yet</p>
            <p className="text-slate-500 dark:text-slate-500 text-sm">
              Create your first course above to start a structured learning path!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {coursesWithProgress.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Decks Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Decks</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Create and manage flashcard decks for spaced repetition practice.
        </p>

        {/* Create Deck Form */}
        <div className="mb-6 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
          <CreateDeckForm />
        </div>

        {/* Deck List */}
        {decksWithDueCounts.length === 0 ? (
          <div className="text-center py-8 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Layers className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-400 mb-1">No decks yet</p>
            <p className="text-slate-500 dark:text-slate-500 text-sm">
              Create your first deck above to start studying!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {decksWithDueCounts.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
