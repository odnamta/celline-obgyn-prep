'use server'

import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import {
  calculateAccuracy,
  isLowConfidence,
  formatDayName,
  findWeakestTopic,
  deriveSubjectFromDecks,
} from '@/lib/analytics-utils'
import type {
  TopicAccuracy,
  DeckProgress,
  DailyActivity,
} from '@/types/database'

export interface AnalyticsResult {
  success: boolean
  topicAccuracies: TopicAccuracy[]
  deckProgress: DeckProgress[]
  weakestTopic: TopicAccuracy | null
  error?: string
}

export interface ActivityResult {
  success: boolean
  activity: DailyActivity[]
  error?: string
}

export async function getUserAnalytics(): Promise<AnalyticsResult> {
  const user = await getUser()
  if (!user) {
    return {
      success: false,
      topicAccuracies: [],
      deckProgress: [],
      weakestTopic: null,
      error: 'Authentication required',
    }
  }

  const supabase = await createSupabaseServerClient()

  try {
    const { data: userDecks, error: userDecksError } = await supabase
      .from('user_decks')
      .select(`deck_template_id, deck_templates!inner(id, title)`)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (userDecksError) {
      return {
        success: false,
        topicAccuracies: [],
        deckProgress: [],
        weakestTopic: null,
        error: userDecksError.message,
      }
    }


    const deckTemplateIds = userDecks?.map(d => d.deck_template_id) || []

    if (deckTemplateIds.length === 0) {
      return {
        success: true,
        topicAccuracies: [],
        deckProgress: [],
        weakestTopic: null,
      }
    }

    const selectQuery = `correct_count, total_attempts, card_template_id, card_templates!inner(id, deck_template_id, card_template_tags(tags!inner(id, name, color, category)))`
    const { data: progressData, error: progressError } = await supabase
      .from('user_card_progress')
      .select(selectQuery)
      .eq('user_id', user.id)

    if (progressError) {
      return {
        success: false,
        topicAccuracies: [],
        deckProgress: [],
        weakestTopic: null,
        error: progressError.message,
      }
    }

    const topicMap = new Map<string, {
      tagId: string
      tagName: string
      tagColor: string
      correctCount: number
      totalAttempts: number
    }>()

    const deckProgressMap = new Map<string, {
      deckId: string
      deckTitle: string
      cardsLearned: number
      totalCards: number
    }>()

    for (const ud of userDecks || []) {
      const deck = ud.deck_templates as unknown as { id: string; title: string }
      deckProgressMap.set(ud.deck_template_id, {
        deckId: ud.deck_template_id,
        deckTitle: deck.title,
        cardsLearned: 0,
        totalCards: 0,
      })
    }

    for (const deckId of deckTemplateIds) {
      const { count } = await supabase
        .from('card_templates')
        .select('*', { count: 'exact', head: true })
        .eq('deck_template_id', deckId)

      const existing = deckProgressMap.get(deckId)
      if (existing) {
        existing.totalCards = count || 0
      }
    }


    for (const progress of progressData || []) {
      const cardTemplate = progress.card_templates as unknown as {
        id: string
        deck_template_id: string
        card_template_tags: Array<{
          tags: { id: string; name: string; color: string; category: string }
        }>
      }

      if (!deckTemplateIds.includes(cardTemplate.deck_template_id)) {
        continue
      }

      const deckProgress = deckProgressMap.get(cardTemplate.deck_template_id)
      if (deckProgress && (progress.total_attempts ?? 0) > 0) {
        deckProgress.cardsLearned++
      }

      for (const ctt of cardTemplate.card_template_tags || []) {
        const tag = ctt.tags
        if (tag.category !== 'topic') continue

        const existing = topicMap.get(tag.id)
        if (existing) {
          existing.correctCount += progress.correct_count ?? 0
          existing.totalAttempts += progress.total_attempts ?? 0
        } else {
          topicMap.set(tag.id, {
            tagId: tag.id,
            tagName: tag.name,
            tagColor: tag.color,
            correctCount: progress.correct_count ?? 0,
            totalAttempts: progress.total_attempts ?? 0,
          })
        }
      }
    }

    const topicAccuracies: TopicAccuracy[] = Array.from(topicMap.values()).map(t => ({
      tagId: t.tagId,
      tagName: t.tagName,
      tagColor: t.tagColor,
      accuracy: calculateAccuracy(t.correctCount, t.totalAttempts),
      correctCount: t.correctCount,
      totalAttempts: t.totalAttempts,
      isLowConfidence: isLowConfidence(t.totalAttempts),
    }))

    topicAccuracies.sort((a, b) => {
      if (a.accuracy === null) return 1
      if (b.accuracy === null) return -1
      return a.accuracy - b.accuracy
    })

    const weakestTopic = findWeakestTopic(topicAccuracies)
    const deckProgress: DeckProgress[] = Array.from(deckProgressMap.values())

    return {
      success: true,
      topicAccuracies,
      deckProgress,
      weakestTopic,
    }
  } catch (error) {
    console.error('getUserAnalytics error:', error)
    return {
      success: false,
      topicAccuracies: [],
      deckProgress: [],
      weakestTopic: null,
      error: 'Failed to fetch analytics data',
    }
  }
}


export async function getActivityData(days: number = 7): Promise<ActivityResult> {
  const user = await getUser()
  if (!user) {
    return {
      success: false,
      activity: [],
      error: 'Authentication required',
    }
  }

  const supabase = await createSupabaseServerClient()

  try {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (days - 1))
    const startDateStr = startDate.toISOString().split('T')[0]

    const { data: logs, error: logsError } = await supabase
      .from('study_logs')
      .select('study_date, cards_reviewed')
      .eq('user_id', user.id)
      .gte('study_date', startDateStr)
      .order('study_date', { ascending: true })

    if (logsError) {
      return {
        success: false,
        activity: [],
        error: logsError.message,
      }
    }

    const logMap = new Map<string, number>()
    for (const log of logs || []) {
      logMap.set(log.study_date, log.cards_reviewed)
    }

    const activity: DailyActivity[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      activity.push({
        date: dateStr,
        dayName: formatDayName(date),
        cardsReviewed: logMap.get(dateStr) ?? 0,
      })
    }

    return {
      success: true,
      activity,
    }
  } catch (error) {
    console.error('getActivityData error:', error)
    return {
      success: false,
      activity: [],
      error: 'Failed to fetch activity data',
    }
  }
}


export interface SubjectResult {
  success: boolean
  subject: string
  error?: string
}

/**
 * Gets the user's current subject from their first active deck.
 * Returns "OBGYN" as default if no decks found.
 * 
 * Requirements: 2.2, 2.3
 */
export async function getUserSubject(): Promise<SubjectResult> {
  const user = await getUser()
  if (!user) {
    return {
      success: false,
      subject: 'OBGYN',
      error: 'Authentication required',
    }
  }

  const supabase = await createSupabaseServerClient()

  try {
    const { data: userDecks, error: userDecksError } = await supabase
      .from('user_decks')
      .select(`deck_template_id, deck_templates!inner(id, title, subject)`)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    if (userDecksError) {
      return {
        success: false,
        subject: 'OBGYN',
        error: userDecksError.message,
      }
    }

    const decks = userDecks?.map(ud => {
      const deck = ud.deck_templates as unknown as { title: string; subject?: string | null }
      return { title: deck.title, subject: deck.subject }
    }) || []

    const subject = deriveSubjectFromDecks(decks)

    return {
      success: true,
      subject,
    }
  } catch (error) {
    console.error('getUserSubject error:', error)
    return {
      success: false,
      subject: 'OBGYN',
      error: 'Failed to fetch subject',
    }
  }
}
