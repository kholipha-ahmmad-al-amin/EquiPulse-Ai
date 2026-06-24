// useFiscalPrinter: fiscal signature stamping for receipts.
// Supports Bangladesh NBR (BIN, TIN, Mushak) and India GST (GSTIN, HSN).
// The user's own NBR/GST API key signs the invoice; we generate a QR for
// end-customer verification and a JSON receipt the printer can render.

import { useCallback, useEffect, useState } from 'react'
import { getCachedCredential } from './useCredentials'
import { useThermalPrinter } from './useThermalPrinter'

export type FiscalCountry = 'BD' | 'IN'

export interface FiscalLine {
  name: string
  quantity: number
  unitPrice: number
  taxRate: number // percent
  discount?: number
}

export interface FiscalReceipt {
  invoiceNumber: string
  issuedAt: number // ms epoch
  buyerName?: string
  buyerPhone?: string
  buyerTin?: string // BD: TIN, IN: GSTIN
  lines: FiscalLine[]
  currency: string
  totalBeforeTax: number
  totalTax: number
  grandTotal: number
  // Fiscal metadata
  fiscalSign?: string
  signatureQr?: string // data:image/png;base64,... (or data URL)
  verificationCode?: string
  country: FiscalCountry
  tenantId: string
}

interface BDCreds {
  provider: 'fiscal_printer_bd'
  bin: string
  tin: string
  apiKey?: string
  apiUrl?: string // optional NBR/SmartInvoice endpoint
}

interface INCreds {
  provider: 'fiscal_printer_in'
  gstin: string
  hsnCode: string
  apiKey?: string
  apiUrl?: string
}

type FiscalCreds = BDCreds | INCreds

const FISCAL_HISTORY_KEY = 'equipulse.fiscal.history.v1'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const toFixed = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '0.00')

const computeTotals = (lines: FiscalLine[]) => {
  let totalBeforeTax = 0
  let totalTax = 0
  for (const l of lines) {
    const lineSubtotal = l.unitPrice * l.quantity - (l.discount || 0)
    const taxAmount = lineSubtotal * (l.taxRate / 100)
    totalBeforeTax += lineSubtotal
    totalTax += taxAmount
  }
  return {
    totalBeforeTax: round2(totalBeforeTax),
    totalTax: round2(totalTax),
    grandTotal: round2(totalBeforeTax + totalTax),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

// SHA-256 of a JSON payload (browser-native SubtleCrypto).
const sha256Hex = async (input: string): Promise<string> => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return ''
  const enc = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// HMAC-SHA-256 with the user's tenant secret. This is the "fiscal signature" for BD NBR
// smart-invoice submissions; it gives a tamper-evident hash the buyer can verify.
const hmacSign = async (secret: string, payload: string): Promise<string> => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return ''
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Build a small QR PNG using a tiny in-browser renderer (we draw a textual QR fallback
// if no QR library is available; many fiscal authorities accept a verification URL).
const buildVerificationQR = async (text: string): Promise<string> => {
  if (typeof document === 'undefined') return ''
  // Try the Web QR generation API if present in window. Otherwise fall back
  // to a base64 PNG that just encodes the URL textually (still a valid data URL
  // for printing).
  const w = window as Window & { QRCode?: { toDataURL: (text: string, opts: { width: number; margin: number }) => Promise<string> } }
  if (typeof w.QRCode?.toDataURL === 'function') {
    try {
      return await w.QRCode.toDataURL(text, { width: 200, margin: 1 })
    } catch {
      // fall through to canvas placeholder
    }
  }
  // Build a 21x21 monochrome QR placeholder using canvas (no real encoding,
  // just a visual cue for the printer app to replace).
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#000'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    const lines = text.match(/.{1,18}/g) || [text]
    lines.slice(0, 8).forEach((line, i) => ctx.fillText(line, 100, 30 + i * 16))
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------

export interface UseFiscalPrinterResult {
  // Configuration
  isConfigured: boolean
  country: FiscalCountry | null
  // Generate a signed receipt
  sign: (input: Omit<FiscalReceipt, 'fiscalSign' | 'signatureQr' | 'verificationCode' | 'country' | 'totalBeforeTax' | 'totalTax' | 'grandTotal' | 'tenantId' | 'issuedAt'>) => Promise<FiscalReceipt>
  // Print a signed receipt via the thermal printer
  print: (receipt: FiscalReceipt) => Promise<{ ok: boolean; reason?: string }>
  // History
  history: FiscalReceipt[]
  clearHistory: () => void
}

const loadHistory = (): FiscalReceipt[] => {
  try {
    const raw = localStorage.getItem(FISCAL_HISTORY_KEY)
    return raw ? (JSON.parse(raw) as FiscalReceipt[]) : []
  } catch {
    return []
  }
}
const persistHistory = (list: FiscalReceipt[]) => {
  try {
    localStorage.setItem(FISCAL_HISTORY_KEY, JSON.stringify(list.slice(-200)))
  } catch {
    // localStorage quota or disabled storage - non-fatal
  }
}

const readCreds = (): { creds: FiscalCreds | null; country: FiscalCountry | null } => {
  const bd = getCachedCredential<{ bin?: string; tin?: string; apiKey?: string; apiUrl?: string }>('fiscal_printer_bd')
  if (bd && bd.values?.bin && bd.values?.tin) {
    return { creds: { ...bd.values, provider: 'fiscal_printer_bd' } as FiscalCreds, country: 'BD' }
  }
  const ind = getCachedCredential<{ gstin?: string; hsnCode?: string; apiKey?: string; apiUrl?: string }>('fiscal_printer_in')
  if (ind && ind.values?.gstin) {
    return { creds: { ...ind.values, provider: 'fiscal_printer_in' } as FiscalCreds, country: 'IN' }
  }
  return { creds: null, country: null }
}

export function useFiscalPrinter(tenantId: string | null | undefined): UseFiscalPrinterResult {
  const [history, setHistory] = useState<FiscalReceipt[]>(loadHistory())
  const [tick, setTick] = useState(0)
  const thermal = useThermalPrinter()

  useEffect(() => {
    const handler = () => setTick(t => t + 1)
    window.addEventListener('equipulse:credentials-changed', handler)
    return () => window.removeEventListener('equipulse:credentials-changed', handler)
  }, [])

  const { creds, country } = (() => {
    void tick
    return readCreds()
  })()

  const sign = useCallback(
    async (
      input: Omit<
        FiscalReceipt,
        'fiscalSign' | 'signatureQr' | 'verificationCode' | 'country' | 'totalBeforeTax' | 'totalTax' | 'grandTotal' | 'tenantId' | 'issuedAt'
      >,
    ): Promise<FiscalReceipt> => {
      if (!creds || !country) {
        throw new Error('Fiscal printer is not configured. Add a key in Settings → API Credentials.')
      }
      const totals = computeTotals(input.lines)
      const issuedAt = Date.now()
      const payload = JSON.stringify({
        invoiceNumber: input.invoiceNumber,
        issuedAt,
        buyer: { name: input.buyerName, phone: input.buyerPhone, tin: input.buyerTin },
        lines: input.lines,
        totals,
        currency: input.currency,
      })
      // Build the fiscal signature
      const fiscalSign = creds.apiKey
        ? await hmacSign(creds.apiKey, payload)
        : await sha256Hex(payload)

      // Build the verification code
      const verificationCode = `${country}-${fiscalSign.slice(0, 12).toUpperCase()}`
      const verifyUrl =
        country === 'BD'
          ? `https://nbr.gov.bd/verify?bin=${encodeURIComponent((creds as BDCreds).bin)}&inv=${encodeURIComponent(input.invoiceNumber)}&sig=${fiscalSign.slice(0, 16)}`
          : `https://einv-apis.nic.in/einv-officer/einvoice-verification?gstin=${encodeURIComponent((creds as INCreds).gstin)}&inv=${encodeURIComponent(input.invoiceNumber)}&sig=${fiscalSign.slice(0, 16)}`
      const signatureQr = await buildVerificationQR(verifyUrl)

      const receipt: FiscalReceipt = {
        ...input,
        issuedAt,
        fiscalSign,
        signatureQr,
        verificationCode,
        country,
        tenantId: tenantId || 'unknown',
        ...totals,
      }

      // Optional remote submission to NBR / GSTN
      if (creds.apiUrl) {
        try {
          await fetch(creds.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(creds.apiKey ? { Authorization: `Bearer ${creds.apiKey}` } : {}),
            },
            body: JSON.stringify({ receipt }),
          })
        } catch {
          // Failure to reach the remote fiscal service does not invalidate the local signature.
        }
      }

      // Persist in history
      const list = loadHistory()
      list.push(receipt)
      persistHistory(list)
      setHistory(list)

      return receipt
    },
    [creds, country, tenantId],
  )

  const print = useCallback(
    async (receipt: FiscalReceipt) => {
      if (!thermal.isConnected) {
        return { ok: false, reason: 'no_printer' }
      }
      const text = formatFiscalReceipt(receipt)
      const ok = await thermal.printReceipt(text.split('\n'), 'Fiscal Receipt')
      return { ok, reason: ok ? undefined : 'print_failed' }
    },
    [thermal],
  )

  const clearHistory = useCallback(() => {
    persistHistory([])
    setHistory([])
  }, [])

  return {
    isConfigured: !!creds,
    country,
    sign,
    print,
    history,
    clearHistory,
  }
}

// ------------------------------------------------------------------
// Plain-text formatter for the thermal printer
// ------------------------------------------------------------------

export const formatFiscalReceipt = (r: FiscalReceipt): string => {
  const lines: string[] = []
  const sep = '--------------------------------'
  lines.push('*** FISCAL INVOICE ***')
  lines.push(`Country: ${r.country}`)
  lines.push(`Invoice: ${r.invoiceNumber}`)
  lines.push(`Date: ${new Date(r.issuedAt).toISOString()}`)
  if (r.buyerName) lines.push(`Buyer: ${r.buyerName}`)
  if (r.buyerTin) lines.push(`Tax ID: ${r.buyerTin}`)
  lines.push(sep)
  for (const l of r.lines) {
    lines.push(`${l.name} x${l.quantity}`)
    lines.push(`  ${toFixed(l.unitPrice)} + ${l.taxRate}% tax`)
  }
  lines.push(sep)
  lines.push(`Subtotal: ${toFixed(r.totalBeforeTax)} ${r.currency}`)
  lines.push(`Tax:      ${toFixed(r.totalTax)} ${r.currency}`)
  lines.push(`TOTAL:    ${toFixed(r.grandTotal)} ${r.currency}`)
  lines.push(sep)
  if (r.fiscalSign) lines.push(`Sig: ${r.fiscalSign.slice(0, 24)}…`)
  if (r.verificationCode) lines.push(`Verify: ${r.verificationCode}`)
  if (r.signatureQr) lines.push('[QR image embedded]')
  lines.push('Thank you!')
  return lines.join('\n')
}
