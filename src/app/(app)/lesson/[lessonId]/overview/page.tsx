export const metadata = { title: 'Lesson Overview' }

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Lesson Overview Page
 * 
 * Displays lesson title, item count, best score, and "Start Lesson" button.
 * 
 * Requirements: 5.1
 */

interface LessonOverviewPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function LessonOverviewPage({ params }: LessonOverviewPageProps) {
  const { lessonId } = await params;
  
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Fetch lesson with unit and course info (RLS enforces ownership)
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select(`
      *,
      units!inner (
        id,
        title,
        course_id,
        courses!inner (
          id,
          title,
          user_id
        )
      )
    `)
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    notFound();
  }

  // Fetch lesson item count
  const { count: itemCount, error: countError } = await supabase
    .from('lesson_items')
    .select('*', { count: 'exact', head: true })
    .eq('lesson_id', lessonId);

  if (countError) {
    throw new Error('Failed to load lesson items');
  }


  // Fetch lesson progress for best score
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .single();

  const bestScore = progress?.best_score ?? null;
  const targetItemCount = lesson.target_item_count || 10;
  const bestScorePercent = bestScore !== null 
    ? Math.round((bestScore / targetItemCount) * 100) 
    : null;

  // Extract nested join data
  const unit = (lesson as unknown as { units: { id: string; title: string; course_id: string; courses: { id: string; title: string; user_id: string } } }).units
  const course = unit?.courses

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Breadcrumb */}
        {course && (
          <nav className="mb-6 text-sm">
            <Link 
              href={`/course/${course.id}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {course.title}
            </Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-600 dark:text-slate-400">{unit?.title}</span>
          </nav>
        )}

        <Card variant="elevated" padding="lg" className="text-center">
          {/* Lesson Title */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {lesson.title}
          </h1>

          {/* Progress Ring + Stats */}
          <div className="flex justify-center gap-8 my-6">
            {bestScorePercent !== null ? (
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-200 dark:text-slate-700" />
                    <circle
                      cx="40" cy="40" r="34" fill="none" strokeWidth="6" strokeLinecap="round"
                      className="text-green-500"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - bestScorePercent / 100)}`}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-green-600 dark:text-green-400">
                    {bestScorePercent}%
                  </span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Best Score</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {itemCount ?? 0}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Questions
                </div>
              </div>
            )}

            {bestScorePercent !== null && (
              <div className="text-center flex flex-col justify-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {itemCount ?? 0}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Questions
                </div>
              </div>
            )}
          </div>

          {/* Completion Badge */}
          {progress && (
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
            </div>
          )}

          {/* Start/Retry Button */}
          <Link href={`/lesson/${lessonId}`}>
            <Button size="lg" className="w-full">
              {progress ? 'Practice Again' : 'Start Lesson'}
            </Button>
          </Link>

          {/* Item count note */}
          {(itemCount ?? 0) === 0 && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
              This lesson has no items yet.
            </p>
          )}
        </Card>

        {/* Back to Course */}
        {course && (
          <div className="mt-6 text-center">
            <Link 
              href={`/course/${course.id}`}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← Back to Course Map
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
