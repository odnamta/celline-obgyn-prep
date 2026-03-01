'use server'

/**
 * Assessment CRUD operations: create, read, update, publish, archive, duplicate, batch.
 */

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { withOrgUser } from '@/actions/_helpers'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { createAssessmentSchema, updateAssessmentSchema } from '@/lib/validations'
import { hasMinimumRole } from '@/lib/org-authorization'
import type { ActionResultV2 } from '@/types/actions'
import type { Assessment, AssessmentWithDeck } from '@/types/database'
import { notifyOrgCandidates } from '@/actions/notification-actions'
import { logAuditEvent } from '@/actions/audit-actions'
import { generatePublicCode } from '@/lib/public-code'

/**
 * Create a new assessment from a deck.
 * Requires creator+ role.
 */
export async function createAssessment(
  input: {
    deckTemplateId: string
    title: string
    description?: string
    timeLimitMinutes: number
    passScore: number
    questionCount: number
    shuffleQuestions?: boolean
    shuffleOptions?: boolean
    showResults?: boolean
    maxAttempts?: number
    cooldownMinutes?: number
    allowReview?: boolean
    startDate?: string
    endDate?: string
    accessCode?: string
  }
): Promise<ActionResultV2<Assessment>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Only creators and above can create assessments' }
    }

    const validation = createAssessmentSchema.safeParse(input)
    if (!validation.success) {
      return { ok: false, error: validation.error.issues[0]?.message ?? 'Validation failed' }
    }

    // Verify deck belongs to org
    const { data: deck } = await supabase
      .from('deck_templates')
      .select('id, org_id')
      .eq('id', input.deckTemplateId)
      .eq('org_id', org.id)
      .single()

    if (!deck) {
      return { ok: false, error: 'Deck not found' }
    }

    // Count available questions
    const { count: cardCount } = await supabase
      .from('card_templates')
      .select('*', { count: 'exact', head: true })
      .eq('deck_template_id', input.deckTemplateId)

    if (!cardCount || cardCount < input.questionCount) {
      return {
        ok: false,
        error: `Deck only has ${cardCount ?? 0} questions. Reduce question count or add more questions.`,
      }
    }

    // Validate scheduling dates
    if (input.startDate && input.endDate && new Date(input.startDate) >= new Date(input.endDate)) {
      return { ok: false, error: 'Start date must be before end date' }
    }

    const { data: assessment, error } = await supabase
      .from('assessments')
      .insert({
        org_id: org.id,
        deck_template_id: input.deckTemplateId,
        title: input.title,
        description: input.description ?? null,
        time_limit_minutes: input.timeLimitMinutes,
        pass_score: input.passScore,
        question_count: input.questionCount,
        shuffle_questions: input.shuffleQuestions ?? true,
        shuffle_options: input.shuffleOptions ?? false,
        show_results: input.showResults ?? true,
        max_attempts: input.maxAttempts ?? null,
        cooldown_minutes: input.cooldownMinutes ?? null,
        allow_review: input.allowReview ?? true,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        access_code: input.accessCode || null,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return { ok: false, error: error.message }
    }

    logAuditEvent(supabase, org.id, user.id, 'assessment.created', {
      targetType: 'assessment', targetId: assessment.id, metadata: { title: input.title },
    })

    revalidatePath('/assessments')
    return { ok: true, data: assessment as Assessment }
  }, undefined, RATE_LIMITS.standard)
}

/**
 * Get all assessments for the current org.
 * Candidates see only published. Creators see all.
 */
export async function getOrgAssessments(): Promise<ActionResultV2<AssessmentWithDeck[]>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    let query = supabase
      .from('assessments')
      .select(`
        *,
        deck_templates!inner(title)
      `)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(500)

    // Candidates only see published assessments
    if (!hasMinimumRole(role, 'creator')) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query

    if (error) {
      return { ok: false, error: error.message }
    }

    // Get session counts per assessment — fetch only IDs (minimal payload)
    const assessmentIds = (data ?? []).map((a) => a.id)
    const countMap = new Map<string, number>()
    if (assessmentIds.length > 0) {
      // Batch in chunks of 50 to avoid oversized IN clauses
      const CHUNK_SIZE = 50
      for (let i = 0; i < assessmentIds.length; i += CHUNK_SIZE) {
        const chunk = assessmentIds.slice(i, i + CHUNK_SIZE)
        const { data: sessionRows } = await supabase
          .from('assessment_sessions')
          .select('assessment_id')
          .in('assessment_id', chunk)

        for (const s of sessionRows ?? []) {
          countMap.set(s.assessment_id, (countMap.get(s.assessment_id) ?? 0) + 1)
        }
      }
    }

    const assessments: AssessmentWithDeck[] = (data ?? []).map((a) => ({
      ...a,
      deck_title: (a.deck_templates as unknown as { title: string }).title,
      session_count: countMap.get(a.id) ?? 0,
    }))

    return { ok: true, data: assessments }
  })
}

/**
 * Get a single assessment by ID.
 */
export async function getAssessment(
  assessmentId: string
): Promise<ActionResultV2<Assessment>> {
  return withOrgUser(async ({ supabase, org }) => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .single()

    if (error || !data) {
      return { ok: false, error: 'Assessment not found' }
    }

    return { ok: true, data: data as Assessment }
  })
}

/**
 * Publish an assessment (draft -> published).
 * Creator+ only.
 */
export async function publishAssessment(
  assessmentId: string
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Get assessment title before updating
    const { data: assessment } = await supabase
      .from('assessments')
      .select('title, public_code')
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .eq('status', 'draft')
      .single()

    if (!assessment) {
      return { ok: false, error: 'Assessment not found or not in draft' }
    }

    const { error } = await supabase
      .from('assessments')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .eq('status', 'draft')

    if (error) {
      return { ok: false, error: error.message }
    }

    // Auto-generate public code if not already set
    if (!assessment.public_code) {
      for (let i = 0; i < 5; i++) {
        const candidate = generatePublicCode()
        const { error: codeError } = await supabase
          .from('assessments')
          .update({ public_code: candidate })
          .eq('id', assessmentId)
        if (!codeError) break
      }
    }

    logAuditEvent(supabase, org.id, user.id, 'assessment.published', {
      targetType: 'assessment', targetId: assessmentId, metadata: { title: assessment.title },
    })

    // Notify org members about the new assessment
    notifyOrgCandidates(
      'Asesmen Baru Tersedia',
      `"${assessment.title}" kini tersedia untuk dikerjakan.`,
      `/assessments`
    ).catch(() => { /* fire-and-forget */ })

    revalidatePath('/assessments')
    return { ok: true }
  }, undefined, RATE_LIMITS.standard)
}

/**
 * Archive an assessment (published -> archived).
 * Creator+ only.
 */
export async function archiveAssessment(
  assessmentId: string
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    const { error } = await supabase
      .from('assessments')
      .update({ status: 'archived', public_code: null, updated_at: new Date().toISOString() })
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .eq('status', 'published')

    if (error) {
      return { ok: false, error: error.message }
    }

    logAuditEvent(supabase, org.id, user.id, 'assessment.archived', {
      targetType: 'assessment', targetId: assessmentId,
    })

    revalidatePath('/assessments')
    return { ok: true }
  }, undefined, RATE_LIMITS.standard)
}

/**
 * Revert a published assessment back to draft.
 * Only allowed if there are no in-progress sessions.
 * Creator+ only.
 */
export async function unpublishAssessment(
  assessmentId: string
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Check for active in-progress sessions
    const { data: activeSessions } = await supabase
      .from('assessment_sessions')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('status', 'in_progress')
      .limit(1)

    if (activeSessions && activeSessions.length > 0) {
      return { ok: false, error: 'Cannot revert — there are active sessions in progress' }
    }

    const { error } = await supabase
      .from('assessments')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .eq('status', 'published')

    if (error) return { ok: false, error: error.message }

    logAuditEvent(supabase, org.id, user.id, 'assessment.unpublished', {
      targetType: 'assessment', targetId: assessmentId,
    })

    revalidatePath('/assessments')
    return { ok: true }
  }, undefined, RATE_LIMITS.standard)
}

/**
 * Batch publish multiple draft assessments.
 * Creator+ only.
 */
export async function batchPublishAssessments(
  assessmentIds: string[]
): Promise<ActionResultV2<{ published: number }>> {
  if (assessmentIds.length > 100) {
    return { ok: false, error: 'Maksimal 100 asesmen per batch' }
  }

  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    const { data, error } = await supabase
      .from('assessments')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .in('id', assessmentIds)
      .eq('org_id', org.id)
      .eq('status', 'draft')
      .select('id, public_code')

    if (error) return { ok: false, error: error.message }

    // Generate public_code for each newly published assessment that doesn't have one
    for (const assessment of data ?? []) {
      if (!assessment.public_code) {
        const code = generatePublicCode()
        await supabase
          .from('assessments')
          .update({ public_code: code })
          .eq('id', assessment.id)
      }
    }

    revalidatePath('/assessments')
    return { ok: true, data: { published: data?.length ?? 0 } }
  }, undefined, RATE_LIMITS.bulk)
}

/**
 * Batch archive multiple published assessments.
 * Creator+ only.
 */
export async function batchArchiveAssessments(
  assessmentIds: string[]
): Promise<ActionResultV2<{ archived: number }>> {
  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    const { data, error } = await supabase
      .from('assessments')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .in('id', assessmentIds)
      .eq('org_id', org.id)
      .eq('status', 'published')
      .select('id')

    if (error) return { ok: false, error: error.message }

    revalidatePath('/assessments')
    return { ok: true, data: { archived: data?.length ?? 0 } }
  }, undefined, RATE_LIMITS.bulk)
}

/**
 * Batch delete multiple assessments (draft or archived only).
 * Creator+ only.
 */
export async function batchDeleteAssessments(
  assessmentIds: string[]
): Promise<ActionResultV2<{ deleted: number }>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Only allow deleting draft/archived assessments (not published with active sessions)
    const { data, error } = await supabase
      .from('assessments')
      .delete()
      .in('id', assessmentIds)
      .eq('org_id', org.id)
      .in('status', ['draft', 'archived'])
      .select('id')

    if (error) return { ok: false, error: error.message }

    const deleted = data?.length ?? 0
    if (deleted > 0) {
      logAuditEvent(supabase, org.id, user.id, 'assessment.deleted', {
        metadata: { count: deleted, ids: data?.map((d) => d.id) },
      })
    }

    revalidatePath('/assessments')
    return { ok: true, data: { deleted } }
  }, undefined, RATE_LIMITS.bulk)
}

/**
 * Duplicate an assessment as a new draft.
 */
export async function duplicateAssessment(
  assessmentId: string
): Promise<ActionResultV2<Assessment>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    const { data: source } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .single()

    if (!source) {
      return { ok: false, error: 'Assessment not found' }
    }

    const { data: clone, error } = await supabase
      .from('assessments')
      .insert({
        org_id: org.id,
        deck_template_id: source.deck_template_id,
        title: `${source.title} (Copy)`,
        description: source.description,
        time_limit_minutes: source.time_limit_minutes,
        pass_score: source.pass_score,
        question_count: source.question_count,
        shuffle_questions: source.shuffle_questions,
        shuffle_options: source.shuffle_options,
        show_results: source.show_results,
        max_attempts: source.max_attempts,
        cooldown_minutes: source.cooldown_minutes,
        allow_review: source.allow_review,
        start_date: null,
        end_date: null,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return { ok: false, error: error.message }
    }

    revalidatePath('/assessments')
    return { ok: true, data: clone as Assessment }
  })
}

/**
 * Update assessment settings (draft only).
 * Creator+ only.
 */
export async function updateAssessment(
  assessmentId: string,
  input: {
    title?: string
    description?: string
    timeLimitMinutes?: number
    passScore?: number
    questionCount?: number
    shuffleQuestions?: boolean
    shuffleOptions?: boolean
    showResults?: boolean
    maxAttempts?: number | null
    cooldownMinutes?: number | null
    allowReview?: boolean
    startDate?: string | null
    endDate?: string | null
    accessCode?: string | null
  }
): Promise<ActionResultV2<Assessment>> {
  // Validate inputs
  const validation = updateAssessmentSchema.safeParse({ assessmentId, ...input })
  if (!validation.success) {
    return { ok: false, error: validation.error.issues[0]?.message || 'Invalid input' }
  }

  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Validate scheduling dates
    const effectiveStart = input.startDate !== undefined ? input.startDate : null
    const effectiveEnd = input.endDate !== undefined ? input.endDate : null
    if (effectiveStart && effectiveEnd && new Date(effectiveStart) >= new Date(effectiveEnd)) {
      return { ok: false, error: 'Start date must be before end date' }
    }

    // Build update object, mapping camelCase to snake_case
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description || null
    if (input.timeLimitMinutes !== undefined) updates.time_limit_minutes = input.timeLimitMinutes
    if (input.passScore !== undefined) updates.pass_score = input.passScore
    if (input.questionCount !== undefined) updates.question_count = input.questionCount
    if (input.shuffleQuestions !== undefined) updates.shuffle_questions = input.shuffleQuestions
    if (input.shuffleOptions !== undefined) updates.shuffle_options = input.shuffleOptions
    if (input.showResults !== undefined) updates.show_results = input.showResults
    if (input.maxAttempts !== undefined) updates.max_attempts = input.maxAttempts
    if (input.cooldownMinutes !== undefined) updates.cooldown_minutes = input.cooldownMinutes
    if (input.allowReview !== undefined) updates.allow_review = input.allowReview
    if (input.startDate !== undefined) updates.start_date = input.startDate
    if (input.endDate !== undefined) updates.end_date = input.endDate
    if (input.accessCode !== undefined) updates.access_code = input.accessCode || null

    const { data, error } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .eq('status', 'draft')
      .select()
      .single()

    if (error) {
      return { ok: false, error: error.message }
    }

    revalidatePath('/assessments')
    return { ok: true, data: data as Assessment }
  }, undefined, RATE_LIMITS.standard)
}
