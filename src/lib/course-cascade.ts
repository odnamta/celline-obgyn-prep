import type { Course, Unit, Lesson, LessonItem } from '@/types/database';

/**
 * Simulates cascade delete behavior for course hierarchy.
 * This models the ON DELETE CASCADE behavior defined in the database schema.
 */

export interface CourseHierarchy {
  courses: Course[];
  units: Unit[];
  lessons: Lesson[];
  lessonItems: LessonItem[];
}

/**
 * Simulates deleting a course and cascading to all child entities.
 * Returns the hierarchy after deletion.
 */
export function cascadeDeleteCourse(
  hierarchy: CourseHierarchy,
  courseId: string
): CourseHierarchy {
  // Find units belonging to this course
  const unitIdsToDelete = hierarchy.units
    .filter((u) => u.course_id === courseId)
    .map((u) => u.id);

  // Find lessons belonging to those units
  const lessonIdsToDelete = hierarchy.lessons
    .filter((l) => unitIdsToDelete.includes(l.unit_id))
    .map((l) => l.id);

  return {
    courses: hierarchy.courses.filter((c) => c.id !== courseId),
    units: hierarchy.units.filter((u) => u.course_id !== courseId),
    lessons: hierarchy.lessons.filter((l) => !unitIdsToDelete.includes(l.unit_id)),
    lessonItems: hierarchy.lessonItems.filter((li) => !lessonIdsToDelete.includes(li.lesson_id)),
  };
}

/**
 * Simulates deleting a unit and cascading to all child entities.
 * Returns the hierarchy after deletion.
 */
export function cascadeDeleteUnit(
  hierarchy: CourseHierarchy,
  unitId: string
): CourseHierarchy {
  // Find lessons belonging to this unit
  const lessonIdsToDelete = hierarchy.lessons
    .filter((l) => l.unit_id === unitId)
    .map((l) => l.id);

  return {
    courses: hierarchy.courses,
    units: hierarchy.units.filter((u) => u.id !== unitId),
    lessons: hierarchy.lessons.filter((l) => l.unit_id !== unitId),
    lessonItems: hierarchy.lessonItems.filter((li) => !lessonIdsToDelete.includes(li.lesson_id)),
  };
}
