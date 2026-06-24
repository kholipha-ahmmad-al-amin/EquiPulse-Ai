// src/hooks/useWhatsApp.ts
// =============================================================================
//  Real WhatsApp delivery. Uses the user's own Meta Cloud API or Twilio creds
//  (configured in Settings > API Integrations). If no creds are set, the hook
//  returns `{ ok: false, reason: 'not_configured' }` so the caller can show a
//  "set up in Settings" CTA instead of a fake success.
// =============================================================================

import { useCallback, useState } from 'react'
import { getCredentialValues } from './useCredentials'

export type WhatsAppTemplate = 'order_receipt' | 'baki_reminder' | 'low_stock_alert' | 'custom'

export interface WhatsAppSendArgs {
  to: string // e164, e.g. +8801712345678
  template: WhatsAppTemplate
  variables: Record<string, string | number>
  body?: string
}

export interface WhatsAppSendResult {
  ok: boolean
  reason?: 'not_configured' | 'invalid_phone' | 'provider_error' | 'rate_limited' | 'no_internet'
  providerMessageId?: string
  error?: string
}

const QUEUE_KEY = 'equipulse.whatsapp.outbox.v1'

interface QueuedItem {
  id: string
  to: string
  template: WhatsAppTemplate
  variables: Record<string, string | number>
  body?: string
  createdAt: number
  attempts: number
  lastError?: string
}

function loadQueue(): QueuedItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveQueue(items: QueuedItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-200)))
}

function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '')
  if (!digits) return null
  if (digits.startsWith('+')) return digits
  // Bangladesh default: 01xxxxxxxxx -> +8801xxxxxxxxx
  if (/^01\d{9}$/.test(digits)) return '+880' + digits.slice(1)
  if (/^8801\d{9}$/.test(digits)) return '+' + digits
  if (/^\d{10,15}$/.test(digits)) return '+' + digits
  return null
}

async function sendViaMetaCloud(
  args: { to: string; body?: string; variables: Record<string, string | number>; template: WhatsAppTemplate },
  creds: { phoneNumberId: string; accessToken: string; apiVersion?: string },
): Promise<WhatsAppSendResult> {
  const apiVersion = creds.apiVersion || 'v20.0'
  const url = `https://graph.facebook.com/${apiVersion}/${creds.phoneNumberId}/messages`
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: args.to,
    type: 'text',
    text: { body: args.body ?? renderTemplate(args.template, args.variables) },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (res.ok) {
    const data = (await res.json()) as { messages?: Array<{ id: string }> }
    return { ok: true, providerMessageId: data.messages?.[0]?.id }
  }
  const errText = await res.text()
  if (res.status === 429) return { ok: false, reason: 'rate_limited', error: errText }
  return { ok: false, reason: 'provider_error', error: errText }
}

async function sendViaTwilio(
  args: { to: string; body?: string; variables: Record<string, string | number>; template: WhatsAppTemplate },
  creds: { accountSid: string; authToken: string; fromNumber: string },
): Promise<WhatsAppSendResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`
  const body = new URLSearchParams({
    From: `whatsapp:${creds.fromNumber}`,
    To: `whatsapp:${args.to}`,
    Body: args.body ?? renderTemplate(args.template, args.variables),
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${creds.accountSid}:${creds.authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })
  if (res.ok) {
    const data = (await res.json()) as { sid?: string }
    return { ok: true, providerMessageId: data.sid }
  }
  return { ok: false, reason: 'provider_error', error: await res.text() }
}

export function renderTemplate(template: WhatsAppTemplate, vars: Record<string, string | number>): string {
  switch (template) {
    case 'order_receipt':
      return [
        `✅ ${vars.storeName ?? 'Your store'}: Order confirmed.`,
        `Total: ৳${vars.total ?? 0}`,
        `Items: ${vars.itemCount ?? 0}`,
        vars.invoiceId ? `Invoice: ${vars.invoiceId}` : '',
        `Thank you for shopping with us.`,
      ]
        .filter(Boolean)
        .join('\n')
    case 'baki_reminder':
      return [
        `📒 ${vars.storeName ?? 'Your store'}: Friendly baki reminder.`,
        `Pending: ৳${vars.amount ?? 0}`,
        `Customer: ${vars.customerName ?? 'Valued customer'}`,
        `Please settle at your earliest convenience.`,
      ].join('\n')
    case 'low_stock_alert':
      return `⚠️ ${vars.storeName ?? 'Your store'}: ${vars.itemName ?? 'An item'} is below threshold (${vars.quantity ?? 0} left).`
    default:
      return vars.body ? String(vars.body) : ''
  }
}

export function useWhatsApp() {
  const [queue, setQueue] = useState<QueuedItem[]>(() => loadQueue())
  const [sending, setSending] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const send = useCallback(async (args: WhatsAppSendArgs): Promise<WhatsAppSendResult> => {
    setLastError(null)
    const phone = normalizePhone(args.to)
    if (!phone) {
      setLastError('Invalid phone number')
      return { ok: false, reason: 'invalid_phone' }
    }
    if (!navigator.onLine) {
      // Queue for later
      const item: QueuedItem = {
        id: crypto.randomUUID(),
        to: phone,
        template: args.template,
        variables: args.variables,
        body: args.body,
        createdAt: Date.now(),
        attempts: 0,
      }
      const next = [...queue, item]
      setQueue(next)
      saveQueue(next)
      return { ok: false, reason: 'no_internet' }
    }
    setSending(true)
    try {
      const cloud = await getCredentialValues('whatsapp_cloud')
      if (cloud) {
        const result = await sendViaMetaCloud(
          { to: phone, body: args.body, variables: args.variables, template: args.template },
          cloud as { phoneNumberId: string; accessToken: string; apiVersion?: string },
        )
        if (!result.ok) setLastError(result.error ?? null)
        return result
      }
      const twilio = await getCredentialValues('whatsapp_twilio')
      if (twilio) {
        const result = await sendViaTwilio(
          { to: phone, body: args.body, variables: args.variables, template: args.template },
          twilio as { accountSid: string; authToken: string; fromNumber: string },
        )
        if (!result.ok) setLastError(result.error ?? null)
        return result
      }
      setLastError('No WhatsApp provider configured')
      return { ok: false, reason: 'not_configured' }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err))
      return { ok: false, reason: 'provider_error', error: String(err) }
    } finally {
      setSending(false)
    }
  }, [queue])

  const flushQueue = useCallback(async (): Promise<{ sent: number; failed: number }> => {
    if (!navigator.onLine) return { sent: 0, failed: 0 }
    let sent = 0
    let failed = 0
    const remaining: QueuedItem[] = []
    for (const item of queue) {
      const result = await send({
        to: item.to,
        template: item.template,
        variables: item.variables,
        body: item.body,
      })
      if (result.ok) sent++
      else if (result.reason === 'no_internet') remaining.push(item)
      else {
        failed++
        if (item.attempts < 5) remaining.push({ ...item, attempts: item.attempts + 1, lastError: result.error })
      }
    }
    setQueue(remaining)
    saveQueue(remaining)
    return { sent, failed }
  }, [queue, send])

  return { send, flushQueue, queue, sending, lastError, normalizePhone }
}
