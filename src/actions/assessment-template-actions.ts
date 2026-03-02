'use server'

/**
 * Assessment templates, question preview, and proctoring (tab switch reporting / violations).
 */

import { withOrgUser } from '@/actions/_helpers'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { hasMinimumRole } from '@/lib/org-authorization'
import type { ActionResultV2 } from '@/types/actions'
import type { AssessmentTemplate, AssessmentTemplateConfig } from '@/types/database'

/**
 * Report a tab switch during an assessment session.
 * Increments the tab_switch_count on the session row.
 */
export async function reportTabSwitch(
  sessionId: string
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ user, supabase }) => {
    const { data: session } = await supabase
      .from('assessment_sessions')
      .select('id, tab_switch_count, tab_switch_log')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .single()

    if (!session) {
      return { ok: false, error: 'Sesi tidak ditemukan' }
    }

    const newCount = ((session.tab_switch_count as number) ?? 0) + 1
    const log = Array.isArray(session.tab_switch_log) ? session.tab_switch_log : []
    log.push({ timestamp: new Date().toISOString(), type: 'tab_hidden' })

    await supabase
      .from('assessment_sessions')
      .update({ tab_switch_count: newCount, tab_switch_log: log })
      .eq('id', sessionId)

    return { ok: true }
  }, undefined, RATE_LIMITS.standard)
}

/**
 * Get proctoring violations for a specific session.
 * Creator+ only.
 */
export async function getSessionViolations(
  sessionId: string
): Promise<ActionResultV2<{
  tabSwitchCount: number
  tabSwitchLog: Array<{ timestamp: string; type: string }>
  userEmail: string
  assessmentTitle: string
}>> {
  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Izin tidak cukup' }
    }

    const { data: session } = await supabase
      .from('assessment_sessions')
      .select('*, assessments!inner(org_id, title)')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return { ok: false, error: 'Sesi tidak ditemukan' }
    }

    const assessmentData = session.assessments as unknown as { org_id: string; title: string }
    if (assessmentData.org_id !== org.id) {
      return { ok: false, error: 'Sesi tidak ditemukan' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', session.user_id)
      .single()

    return {
      ok: true,
      data: {
        tabSwitchCount: session.tab_switch_count ?? 0,
        tabSwitchLog: Array.isArray(session.tab_switch_log) ? session.tab_switch_log : [],
        userEmail: profile?.email ?? `user-${session.user_id.slice(0, 8)}`,
        assessmentTitle: assessmentData.title,
      },
    }
  })
}

// ── Assessment Templates ───────────────────────────────────────────────────

/**
 * Save an assessment configuration as a reusable template.
 */
export async function saveAssessmentTemplate(
  input: { name: string; description?: string; config: AssessmentTemplateConfig }
): Promise<ActionResultV2<AssessmentTemplate>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Memerlukan peran kreator' }
    }

    const { data, error } = await supabase
      .from('assessment_templates')
      .insert({
        org_id: org.id,
        name: input.name,
        description: input.description ?? null,
        config: input.config,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: data as AssessmentTemplate }
  }, undefined, RATE_LIMITS.standard)
}

/**
 * List all assessment templates for the current org.
 */
export async function getAssessmentTemplates(): Promise<ActionResultV2<AssessmentTemplate[]>> {
  return withOrgUser(async ({ supabase, org }) => {
    const { data, error } = await supabase
      .from('assessment_templates')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: (data ?? []) as AssessmentTemplate[] }
  })
}

/**
 * Delete an assessment template.
 */
export async function deleteAssessmentTemplate(
  templateId: string
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Memerlukan peran kreator' }
    }

    const { error } = await supabase
      .from('assessment_templates')
      .delete()
      .eq('id', templateId)
      .eq('org_id', org.id)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: undefined }
  }, undefined, RATE_LIMITS.standard)
}

// ============================================
// Question Preview (Creator)
// ============================================

type PreviewQuestion = {
  id: string
  stem: string
  options: string[]
  correctIndex: number
}

/**
 * Fetches a sample of questions from an assessment's deck for creator preview.
 * Returns up to `limit` questions with correct answers visible.
 */
export async function getAssessmentPreviewQuestions(
  assessmentId: string,
  limit = 10,
): Promise<ActionResultV2<PreviewQuestion[]>> {
  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Memerlukan peran kreator' }
    }

    const { data: assessment } = await supabase
      .from('assessments')
      .select('id, deck_template_id')
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .single()

    if (!assessment) {
      return { ok: false, error: 'Asesmen tidak ditemukan' }
    }

    const { data: cards, error } = await supabase
      .from('card_templates')
      .select('id, stem, options, correct_index')
      .eq('deck_template_id', assessment.deck_template_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { ok: false, error: error.message }

    const questions: PreviewQuestion[] = (cards ?? []).map((c) => ({
      id: c.id,
      stem: c.stem,
      options: c.options ?? [],
      correctIndex: c.correct_index ?? 0,
    }))

    return { ok: true, data: questions }
  })
}
