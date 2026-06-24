// Real image recognition hook.
// Uses the user's own Gemini (Google AI) API key, stored encrypted via useCredentials.
// Falls back gracefully to "not_configured" so the UI can prompt the user to set up the key.

import { useCallback, useEffect, useState } from 'react'
import { getCachedCredential, getCredentialValues } from './useCredentials'
import type { InventoryItem } from './useInventory'

export type VisionProvider = 'gemini' | 'openai_vision' | 'local_off'

export type VisionReason =
  | 'ok'
  | 'not_configured'
  | 'no_image'
  | 'provider_error'
  | 'no_match'
  | 'rate_limited'
  | 'no_internet'

export interface VisionCandidate {
  name: string
  confidence: number
  quantity: number
  matchedItem?: InventoryItem
}

export interface VisionResult {
  ok: boolean
  reason: VisionReason
  candidates: VisionCandidate[]
  raw?: unknown
  error?: string
}

interface GeminiCreds {
  provider: 'gemini'
  apiKey: string
  model?: string
}

interface OpenAIVisionCreds {
  provider: 'openai_vision'
  apiKey: string
  model?: string
}

type Creds = GeminiCreds | OpenAIVisionCreds

const GEMINI_DEFAULT_MODEL = 'gemini-1.5-flash-latest'
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini'

const SYSTEM_INSTRUCTION = `You are EquiPulse Vision, an AI for a Bangladesh micro-SME POS system.
You see a photo (often a shelf, basket, or receipt) and must identify which inventory items are visible.
Respond ONLY with strict JSON of the form:
{
  "items": [
    { "name": "Best match from inventory", "confidence": 0.0_to_1.0, "quantity": 1 }
  ]
}
Rules:
- Only include items you can see with at least 0.5 confidence.
- If you see nothing recognizable, return {"items": []}.
- Names must be short, like a product label (Bangla or English is fine).`

const buildPrompt = (inventoryNames: string[]): string => {
  const names = inventoryNames.slice(0, 400).join('\n  - ')
  return `${SYSTEM_INSTRUCTION}

Inventory to match against (pick names from this list when possible):
  - ${names}

Return only the JSON. No prose, no markdown.`
}

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = () => {
      const result = reader.result as string
      const [meta, data] = result.split(',')
      const mimeMatch = /data:([^;]+);base64/.exec(meta || '')
      const mimeType = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : file.type || 'image/jpeg'
      resolve({ data: data || '', mimeType })
    }
    reader.readAsDataURL(file)
  })

const callGemini = async (
  creds: GeminiCreds,
  inventoryNames: string[],
  image: { data: string; mimeType: string },
): Promise<VisionResult> => {
  const model = creds.model || GEMINI_DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(creds.apiKey)}`
  const prompt = buildPrompt(inventoryNames)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: image.mimeType, data: image.data } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    })
  } catch (err) {
    return {
      ok: false,
      reason: 'no_internet',
      candidates: [],
      error: err instanceof Error ? err.message : 'Network error',
    }
  }

  if (res.status === 429) {
    return { ok: false, reason: 'rate_limited', candidates: [] }
  }
  if (!res.ok) {
    let body = ''
    try {
      body = await res.text()
    } catch {
      // body stays empty on read failure
    }
    return {
      ok: false,
      reason: 'provider_error',
      candidates: [],
      error: `Gemini ${res.status}: ${body.slice(0, 200)}`,
    }
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
  return parseAndMatch(text, inventoryNames)
}

const callOpenAIVision = async (
  creds: OpenAIVisionCreds,
  inventoryNames: string[],
  image: { data: string; mimeType: string },
): Promise<VisionResult> => {
  const model = creds.model || OPENAI_DEFAULT_MODEL
  const url = 'https://api.openai.com/v1/chat/completions'
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: SYSTEM_INSTRUCTION,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildPrompt(inventoryNames) },
              {
                type: 'image_url',
                image_url: { url: `data:${image.mimeType};base64,${image.data}` },
              },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    return {
      ok: false,
      reason: 'no_internet',
      candidates: [],
      error: err instanceof Error ? err.message : 'Network error',
    }
  }

  if (res.status === 429) {
    return { ok: false, reason: 'rate_limited', candidates: [] }
  }
  if (!res.ok) {
    let body = ''
    try {
      body = await res.text()
    } catch {
      // body stays empty on read failure
    }
    return {
      ok: false,
      reason: 'provider_error',
      candidates: [],
      error: `OpenAI ${res.status}: ${body.slice(0, 200)}`,
    }
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = json.choices?.[0]?.message?.content || ''
  return parseAndMatch(text, inventoryNames)
}

const parseAndMatch = (
  text: string,
  inventoryNames: string[],
): VisionResult => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  let parsed: { items?: { name: string; confidence?: number; quantity?: number }[] } | null = null
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const m = /\{[\s\S]*\}/.exec(cleaned)
    if (m) {
      try { parsed = JSON.parse(m[0]) } catch {
        parsed = null
      }
    }
  }
  if (!parsed || !Array.isArray(parsed.items)) {
    return { ok: false, reason: 'provider_error', candidates: [], error: 'Bad JSON from model', raw: text }
  }
  const lowerNames = inventoryNames.map(n => n.toLowerCase())
  const candidates: VisionCandidate[] = []
  for (const it of parsed.items) {
    if (!it || typeof it.name !== 'string') continue
    const needle = it.name.toLowerCase().trim()
    if (!needle) continue
    const idx = lowerNames.findIndex(n => n === needle)
    let matched: string | undefined
    if (idx >= 0) {
      matched = inventoryNames[idx]
    } else {
      const partial = lowerNames.findIndex(n => n.includes(needle) || needle.includes(n))
      if (partial >= 0) matched = inventoryNames[partial]
    }
    if (matched) {
      candidates.push({
        name: matched,
        confidence: Math.max(0, Math.min(1, Number(it.confidence) || 0.5)),
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
      })
    }
  }
  if (candidates.length === 0) {
    return { ok: false, reason: 'no_match', candidates: [], raw: text }
  }
  return { ok: true, reason: 'ok', candidates, raw: text }
}

export interface UseVisionOptions {
  inventory: InventoryItem[]
}

export interface UseVisionResult {
  recognize: (file: File) => Promise<VisionResult>
  isConfigured: boolean
  provider: VisionProvider | null
  lastResult: VisionResult | null
  isAnalyzing: boolean
}

const readCreds = (): { creds: Creds | null; provider: VisionProvider | null } => {
  const gem = getCachedCredential<{ apiKey?: string; model?: string }>('ai_vision')
  if (gem && gem.values?.apiKey) {
    return { creds: { provider: 'gemini', apiKey: gem.values.apiKey, model: gem.values.model }, provider: 'gemini' }
  }
  const oa = getCachedCredential<{ apiKey?: string; model?: string }>('ai_vision')
  if (oa && oa.values?.apiKey) {
    return {
      creds: { provider: 'openai_vision', apiKey: oa.values.apiKey, model: oa.values.model },
      provider: 'openai_vision',
    }
  }
  return { creds: null, provider: null }
}

export function useVision({ inventory }: UseVisionOptions): UseVisionResult {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastResult, setLastResult] = useState<VisionResult | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const handler = () => setTick(t => t + 1)
    window.addEventListener('equipulse:credentials-changed', handler)
    return () => window.removeEventListener('equipulse:credentials-changed', handler)
  }, [])

  const { creds, provider } = (() => {
    void tick
    return readCreds()
  })()

  const recognize = useCallback(
    async (file: File): Promise<VisionResult> => {
      if (!file) {
        const r: VisionResult = { ok: false, reason: 'no_image', candidates: [] }
        setLastResult(r)
        return r
      }
      const live = readCreds().creds
      if (!live) {
        const r: VisionResult = { ok: false, reason: 'not_configured', candidates: [] }
        setLastResult(r)
        return r
      }
      setIsAnalyzing(true)
      try {
        const image = await fileToBase64(file)
        const names = inventory.map(i => i.name)
        const result =
          live.provider === 'openai_vision'
            ? await callOpenAIVision(live, names, image)
            : await callGemini(live, names, image)
        if (result.ok) {
          const lookup = new Map(inventory.map(i => [i.name.toLowerCase(), i]))
          for (const c of result.candidates) {
            const found = lookup.get(c.name.toLowerCase())
            if (found) c.matchedItem = found
          }
        }
        setLastResult(result)
        return result
      } finally {
        setIsAnalyzing(false)
      }
    },
    [inventory],
  )

  return {
    recognize,
    isConfigured: !!creds,
    provider,
    lastResult,
    isAnalyzing,
  }
}

// Non-React helper for one-off calls (e.g. from a script or worker bridge).
export const recognizeImage = async (
  file: File,
  inventory: InventoryItem[],
): Promise<VisionResult> => {
  const { creds } = readCreds()
  if (!creds) return { ok: false, reason: 'not_configured', candidates: [] }
  const image = await fileToBase64(file)
  const names = inventory.map(i => i.name)
  const result =
    creds.provider === 'openai_vision'
      ? await callOpenAIVision(creds, names, image)
      : await callGemini(creds, names, image)
  if (result.ok) {
    const lookup = new Map(inventory.map(i => [i.name.toLowerCase(), i]))
    for (const c of result.candidates) {
      const found = lookup.get(c.name.toLowerCase())
      if (found) c.matchedItem = found
    }
  }
  return result
}

// Allows the panel to surface the currently active provider.
export const getActiveVisionProvider = (): VisionProvider | null => readCreds().provider

// Re-export for callers that don't import useCredentials directly.
export { getCredentialValues }
