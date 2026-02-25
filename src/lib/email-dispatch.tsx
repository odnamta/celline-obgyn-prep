/**
 * Email dispatch helpers.
 * Wraps React email templates in plain functions so .ts action files
 * can send emails without needing JSX / .tsx extension.
 */
import crypto from 'crypto'
import React from 'react'
import { sendEmail } from '@/lib/email'
import AssessmentNotification from '@/components/email/AssessmentNotification'
import ResultNotification from '@/components/email/ResultNotification'
import CertificateDelivery from '@/components/email/CertificateDelivery'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cekatan.com'

/**
 * Generate HMAC-signed unsubscribe token.
 * Format: base64url(userId):hmac — not guessable without SUPABASE_SERVICE_ROLE_KEY.
 */
function signUnsubscribeToken(userId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret'
  const payload = Buffer.from(userId).toString('base64url')
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${hmac}`
}

/**
 * Verify and extract userId from an HMAC-signed unsubscribe token.
 * Returns the userId if valid, null otherwise.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) return null

  const payload = token.slice(0, dotIndex)
  const providedHmac = token.slice(dotIndex + 1)

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret'
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('base64url')

  // Constant-time comparison
  if (providedHmac.length !== expectedHmac.length) return null
  const a = Buffer.from(providedHmac)
  const b = Buffer.from(expectedHmac)
  if (!crypto.timingSafeEqual(a, b)) return null

  try {
    return Buffer.from(payload, 'base64url').toString()
  } catch {
    return null
  }
}

export function buildUnsubscribeUrl(userId: string): string {
  return `${BASE_URL}/unsubscribe/${signUnsubscribeToken(userId)}`
}

export function buildFullUrl(path: string): string {
  return `${BASE_URL}${path}`
}

/**
 * Fire-and-forget assessment notification email (published, reminder, deadline).
 */
export function dispatchAssessmentEmail(opts: {
  to: string
  subject: string
  orgName: string
  assessmentTitle: string
  message: string
  actionUrl: string
  unsubscribeUrl: string
}): Promise<{ ok: boolean }> {
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    react: React.createElement(AssessmentNotification, {
      orgName: opts.orgName,
      assessmentTitle: opts.assessmentTitle,
      message: opts.message,
      actionUrl: opts.actionUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    }),
  })
}

/**
 * Fire-and-forget result notification email (failed candidates).
 */
export function dispatchResultEmail(opts: {
  to: string
  subject: string
  orgName: string
  candidateName: string
  assessmentTitle: string
  score: number
  passed: boolean
  actionUrl: string
  unsubscribeUrl: string
}): Promise<{ ok: boolean }> {
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    react: React.createElement(ResultNotification, {
      orgName: opts.orgName,
      candidateName: opts.candidateName,
      assessmentTitle: opts.assessmentTitle,
      score: opts.score,
      passed: opts.passed,
      actionUrl: opts.actionUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    }),
  })
}

/**
 * Fire-and-forget certificate delivery email (passed candidates).
 */
export function dispatchCertificateEmail(opts: {
  to: string
  subject: string
  orgName: string
  candidateName: string
  assessmentTitle: string
  score: number
  certificateUrl: string
  unsubscribeUrl: string
}): Promise<{ ok: boolean }> {
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    react: React.createElement(CertificateDelivery, {
      orgName: opts.orgName,
      candidateName: opts.candidateName,
      assessmentTitle: opts.assessmentTitle,
      score: opts.score,
      certificateUrl: opts.certificateUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    }),
  })
}
