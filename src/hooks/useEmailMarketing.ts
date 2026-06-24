// src/hooks/useEmailMarketing.ts
// =============================================================================
//  Real email sending. Supports three providers: Resend, SendGrid, and any
//  SMTP relay. The user picks one in Settings > API Integrations.
//
//  Resend and SendGrid are called from the browser using CORS, which both
//  providers support for client-side calls (Resend with api key + Bearer).
//  For SMTP, browsers cannot speak SMTP directly, so we fall back to a server
//  relay endpoint the user can host (or we ship a one-click Cloudflare Worker
//  template). When no SMTP relay URL is configured, the SMTP path returns
//  reason: 'smtp_relay_required' so the UI can explain.
// =============================================================================

import { useCallback, useState } from 'react'
import { getCredentialValues } from './useCredentials'

export interface EmailSendArgs {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface EmailSendResult {
  ok: boolean
  reason?: 'not_configured' | 'invalid_email' | 'provider_error' | 'smtp_relay_required' | 'rate_limited'
  providerMessageId?: string
  error?: string
}

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

async function sendViaResend(args: EmailSendArgs, creds: { apiKey: string; fromAddress: string; fromName?: string }): Promise<EmailSendResult> {
  const from = creds.fromName ? `${creds.fromName} <${creds.fromAddress}>` : creds.fromAddress
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.replyTo,
    }),
  })
  if (res.ok) {
    const data = (await res.json()) as { id?: string }
    return { ok: true, providerMessageId: data.id }
  }
  if (res.status === 429) return { ok: false, reason: 'rate_limited', error: await res.text() }
  return { ok: false, reason: 'provider_error', error: await res.text() }
}

async function sendViaSendGrid(args: EmailSendArgs, creds: { apiKey: string; fromAddress: string; fromName?: string }): Promise<EmailSendResult> {
  const from = creds.fromName ? { email: creds.fromAddress, name: creds.fromName } : { email: creds.fromAddress }
  const personalizations = [
    {
      to: (Array.isArray(args.to) ? args.to : [args.to]).map((e) => ({ email: e })),
      subject: args.subject,
    },
  ]
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations,
      from,
      content: [
        { type: 'text/plain', value: args.text ?? args.html.replace(/<[^>]+>/g, '') },
        { type: 'text/html', value: args.html },
      ],
      reply_to: args.replyTo ? { email: args.replyTo } : undefined,
    }),
  })
  if (res.ok || res.status === 202) {
    return { ok: true, providerMessageId: res.headers.get('x-message-id') ?? undefined }
  }
  if (res.status === 429) return { ok: false, reason: 'rate_limited', error: await res.text() }
  return { ok: false, reason: 'provider_error', error: await res.text() }
}

async function sendViaSmtpRelay(args: EmailSendArgs, creds: { host: string; port: string; user: string; pass: string; fromAddress: string; useTls?: string }): Promise<EmailSendResult> {
  // Browsers cannot speak SMTP. We forward to a relay endpoint the user can
  // host. EquiPulse ships a one-click Cloudflare Worker template that takes
  // a POST { smtp, message } and returns { id }.
  const relayUrl = localStorage.getItem('equipulse.smtpRelayUrl') ?? ''
  if (!relayUrl) {
    return { ok: false, reason: 'smtp_relay_required', error: 'Set an SMTP relay URL in Settings.' }
  }
  const res = await fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ smtp: creds, message: args }),
  })
  if (res.ok) {
    const data = (await res.json()) as { id?: string }
    return { ok: true, providerMessageId: data.id }
  }
  return { ok: false, reason: 'provider_error', error: await res.text() }
}

export function useEmailMarketing() {
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<Array<{ to: string; subject: string; ok: boolean; ts: number; id?: string; error?: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('equipulse.email.history.v1') ?? '[]')
    } catch {
      return []
    }
  })

  const persist = useCallback((next: typeof history) => {
    setHistory(next)
    localStorage.setItem('equipulse.email.history.v1', JSON.stringify(next.slice(-200)))
  }, [])

  const send = useCallback(async (args: EmailSendArgs): Promise<EmailSendResult> => {
    setSending(true)
    try {
      const recipients = (Array.isArray(args.to) ? args.to : [args.to]).map((e) => e.trim())
      for (const e of recipients) {
        if (!isValidEmail(e)) return { ok: false, reason: 'invalid_email', error: `Bad email: ${e}` }
      }

      const resend = await getCredentialValues('email_resend')
      if (resend) {
        const r = await sendViaResend({ ...args, to: recipients }, resend as { apiKey: string; fromAddress: string; fromName?: string })
        persist([{ to: recipients.join(','), subject: args.subject, ok: r.ok, ts: Date.now(), id: r.providerMessageId, error: r.error }, ...history])
        return r
      }
      const sg = await getCredentialValues('email_sendgrid')
      if (sg) {
        const r = await sendViaSendGrid({ ...args, to: recipients }, sg as { apiKey: string; fromAddress: string; fromName?: string })
        persist([{ to: recipients.join(','), subject: args.subject, ok: r.ok, ts: Date.now(), id: r.providerMessageId, error: r.error }, ...history])
        return r
      }
      const smtp = await getCredentialValues('email_smtp')
      if (smtp) {
        const r = await sendViaSmtpRelay({ ...args, to: recipients }, smtp as { host: string; port: string; user: string; pass: string; fromAddress: string; useTls?: string })
        persist([{ to: recipients.join(','), subject: args.subject, ok: r.ok, ts: Date.now(), id: r.providerMessageId, error: r.error }, ...history])
        return r
      }
      return { ok: false, reason: 'not_configured' }
    } catch (err) {
      return { ok: false, reason: 'provider_error', error: String(err) }
    } finally {
      setSending(false)
    }
  }, [history, persist])

  const renderReceipt = useCallback((storeName: string, invoiceId: string, items: Array<{ name: string; qty: number; price: number }>, total: number, currency: string) => {
    const itemRows = items
      .map((i) => `<tr><td style="padding:6px 0">${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${currency} ${(i.qty * i.price).toFixed(2)}</td></tr>`)
      .join('')
    return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1a1a1a">
      <h2 style="color:#0f766e">${storeName}</h2>
      <p>Invoice: <strong>${invoiceId}</strong></p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid #ccc"><th align="left">Item</th><th>Qty</th><th align="right">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr style="border-top:1px solid #ccc"><td colspan="2" align="right"><strong>Total</strong></td><td align="right"><strong>${currency} ${total.toFixed(2)}</strong></td></tr></tfoot>
      </table>
      <p style="margin-top:24px">Thank you for shopping with us.</p>
    </body></html>`
  }, [])

  return { send, sending, history, renderReceipt }
}
