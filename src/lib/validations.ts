import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

export const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Kata sandi tidak cocok',
  path: ['confirmPassword'],
});

export const createDeckSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(100, 'Judul terlalu panjang'),
});

export const createCardSchema = z.object({
  deckId: z.string().uuid('ID dek tidak valid'),
  front: z.string().min(1, 'Konten depan wajib diisi'),
  back: z.string().min(1, 'Konten belakang wajib diisi'),
  imageUrl: z.string().url('URL tidak valid').optional().or(z.literal('')),
});

export const ratingSchema = z.object({
  cardId: z.string().uuid('ID kartu tidak valid'),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

export const createMCQSchema = z.object({
  deckId: z.string().uuid('ID dek tidak valid'),
  stem: z.string().min(1, 'Soal wajib diisi'),
  options: z.array(z.string().min(1, 'Opsi tidak boleh kosong')).min(2, 'Minimal 2 opsi diperlukan'),
  correctIndex: z.number().int('Indeks jawaban harus bilangan bulat').min(0, 'Indeks jawaban tidak boleh negatif'),
  explanation: z.string().optional(),
  imageUrl: z.string().url('URL tidak valid').optional().or(z.literal('')),
}).refine(
  (data) => data.correctIndex < data.options.length,
  { message: 'Indeks jawaban harus dalam rentang opsi', path: ['correctIndex'] }
);

// ============================================
// Course Hierarchy Validation Schemas (V2)
// ============================================

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang'),
  description: z.string().max(2000, 'Deskripsi terlalu panjang').optional(),
});

export const updateCourseSchema = z.object({
  courseId: z.string().uuid('ID kursus tidak valid'),
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang').optional(),
  description: z.string().max(2000, 'Deskripsi terlalu panjang').optional(),
});

export const createUnitSchema = z.object({
  courseId: z.string().uuid('ID kursus tidak valid'),
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang'),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateUnitSchema = z.object({
  unitId: z.string().uuid('ID unit tidak valid'),
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang').optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const createLessonSchema = z.object({
  unitId: z.string().uuid('ID unit tidak valid'),
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang'),
  orderIndex: z.number().int().min(0).optional(),
  targetItemCount: z.number().int().min(1).max(100).optional(),
});

export const updateLessonSchema = z.object({
  lessonId: z.string().uuid('ID pelajaran tidak valid'),
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang').optional(),
  orderIndex: z.number().int().min(0).optional(),
  targetItemCount: z.number().int().min(1).max(100).optional(),
});

export const addLessonItemSchema = z.object({
  lessonId: z.string().uuid('ID pelajaran tidak valid'),
  itemType: z.enum(['mcq', 'card']),
  itemId: z.string().uuid('ID item tidak valid'),
  orderIndex: z.number().int().min(0).optional(),
});

export const reorderLessonItemsSchema = z.object({
  lessonId: z.string().uuid('ID pelajaran tidak valid'),
  itemIds: z.array(z.string().uuid('ID item tidak valid')).min(1, 'Minimal satu item diperlukan'),
});

// ============================================
// Organization Validation Schemas (V13)
// ============================================

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'auth', 'callback', 'dashboard', 'decks', 'help',
  'invite', 'join', 'library', 'login', 'logout', 'notifications', 'orgs',
  'privacy', 'profile', 'settings', 'signup', 'stats', 'study', 'support',
  'terms', 'www',
])

export const createOrgSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama terlalu panjang'),
  slug: z.string()
    .min(3, 'Slug minimal 3 karakter')
    .max(50, 'Slug terlalu panjang')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug harus huruf kecil alfanumerik dengan tanda hubung, tidak boleh diawali atau diakhiri tanda hubung')
    .refine((s) => !RESERVED_SLUGS.has(s), 'Slug ini sudah digunakan dan tidak dapat dipakai'),
});

export const updateOrgSettingsSchema = z.object({
  orgId: z.string().uuid('ID organisasi tidak valid'),
  name: z.string().min(1).max(100).optional(),
  settings: z.object({
    features: z.object({
      study_mode: z.boolean(),
      assessment_mode: z.boolean(),
      proctoring: z.boolean(),
      certification: z.boolean(),
      ai_generation: z.boolean(),
      pdf_extraction: z.boolean(),
      flashcards: z.boolean(),
      erp_integration: z.boolean(),
    }).partial().optional(),
    branding: z.object({
      primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Harus berupa warna hex yang valid (contoh: #1e40af)'),
      logo_url: z.string().url().or(z.literal('')),
    }).partial().optional(),
    default_language: z.string().optional(),
  }).optional(),
});

export const inviteMemberSchema = z.object({
  orgId: z.string().uuid('ID organisasi tidak valid'),
  email: z.string().email('Email tidak valid'),
  role: z.enum(['admin', 'creator', 'candidate']),
});

// ============================================
// Assessment Validation Schemas (V13)
// ============================================

export const createAssessmentSchema = z.object({
  deckTemplateId: z.string().uuid('ID dek tidak valid'),
  title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang'),
  description: z.string().max(2000, 'Deskripsi terlalu panjang').optional(),
  timeLimitMinutes: z.number().int().min(1, 'Minimal 1 menit').max(480, 'Maksimal 8 jam'),
  passScore: z.number().int().min(0).max(100, 'Skor lulus harus 0-100'),
  questionCount: z.number().int().min(1, 'Minimal 1 soal').max(500, 'Maksimal 500 soal'),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).nullable().optional(),
  cooldownMinutes: z.number().int().min(0).max(10080).nullable().optional(),
  allowReview: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  accessCode: z.string().max(50).nullable().optional(),
});

export const updateAssessmentSchema = z.object({
  assessmentId: z.string().uuid('ID asesmen tidak valid'),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  timeLimitMinutes: z.number().int().min(1).max(480).optional(),
  passScore: z.number().int().min(0).max(100).optional(),
  questionCount: z.number().int().min(1).max(500).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).nullable().optional(),
  cooldownMinutes: z.number().int().min(0).nullable().optional(),
  allowReview: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  accessCode: z.string().max(50).nullable().optional(),
});

export const submitAnswerSchema = z.object({
  sessionId: z.string().uuid('ID sesi tidak valid'),
  cardTemplateId: z.string().uuid('ID kartu tidak valid'),
  selectedIndex: z.number().int().min(0).max(9),
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
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

// ============================================
// Public Test Link Validation Schemas
// ============================================

export const publicRegistrationSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama terlalu panjang').trim(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit').max(15, 'Nomor HP terlalu panjang').regex(/^[0-9+\-\s]+$/, 'Format nomor HP tidak valid').optional().or(z.literal('')),
}).refine(
  (data) => (data.email && data.email.length > 0) || (data.phone && data.phone.length > 0),
  { message: 'Email atau nomor HP harus diisi', path: ['email'] }
)

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;
