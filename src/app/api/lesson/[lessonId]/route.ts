import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { calculateLessonStatus, buildProgressMap, getPreviousLessonId } from '@/lib/lesson-status'
import type { Lesson, LessonProgress, Unit } from '@/types/database'

interface RouteParams {
  params: Promise<{ lessonId: string }>
}

/**
 * GET /api/lesson/[lessonId]
 * Fetches lesson details including lock status and progress.
 * Requirements: 5.1, 6.3, 6.4
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { lessonId } = await params
  
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()

  // Fetch the lesson with unit and course info
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select(`
      *,
      units!inner(
        id,
        course_id,
        order_index,
        courses!inner(
          id,
          user_id
        )
      )
    `)
    .eq('id', lessonId)
    .single()

  if (lessonError || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unit = (lesson as any).units as Unit & { courses: { id: string; user_id: string } }
  const courseId = unit.course_id

  // Fetch all lessons in the course to determine lock status
  const { data: allLessons, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      id,
      order_index,
      unit_id,
      units!inner(
        order_index,
        course_id
      )
    `)
    .eq('units.course_id', courseId)
    .order('units.order_index', { ascending: true })
    .order('order_index', { ascending: true })

  if (lessonsError) {
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
  }

  // Fetch user's progress for all lessons in the course
  const lessonIds = (allLessons || []).map(l => l.id)
  const { data: progressRecords, error: progressError } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('lesson_id', lessonIds)

  if (progressError) {
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }

  const progressMap = buildProgressMap((progressRecords || []) as LessonProgress[])

  // Find the current lesson's position and previous lesson
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedLessons = (allLessons || []).map((l: any) => ({
    id: l.id,
    order_index: l.order_index,
    unit_order_index: l.units.order_index,
  })).sort((a, b) => {
    if (a.unit_order_index !== b.unit_order_index) {
      return a.unit_order_index - b.unit_order_index
    }
    return a.order_index - b.order_index
  })

  const currentIndex = sortedLessons.findIndex(l => l.id === lessonId)
  const currentLesson = sortedLessons[currentIndex]
  const previousLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null

  // Calculate lesson status
  const status = calculateLessonStatus({
    lessonOrderIndex: currentLesson?.order_index ?? 0,
    unitOrderIndex: currentLesson?.unit_order_index ?? 0,
    progressMap,
    previousLessonId: previousLesson?.id ?? null,
    currentLessonId: lessonId,
  })

  // Get current lesson's progress
  const currentProgress = progressMap.get(lessonId) || null

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      unit_id: lesson.unit_id,
      title: lesson.title,
      order_index: lesson.order_index,
      target_item_count: lesson.target_item_count,
      created_at: lesson.created_at,
    } as Lesson,
    courseId,
    progress: currentProgress,
    isLocked: status === 'locked',
  })
}
