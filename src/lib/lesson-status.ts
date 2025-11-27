/**
 * Lesson Status Calculator Implementation
 * 
 * This module implements lesson lock/unlock status logic for the
 * Duolingo-style course progression system.
 * 
 * Rules (from Requirements 6.2, 6.3, 6.4, 6.5, 7.3):
 * - First lesson of first unit is always unlocked (or completed)
 * - Subsequent lessons are locked until the previous lesson is completed
 * - A lesson is completed when a lesson_progress record exists for it
 */

import { LessonProgress, LessonStatus } from '@/types/database';

export interface LessonStatusInput {
  /** The order_index of the lesson within its unit */
  lessonOrderIndex: number;
  /** The order_index of the unit within the course */
  unitOrderIndex: number;
  /** Map of lesson_id to LessonProgress records */
  progressMap: Map<string, LessonProgress>;
  /** The lesson_id of the previous lesson (null if this is the first lesson) */
  previousLessonId: string | null;
  /** The lesson_id of the current lesson (to check if completed) */
  currentLessonId: string;
}

/**
 * Calculates the status of a lesson based on its position and progress.
 * 
 * @param input - The lesson position and progress information
 * @returns The lesson status: 'locked', 'unlocked', or 'completed'
 */
export function calculateLessonStatus(input: LessonStatusInput): LessonStatus {
  const {
    lessonOrderIndex,
    unitOrderIndex,
    progressMap,
    previousLessonId,
    currentLessonId,
  } = input;

  // Check if this lesson has been completed
  const hasOwnProgress = progressMap.has(currentLessonId);
  if (hasOwnProgress) {
    return 'completed';
  }

  // First lesson of first unit is always unlocked
  const isFirstLesson = lessonOrderIndex === 0 && unitOrderIndex === 0;
  if (isFirstLesson) {
    return 'unlocked';
  }

  // If there's no previous lesson (shouldn't happen except for first lesson),
  // treat as unlocked
  if (previousLessonId === null) {
    return 'unlocked';
  }

  // Check if the previous lesson has been completed
  const hasPreviousProgress = progressMap.has(previousLessonId);
  if (hasPreviousProgress) {
    return 'unlocked';
  }

  // Previous lesson not completed - this lesson is locked
  return 'locked';
}

/**
 * Helper to build a progress map from an array of LessonProgress records.
 * 
 * @param progressRecords - Array of lesson progress records
 * @returns Map of lesson_id to LessonProgress
 */
export function buildProgressMap(
  progressRecords: LessonProgress[]
): Map<string, LessonProgress> {
  const map = new Map<string, LessonProgress>();
  for (const record of progressRecords) {
    map.set(record.lesson_id, record);
  }
  return map;
}

/**
 * Determines the previous lesson ID given the current lesson's position
 * and the full list of lessons across all units.
 * 
 * @param currentLessonOrderIndex - Order index of current lesson within its unit
 * @param currentUnitOrderIndex - Order index of current unit
 * @param lessonsInCurrentUnit - All lessons in the current unit, sorted by order_index
 * @param lastLessonOfPreviousUnit - The last lesson of the previous unit (if any)
 * @returns The previous lesson's ID, or null if this is the first lesson
 */
export function getPreviousLessonId(
  currentLessonOrderIndex: number,
  currentUnitOrderIndex: number,
  lessonsInCurrentUnit: Array<{ id: string; order_index: number }>,
  lastLessonOfPreviousUnit: { id: string } | null
): string | null {
  // First lesson of first unit has no previous
  if (currentLessonOrderIndex === 0 && currentUnitOrderIndex === 0) {
    return null;
  }

  // If not the first lesson in the unit, previous is in same unit
  if (currentLessonOrderIndex > 0) {
    // Find the lesson with the next lower order_index
    const sortedLessons = [...lessonsInCurrentUnit].sort(
      (a, b) => a.order_index - b.order_index
    );
    const currentIndex = sortedLessons.findIndex(
      (l) => l.order_index === currentLessonOrderIndex
    );
    if (currentIndex > 0) {
      return sortedLessons[currentIndex - 1].id;
    }
  }

  // First lesson of a non-first unit - previous is last lesson of previous unit
  if (lastLessonOfPreviousUnit) {
    return lastLessonOfPreviousUnit.id;
  }

  return null;
}
