import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import { CourseMap, UnitWithLessons } from '@/components/course';
import { 
  calculateLessonStatus, 
  buildProgressMap, 
  getPreviousLessonId 
} from '@/lib/lesson-status';
import type { Course, Unit, Lesson, LessonProgress, LessonStatus } from '@/types/database';

/**
 * Course Page
 * 
 * Displays the course map with units, lessons, and progress.
 * Calculates lesson statuses based on completion.
 * 
 * Requirements: 6.1
 */

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Fetch course with RLS enforcing ownership
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // Fetch units ordered by order_index
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (unitsError) {
    throw new Error('Failed to load units');
  }

  // Fetch all lessons for this course's units
  const unitIds = (units || []).map(u => u.id);
  let lessons: Lesson[] = [];
  
  if (unitIds.length > 0) {
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .in('unit_id', unitIds)
      .order('order_index', { ascending: true });

    if (lessonsError) {
      throw new Error('Failed to load lessons');
    }
    lessons = (lessonsData || []) as Lesson[];
  }


  // Fetch lesson progress for the user
  const lessonIds = lessons.map(l => l.id);
  let progressRecords: LessonProgress[] = [];
  
  if (lessonIds.length > 0) {
    const { data: progressData, error: progressError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds);

    if (progressError) {
      throw new Error('Failed to load progress');
    }
    progressRecords = (progressData || []) as LessonProgress[];
  }

  // Build progress map for status calculation
  const progressMap = buildProgressMap(progressRecords);

  // Group lessons by unit and calculate statuses
  const unitsWithLessons: UnitWithLessons[] = (units || []).map((unit, unitIndex) => {
    const unitLessons = lessons
      .filter(l => l.unit_id === unit.id)
      .sort((a, b) => a.order_index - b.order_index);

    // Get the last lesson of the previous unit (for cross-unit progression)
    let lastLessonOfPreviousUnit: { id: string } | null = null;
    if (unitIndex > 0) {
      const prevUnit = units![unitIndex - 1];
      const prevUnitLessons = lessons
        .filter(l => l.unit_id === prevUnit.id)
        .sort((a, b) => b.order_index - a.order_index);
      if (prevUnitLessons.length > 0) {
        lastLessonOfPreviousUnit = { id: prevUnitLessons[0].id };
      }
    }

    const lessonsWithStatus = unitLessons.map((lesson) => {
      // Find previous lesson ID
      const previousLessonId = getPreviousLessonId(
        lesson.order_index,
        unit.order_index,
        unitLessons.map(l => ({ id: l.id, order_index: l.order_index })),
        lastLessonOfPreviousUnit
      );

      // Calculate status
      const status = calculateLessonStatus({
        lessonOrderIndex: lesson.order_index,
        unitOrderIndex: unit.order_index,
        progressMap,
        previousLessonId,
        currentLessonId: lesson.id,
      });

      // Get best score if completed
      const progress = progressMap.get(lesson.id);
      const bestScore = progress 
        ? Math.round((progress.best_score / lesson.target_item_count) * 100)
        : null;

      return {
        lesson,
        status,
        bestScore,
      };
    });

    return {
      unit: unit as Unit,
      lessons: lessonsWithStatus,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <CourseMap course={course as Course} units={unitsWithLessons} />
    </div>
  );
}
