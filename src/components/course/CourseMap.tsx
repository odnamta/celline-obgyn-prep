'use client';

import { Course, Unit, Lesson, LessonStatus } from '@/types/database';
import { LessonTile } from './LessonTile';

/**
 * CourseMap Component
 * 
 * Displays a Duolingo-style course map with units displayed vertically
 * and lessons as tiles within each unit.
 * 
 * Requirements: 6.1, 6.2, 6.5
 */

export interface UnitWithLessons {
  unit: Unit;
  lessons: Array<{
    lesson: Lesson;
    status: LessonStatus;
    bestScore: number | null;
  }>;
}

export interface CourseMapProps {
  course: Course;
  units: UnitWithLessons[];
}

export function CourseMap({ course, units }: CourseMapProps) {
  // Overall course progress
  const totalLessons = units.reduce((sum, u) => sum + u.lessons.length, 0)
  const completedLessons = units.reduce(
    (sum, u) => sum + u.lessons.filter((l) => l.status === 'completed').length,
    0
  )
  const overallPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Course Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {course.title}
        </h1>
        {course.description && (
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {course.description}
          </p>
        )}
        {totalLessons > 0 && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>{completedLessons} of {totalLessons} lessons complete</span>
              <span className="font-medium">{overallPercent}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Units List */}
      <div className="space-y-8">
        {units.map((unitData, unitIndex) => (
          <UnitSection
            key={unitData.unit.id}
            unitData={unitData}
            unitIndex={unitIndex}
          />
        ))}
      </div>

      {units.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          No units in this course yet.
        </div>
      )}
    </div>
  );
}


interface UnitSectionProps {
  unitData: UnitWithLessons;
  unitIndex: number;
}

function UnitSection({ unitData, unitIndex }: UnitSectionProps) {
  const { unit, lessons } = unitData;
  
  // Calculate unit progress
  const completedCount = lessons.filter(l => l.status === 'completed').length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="relative">
      {/* Unit Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
          {unitIndex + 1}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {unit.title}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-13">
        {lessons.map((lessonData) => (
          <LessonTile
            key={lessonData.lesson.id}
            lesson={lessonData.lesson}
            status={lessonData.status}
            bestScore={lessonData.bestScore}
          />
        ))}
      </div>

      {lessons.length === 0 && (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
          No lessons in this unit yet.
        </div>
      )}
    </div>
  );
}
