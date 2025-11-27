import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const createDeckSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
});

export const createCardSchema = z.object({
  deckId: z.string().uuid('Invalid deck ID'),
  front: z.string().min(1, 'Front content is required'),
  back: z.string().min(1, 'Back content is required'),
  imageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const ratingSchema = z.object({
  cardId: z.string().uuid('Invalid card ID'),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

export const createMCQSchema = z.object({
  deckId: z.string().uuid('Invalid deck ID'),
  stem: z.string().min(1, 'Question stem is required'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required'),
  correctIndex: z.number().int('Correct index must be an integer').min(0, 'Correct index must be non-negative'),
  explanation: z.string().optional(),
  imageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
}).refine(
  (data) => data.correctIndex < data.options.length,
  { message: 'Correct index must be within options bounds', path: ['correctIndex'] }
);

// ============================================
// Course Hierarchy Validation Schemas (V2)
// ============================================

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
});

export const updateCourseSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
});

export const createUnitSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateUnitSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const createLessonSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  orderIndex: z.number().int().min(0).optional(),
  targetItemCount: z.number().int().min(1).max(100).optional(),
});

export const updateLessonSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  orderIndex: z.number().int().min(0).optional(),
  targetItemCount: z.number().int().min(1).max(100).optional(),
});

export const addLessonItemSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID'),
  itemType: z.enum(['mcq', 'card']),
  itemId: z.string().uuid('Invalid item ID'),
  orderIndex: z.number().int().min(0).optional(),
});

export const reorderLessonItemsSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson ID'),
  itemIds: z.array(z.string().uuid('Invalid item ID')).min(1, 'At least one item required'),
});

// Export types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type CreateMCQInput = z.infer<typeof createMCQSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type AddLessonItemInput = z.infer<typeof addLessonItemSchema>;
export type ReorderLessonItemsInput = z.infer<typeof reorderLessonItemsSchema>;
