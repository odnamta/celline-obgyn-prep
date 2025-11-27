import type { Course, Unit, Lesson, LessonItem, LessonProgress } from '@/types/database';

export type AuthorizationResult = {
  authorized: boolean;
  reason: 'authorized' | 'no_user' | 'not_found' | 'not_owner';
};

/**
 * Check if a user can access a course.
 * Users can only access courses they own.
 */
export function checkCourseOwnership(
  userId: string | null,
  course: Course | null
): AuthorizationResult {
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }
  if (!course) {
    return { authorized: false, reason: 'not_found' };
  }
  if (course.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }
  return { authorized: true, reason: 'authorized' };
}

/**
 * Check if a user can access a unit.
 * Users can only access units in courses they own.
 */
export function checkUnitOwnership(
  userId: string | null,
  unit: Unit | null,
  course: Course | null
): AuthorizationResult {
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }
  if (!unit || !course) {
    return { authorized: false, reason: 'not_found' };
  }
  if (unit.course_id !== course.id) {
    return { authorized: false, reason: 'not_found' };
  }
  if (course.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }
  return { authorized: true, reason: 'authorized' };
}

/**
 * Check if a user can access a lesson.
 * Users can only access lessons in units of courses they own.
 */
export function checkLessonOwnership(
  userId: string | null,
  lesson: Lesson | null,
  unit: Unit | null,
  course: Course | null
): AuthorizationResult {
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }
  if (!lesson || !unit || !course) {
    return { authorized: false, reason: 'not_found' };
  }
  if (lesson.unit_id !== unit.id || unit.course_id !== course.id) {
    return { authorized: false, reason: 'not_found' };
  }
  if (course.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }
  return { authorized: true, reason: 'authorized' };
}

/**
 * Check if a user can access a lesson item.
 * Users can only access lesson items in lessons of courses they own.
 */
export function checkLessonItemOwnership(
  userId: string | null,
  lessonItem: LessonItem | null,
  lesson: Lesson | null,
  unit: Unit | null,
  course: Course | null
): AuthorizationResult {
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }
  if (!lessonItem || !lesson || !unit || !course) {
    return { authorized: false, reason: 'not_found' };
  }
  if (
    lessonItem.lesson_id !== lesson.id ||
    lesson.unit_id !== unit.id ||
    unit.course_id !== course.id
  ) {
    return { authorized: false, reason: 'not_found' };
  }
  if (course.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }
  return { authorized: true, reason: 'authorized' };
}


/**
 * Check if a user can access a lesson progress record.
 * Users can only access their own lesson progress records.
 * 
 * Property 12: Lesson Progress RLS
 * Validates: Requirements 7.2
 */
export function checkLessonProgressOwnership(
  userId: string | null,
  lessonProgress: LessonProgress | null
): AuthorizationResult {
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }
  if (!lessonProgress) {
    return { authorized: false, reason: 'not_found' };
  }
  if (lessonProgress.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }
  return { authorized: true, reason: 'authorized' };
}
