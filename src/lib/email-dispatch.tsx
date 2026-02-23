/**
 * Email dispatch helpers.
 * Wraps React email templates in plain functions so .ts action files
 * can send emails without needing JSX / .tsx extension.
 */
import React from 'react'
import { sendEmail } from '@/lib/email'
import AssessmentNotification from '@/components/email/AssessmentNotification'
import ResultNotification from '@/components/email/ResultNotification'
import CertificateDelivery from '@/components/email/CertificateDelivery'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cekatan.com'

export function buildUnsubscribeUrl(userId: string): string {
  return `${BASE_URL}/unsubscribe/${Buffer.from(userId).toString('base64')}`
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
