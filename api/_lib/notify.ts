import type { FeedbackRow } from './feedbackDb'
import { FEEDBACK_CATEGORY_LABELS } from './constants'

// Owner notification for new feedback. Calls the Resend REST API directly with
// fetch — no npm dependency. No-ops (with a warning) when RESEND_API_KEY is
// unset, so local dev and un-configured deploys don't error on submit.
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_TO = 'ivan.neun@gmail.com'
// Resend's shared sender works for delivering to the account owner's address;
// sending to anyone else needs a verified domain in FEEDBACK_EMAIL_FROM.
const DEFAULT_FROM = 'onboarding@resend.dev'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendFeedbackEmail(row: FeedbackRow, appUrl?: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('sendFeedbackEmail: RESEND_API_KEY não configurado — e-mail não enviado.')
    return
  }

  const to = process.env.FEEDBACK_EMAIL_TO || DEFAULT_TO
  const from = process.env.FEEDBACK_EMAIL_FROM || DEFAULT_FROM
  const categoryLabel = FEEDBACK_CATEGORY_LABELS[row.category] ?? row.category
  const dashboardUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/?admin` : null

  const lines = [
    `<h2>Novo feedback: ${escapeHtml(categoryLabel)}</h2>`,
    `<p><strong>Origem:</strong> ${row.source === 'shared' ? 'Texto da comunidade' : 'Texto próprio'}${
      row.theme ? ` · ${escapeHtml(row.theme)}` : ''
    }${row.jlpt_level ? ` · ${escapeHtml(row.jlpt_level)}` : ''}</p>`,
    row.comment
      ? `<p><strong>Comentário:</strong><br>${escapeHtml(row.comment).replace(/\n/g, '<br>')}</p>`
      : '<p><em>Sem comentário.</em></p>',
    `<p><strong>Texto reportado:</strong></p>`,
    `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333;">${escapeHtml(
      row.paragraph_jp,
    )}</blockquote>`,
    dashboardUrl ? `<p><a href="${dashboardUrl}">Abrir painel de feedback</a></p>` : '',
  ]

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `[Hibi] Feedback: ${categoryLabel}`,
        html: lines.join('\n'),
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('sendFeedbackEmail: Resend respondeu', res.status, text)
    }
  } catch (err) {
    console.error('sendFeedbackEmail error:', err)
  }
}
