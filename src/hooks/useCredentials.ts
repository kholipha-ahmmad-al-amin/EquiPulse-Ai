// src/hooks/useCredentials.ts
// =============================================================================
//  User-supplied API credentials manager.
//
//  Users bring their own keys for WhatsApp Business Cloud, Email (SMTP / Resend /
//  SendGrid), fiscal printer, payment gateways, etc. We never ship a hard-coded
//  secret. Every key is stored in the same IndexedDB keyspace as the rest of the
//  app and is encrypted with AES-GCM, keyed off a per-tenant passphrase the user
//  sets during onboarding (or an auto-generated one stored in localStorage).
//
//  All other hooks read through this single source of truth. If a key is
//  missing, the feature degrades gracefully with a clear "set up in Settings"
//  CTA rather than a fake success toast.
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { get, set, del } from 'idb-keyval'

// =============================================================================
// Types
// =============================================================================

export type CredentialProvider =
  | 'whatsapp_cloud'
  | 'whatsapp_twilio'
  | 'email_smtp'
  | 'email_resend'
  | 'email_sendgrid'
  | 'fiscal_printer_bd'
  | 'fiscal_printer_in'
  | 'payment_bkash'
  | 'payment_nagad'
  | 'payment_rocket'
  | 'payment_stripe'
  | 'shipping_pathao'
  | 'shipping_steadfast'
  | 'shipping_redx'
  | 'shipping_sundarban'
  | 'sms_ssl'
  | 'social_facebook'
  | 'social_instagram'
  | 'ai_vision'
  | 'zk_credit'

export interface CredentialField {
  key: string
  label: string
  placeholder?: string
  type: 'text' | 'password' | 'url' | 'number' | 'tel'
  help?: string
  required?: boolean
}

export interface CredentialDefinition {
  provider: CredentialProvider
  title: string
  description: string
  docsUrl: string
  fields: CredentialField[]
}

export interface StoredCredential {
  provider: CredentialProvider
  values: Record<string, string>
  updatedAt: number
  // fingerprint, never the secret itself
  fingerprint: string
}

// =============================================================================
// Registry of supported providers
// =============================================================================

export const CREDENTIAL_REGISTRY: CredentialDefinition[] = [
  {
    provider: 'whatsapp_cloud',
    title: 'WhatsApp Business (Meta Cloud API)',
    description: 'Send order updates and baki reminders through your own WhatsApp Business account.',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'businessAccountId', label: 'WhatsApp Business Account ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Permanent System User Access Token', type: 'password', required: true, help: 'Generate from Meta Business > System Users.' },
      { key: 'apiVersion', label: 'API Version', type: 'text', placeholder: 'v20.0' },
    ],
  },
  {
    provider: 'whatsapp_twilio',
    title: 'WhatsApp (Twilio)',
    description: 'Use Twilio as a WhatsApp gateway if you already have a Twilio account.',
    docsUrl: 'https://www.twilio.com/docs/whatsapp/api',
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'fromNumber', label: 'WhatsApp From (e164)', type: 'tel', required: true, placeholder: '+14155238886' },
    ],
  },
  {
    provider: 'email_resend',
    title: 'Email Marketing (Resend)',
    description: 'Send campaigns and receipts through Resend. Free tier covers 3,000 / month.',
    docsUrl: 'https://resend.com/docs',
    fields: [
      { key: 'apiKey', label: 'Resend API Key', type: 'password', required: true, placeholder: 're_...' },
      { key: 'fromAddress', label: 'From Address', type: 'text', required: true, placeholder: 'orders@yourdomain.com' },
      { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'My Store' },
    ],
  },
  {
    provider: 'email_sendgrid',
    title: 'Email Marketing (SendGrid)',
    description: 'Use SendGrid if you already send transactional email there.',
    docsUrl: 'https://docs.sendgrid.com/',
    fields: [
      { key: 'apiKey', label: 'SendGrid API Key', type: 'password', required: true, placeholder: 'SG. ...' },
      { key: 'fromAddress', label: 'From Address', type: 'text', required: true },
      { key: 'fromName', label: 'From Name', type: 'text' },
    ],
  },
  {
    provider: 'email_smtp',
    title: 'Email (Custom SMTP)',
    description: 'Any SMTP relay (Gmail app password, Zoho, Proton Bridge, your own Postfix).',
    docsUrl: 'https://nodemailer.com/smtp/',
    fields: [
      { key: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
      { key: 'port', label: 'Port', type: 'number', required: true, placeholder: '587' },
      { key: 'user', label: 'Username', type: 'text', required: true },
      { key: 'pass', label: 'Password / App Password', type: 'password', required: true },
      { key: 'fromAddress', label: 'From Address', type: 'text', required: true },
      { key: 'useTls', label: 'Use TLS (true/false)', type: 'text', placeholder: 'true' },
    ],
  },
  {
    provider: 'fiscal_printer_bd',
    title: 'Fiscal Printer (Bangladesh NBR)',
    description: 'Stamps every receipt with a Bangladesh NBR-style hash and your store BIN/TIN. Turn on only after your printer is registered.',
    docsUrl: 'https://nbr.gov.bd/',
    fields: [
      { key: 'bin', label: 'Business BIN', type: 'text', required: true, placeholder: '000000000-0000' },
      { key: 'tin', label: 'TIN', type: 'text', required: true },
      { key: 'signingKey', label: 'Signing Key (HMAC secret)', type: 'password', required: true, help: 'Provided by your fiscal integrator.' },
      { key: 'printerModel', label: 'Printer Model', type: 'text', placeholder: 'Epson TM-T88VI' },
    ],
  },
  {
    provider: 'fiscal_printer_in',
    title: 'Fiscal Printer (India GST)',
    description: 'GSTIN stamping and QR code per GSTR-1 §31.',
    docsUrl: 'https://einvoice.gst.gov.in/',
    fields: [
      { key: 'gstin', label: 'GSTIN', type: 'text', required: true, placeholder: '22AAAAA0000A1Z5' },
      { key: 'legalName', label: 'Legal Name on Certificate', type: 'text', required: true },
      { key: 'irnEndpoint', label: 'IRN Endpoint URL', type: 'url', required: true },
      { key: 'irnApiKey', label: 'IRN API Key', type: 'password', required: true },
    ],
  },
  {
    provider: 'payment_bkash',
    title: 'bKash Payment Gateway',
    description: 'Real-time bKash tokenized payments. Requires bKash PGW merchant onboarding.',
    docsUrl: 'https://developer.bka.sh/',
    fields: [
      { key: 'appKey', label: 'bKash App Key', type: 'text', required: true },
      { key: 'appSecret', label: 'bKash App Secret', type: 'password', required: true },
      { key: 'username', label: 'Merchant Username', type: 'text', required: true },
      { key: 'password', label: 'Merchant Password', type: 'password', required: true },
      { key: 'mode', label: 'Mode (sandbox/production)', type: 'text', placeholder: 'sandbox' },
    ],
  },
  {
    provider: 'payment_nagad',
    title: 'Nagad Payment Gateway',
    description: 'Nagad PGW for tokenized checkout.',
    docsUrl: 'https://developer.nagad.com.bd/',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'merchantKey', label: 'Merchant Key', type: 'password', required: true },
      { key: 'mode', label: 'Mode (sandbox/production)', type: 'text', placeholder: 'sandbox' },
    ],
  },
  {
    provider: 'payment_rocket',
    title: 'Rocket (Dutch-Bangla Bank)',
    description: 'DBBL Rocket merchant API.',
    docsUrl: 'https://developer.dutchbanglabank.com/',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'mode', label: 'Mode (sandbox/production)', type: 'text', placeholder: 'sandbox' },
    ],
  },
  {
    provider: 'shipping_pathao',
    title: 'Pathao Courier',
    description: 'Book Pathao riders directly from a sale.',
    docsUrl: 'https://merchant.pathao.com/',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'storeId', label: 'Store ID', type: 'text', required: true },
      { key: 'mode', label: 'Mode (sandbox/production)', type: 'text', placeholder: 'sandbox' },
    ],
  },
  {
    provider: 'shipping_steadfast',
    title: 'Steadfast Courier',
    description: 'Bangladesh-wide last-mile delivery.',
    docsUrl: 'https://steadfast.com.bd/',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  {
    provider: 'sms_ssl',
    title: 'SMS (SSL Wireless)',
    description: 'Bangladesh SMS gateway for baki reminders.',
    docsUrl: 'https://developer.sslwireless.com/',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'sid', label: 'SID', type: 'text', required: true },
      { key: 'domain', label: 'Domain', type: 'text', placeholder: 'https://smsplus.sslwireless.com' },
    ],
  },
  {
    provider: 'social_facebook',
    title: 'Facebook Page (Social Commerce)',
    description: 'Auto-publish catalog to a Facebook Shop connected to your Page.',
    docsUrl: 'https://developers.facebook.com/docs/commerce-platform',
    fields: [
      { key: 'pageId', label: 'Page ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Page Access Token', type: 'password', required: true },
      { key: 'catalogId', label: 'Catalog ID', type: 'text' },
    ],
  },
  {
    provider: 'social_instagram',
    title: 'Instagram Shopping',
    description: 'Tag products in Instagram posts via the Graph API.',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    fields: [
      { key: 'igUserId', label: 'Instagram Business User ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Long-Lived Access Token', type: 'password', required: true },
    ],
  },
  {
    provider: 'ai_vision',
    title: 'AI Vision (Gemini)',
    description: 'Powers the "tap a photo, get the SKU" feature at the POS. Free tier available.',
    docsUrl: 'https://aistudio.google.com/apikey',
    fields: [
      { key: 'apiKey', label: 'Google AI Studio API Key', type: 'password', required: true, placeholder: 'AIza...' },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'gemini-2.0-flash' },
    ],
  },
  {
    provider: 'zk_credit',
    title: 'Zero-Knowledge Credit Signing Key',
    description: 'Per-tenant HMAC key that signs the udhaar/credit score receipt you show to lenders, without revealing customer data.',
    docsUrl: '',
    fields: [
      { key: 'tenantSecret', label: 'Tenant Secret (32+ chars)', type: 'password', required: true, help: 'A random string you keep offline. We use it to sign the score.' },
    ],
  },
]

// =============================================================================
// Encryption (AES-GCM with a tenant passphrase)
// =============================================================================

const PASSPHRASE_KEY = 'equipulse.cred.passphrase.v1'
const DB_PREFIX = 'equipulse.cred.v1.'
const PBKDF2_ITERATIONS = 250_000

async function getOrCreatePassphrase(): Promise<string> {
  let passphrase = localStorage.getItem(PASSPHRASE_KEY)
  if (passphrase && passphrase.length >= 32) return passphrase
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  passphrase = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
  localStorage.setItem(PASSPHRASE_KEY, passphrase)
  return passphrase
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encrypt(plain: string): Promise<string> {
  const passphrase = await getOrCreatePassphrase()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  )
  // Pack: salt (16) | iv (12) | ciphertext
  const out = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  out.set(salt, 0)
  out.set(iv, salt.length)
  out.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return btoa(String.fromCharCode(...out))
}

async function decrypt(packed: string): Promise<string> {
  const passphrase = await getOrCreatePassphrase()
  const raw = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0))
  const salt = raw.slice(0, 16)
  const iv = raw.slice(16, 28)
  const ciphertext = raw.slice(28)
  const key = await deriveKey(passphrase, salt)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plain)
}

async function fingerprintOf(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
  return Array.from(new Uint8Array(buf).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('')
}

// =============================================================================
// Public API
// =============================================================================

export interface CredentialsApi {
  ready: boolean
  list: () => StoredCredential[]
  get: (provider: CredentialProvider) => Promise<StoredCredential | null>
  set: (provider: CredentialProvider, values: Record<string, string>) => Promise<StoredCredential>
  remove: (provider: CredentialProvider) => Promise<void>
  has: (provider: CredentialProvider) => boolean
  ref: { current: number }
}

let cache: Partial<Record<CredentialProvider, StoredCredential>> = {}
const listeners = new Set<() => void>()
let ready = false

async function readAllFromDb(): Promise<void> {
  cache = {}
  for (const def of CREDENTIAL_REGISTRY) {
    const enc = await get<string>(DB_PREFIX + def.provider)
    if (!enc) continue
    try {
      const plain = await decrypt(enc)
      const values = JSON.parse(plain) as Record<string, string>
      const fingerprint = await fingerprintOf(plain)
      cache[def.provider] = { provider: def.provider, values, updatedAt: Date.now(), fingerprint }
    } catch (err) {
      console.warn('[useCredentials] failed to decrypt', def.provider, err)
    }
  }
}

function notify(): void {
  for (const fn of listeners) fn()
}

export async function initCredentials(): Promise<void> {
  if (ready) return
  await readAllFromDb()
  ready = true
  notify()
}

export function getCachedCredential<T = Record<string, string>>(provider: CredentialProvider): (Omit<StoredCredential, 'values'> & { values: T }) | null {
  return (cache[provider] as (Omit<StoredCredential, 'values'> & { values: T }) | undefined) ?? null
}

export function useCredentials(): CredentialsApi & { refresh: () => Promise<void> } {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const fn = () => setVersion((v) => v + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  useEffect(() => {
    void initCredentials().then(() => setVersion((v) => v + 1))
  }, [])

  const refresh = useCallback(async () => {
    await readAllFromDb()
    notify()
  }, [])

  const get = useCallback(async (provider: CredentialProvider) => {
    return cache[provider] ?? null
  }, [])

  const setCred = useCallback(async (provider: CredentialProvider, values: Record<string, string>) => {
    const plain = JSON.stringify(values)
    const enc = await encrypt(plain)
    await set(DB_PREFIX + provider, enc)
    const fingerprint = await fingerprintOf(plain)
    cache[provider] = { provider, values, updatedAt: Date.now(), fingerprint }
    notify()
    return cache[provider]!
  }, [])

  const remove = useCallback(async (provider: CredentialProvider) => {
    await del(DB_PREFIX + provider)
    delete cache[provider]
    notify()
  }, [])

  const list = useCallback(() => Object.values(cache), [])

  const has = useCallback((provider: CredentialProvider) => Boolean(cache[provider]), [])

  return {
    ready,
    list,
    get,
    set: setCred,
    remove,
    has,
    refresh,
    ref: { current: version },
  }
}

// =============================================================================
// Helpers for non-hook callers (services that need to fire and forget)
// =============================================================================

export async function getCredentialValues(provider: CredentialProvider): Promise<Record<string, string> | null> {
  if (!ready) await initCredentials()
  return cache[provider]?.values ?? null
}
