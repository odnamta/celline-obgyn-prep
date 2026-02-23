import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set, skipping email')
    return { ok: true as const }
  }

  const { error } = await getResend().emails.send({
    from: 'Cekatan <noreply@cekatan.com>',
    to,
    subject,
    react,
  })

  if (error) {
    console.error('[email] Send failed:', error)
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const }
}
