import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Square,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Download,
  Trash2,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { generateAiContentStream } from '../utils/aiClient'
import { useInventory } from '../hooks/useInventory'
import { useDailyRegister } from '../hooks/useDailyRegister'
import { useCustomerLedger } from '../hooks/useCustomerLedger'
import { useStoreProfile } from '../hooks/useStoreProfile'
import { useStaff } from '../hooks/useStaff'
import { evaluateLocalChatQuery, queryOllamaOffline } from '../utils/localChatEngine'
import { useApiKeys } from '../hooks/useApiKeys'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useAuthSession } from '../hooks/useAuthSession'
import { renderMarkdownToHtml } from '../utils/markdownLite'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  ts: number
  feedback?: 'up' | 'down' | null
  model?: string
  stoppedAt?: number
  imageDataUrl?: string
}

const MAX_TURNS = 50 // LRU cap (FR-6.5)
const MAX_INPUT = 3000
const STORAGE_PREFIX = 'equipulse-chat-'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function storageKey(tenantId: string | null | undefined) {
  return `${STORAGE_PREFIX}${tenantId || 'default'}`
}

function loadHistory(tenantId: string | null | undefined): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed.slice(-MAX_TURNS) : []
  } catch {
    return []
  }
}

function saveHistory(tenantId: string | null | undefined, turns: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(tenantId), JSON.stringify(turns.slice(-MAX_TURNS)))
  } catch {
    /* localStorage may be full; silently drop */
  }
}

function buildSystemPrompt(args: {
  ownerName: string
  storeName: string
  items: ReturnType<typeof useInventory>['items']
  register: ReturnType<typeof useDailyRegister>['register']
  credits: ReturnType<typeof useCustomerLedger>['credits']
  staff: ReturnType<typeof useStaff>['staffList']
  locale: string
}) {
  const { ownerName, storeName, items, register, credits, staff, locale } = args
  const top50 = items.slice(0, 50)
  
  const localeNames: Record<string, string> = {
    en: 'English', bn: 'Bengali (Bangla)', es: 'Spanish', fr: 'French',
    ar: 'Arabic', zh: 'Chinese', hi: 'Hindi', ru: 'Russian', pt: 'Portuguese',
    id: 'Indonesian', ur: 'Urdu', de: 'German', ja: 'Japanese', sw: 'Swahili', tr: 'Turkish'
  }
  const lang = localeNames[(locale === 'bn' ? 'bn' : 'en')] || 'English'
  
  return [
    `You are the AI copilot for "${storeName}" (owner: ${ownerName}).`,
    `CRITICAL INSTRUCTION: You MUST reply exclusively in ${lang}. Your tone must be completely natural, human-written, and culturally impactful for a retail shop setting.`,
    `DO NOT use any "AI-sounding" phrasing or emojis. NEVER use an em-dash in your response; use standard commas, periods, or native punctuation instead.`,
    `You have read-only access to the following snapshot of their business data:`,
    `- Inventory (${items.length} products, showing top 50):`,
    JSON.stringify(top50, null, 0).slice(0, 6000),
    `- Today's register: ${JSON.stringify(register || {}).slice(0, 1200)}`,
    `- Customer ledger: ${credits.length} entries, total ৳${credits.reduce((a, c) => a + c.amount, 0)}`,
    `- Staff: ${staff.length} members (${staff.map(s => `${s.name}/${s.role}`).join(', ')})`,
    `Be concise, actionable, and reference specific numbers when possible.`,
    `If asked for markdown, use **bold**, lists, and tables ;  the panel will render them.`,
  ].join('\n')
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIChatPanel() {
  const { t, locale } = useI18n()
  // const isBn = locale === 'bn'

  const { items } = useInventory()
  const { register } = useDailyRegister()
  const { credits } = useCustomerLedger()
  const { profile } = useStoreProfile()
  const { staffList } = useStaff()
  const [apiKeys] = useApiKeys()
  const { isOnline } = useNetworkStatus()
  const { tenantId: authTenantId } = useAuthSession()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [stoppedTokens, setStoppedTokens] = useState<Record<string, number>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)
  const [imageAttachment, setImageAttachment] = useState<{ dataUrl: string; name: string } | null>(null)
  const [thinkingStep, setThinkingStep] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  const isStreamingRef = useRef(false)
  const hydratedRef = useRef(false)

  const tenantId = authTenantId || (profile as { tenantId?: string } | null)?.tenantId || null

  /* -------- Persistence (FR-6.5) ----------------------------------- */
  useEffect(() => {
    setMessages(prev => {
      const ownerName = profile?.ownerName || profile?.ownerName || t(`Owner`)
      const storeName = profile?.storeName || profile?.storeName || t(`your store`)
      const welcomeBase = t('chatWelcomeBase', { defaultValue: `Hello ${ownerName}! I'm the AI copilot for "${storeName}". How can I help today? Tap any chip below to get started.` })
      const content = welcomeBase.replace('${ownerName}', ownerName).replace('${storeName}', storeName)
      
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content,
        ts: prev.find(m => m.id === 'welcome')?.ts || 0,
        feedback: null,
      }

      const others = prev.filter(m => m.id !== 'welcome')
      const merged = [welcomeMsg, ...others]
      return merged.sort((a, b) => a.ts - b.ts)
    })
  }, [profile, t])

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const stored = loadHistory(tenantId).filter(m => m.id !== 'welcome')
    setMessages(prev => {
      const welcome = prev.find(m => m.id === 'welcome')
      const merged = welcome ? [welcome, ...stored] : stored
      return merged.sort((a, b) => a.ts - b.ts)
    })
  }, [tenantId])

  useEffect(() => {
    messagesRef.current = messages
    if (hydratedRef.current) {
      saveHistory(tenantId, messages.filter(m => m.id !== 'welcome'))
    }
  }, [messages, tenantId])

  /* -------- Auto-scroll ------------------------------------------- */
  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen, isTyping])

  /* -------- External open trigger (existing tour integration) ----- */
  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('equipulse-open-chat', handler as EventListener)
    return () => window.removeEventListener('equipulse-open-chat', handler as EventListener)
  }, [])

  /* -------- Keyboard shortcuts: Ctrl/Cmd-J toggle, Esc close ------ */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isToggle = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j'
      if (isToggle) {
        e.preventDefault()
        setIsOpen(o => !o)
        return
      }
      if (e.key === 'Escape' && isOpen) {
        if (isStreamingRef.current) {
          abortRef.current?.abort()
        } else {
          setIsOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  /* -------- Image paste / drop (FR-6.11) -------------------------- */
  useEffect(() => {
    if (!isOpen) return
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of Array.from(items)) {
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onload = () => {
            setImageAttachment({ dataUrl: String(reader.result), name: file.name })
          }
          reader.readAsDataURL(file)
          e.preventDefault()
          break
        }
      }
    }
    const onDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0]
      if (file && file.type.startsWith('image/')) {
        e.preventDefault()
        const reader = new FileReader()
        reader.onload = () => setImageAttachment({ dataUrl: String(reader.result), name: file.name })
        reader.readAsDataURL(file)
      }
    }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    window.addEventListener('paste', onPaste)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', onDragOver)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', onDragOver)
    }
  }, [isOpen])

  /* -------- Stop / cancel in-flight stream (FR-6.8) -------------- */
  const stopStream = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /* -------- Send a turn (used by form + chips) -------------------- */
  const sendTurn = useCallback(
    async (textArg: string, imageArg?: { dataUrl: string; name: string }) => {
      const text = textArg.trim()
      if (!text && !imageArg) return
      if (isStreamingRef.current) return

      const userTurn: ChatMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        content: text || (t(`[image]`)),
        ts: Date.now(),
        imageDataUrl: imageArg?.dataUrl,
      }
      const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const assistantTurn: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        ts: Date.now(),
        feedback: null,
      }

      setMessages(prev => [...prev, userTurn, assistantTurn])
      setInput('')
      setImageAttachment(null)
      setIsTyping(true)
      setStreamingId(assistantId)
      isStreamingRef.current = true

      window.dispatchEvent(
        new CustomEvent('equipulse-tour-action', { detail: { action: 'chat-sent' } }),
      )

      // Advanced Labor Illusion effect (SQE/UX)
      const laborSteps = [
        t('Establishing secure neural link...'),
        t('Scanning business vectors...'),
        t('Analyzing behavioral metrics...'),
        t('Synthesizing insights...'),
      ]
      for (const step of laborSteps) {
        setThinkingStep(step)
        await new Promise(r => setTimeout(r, 450))
      }

      // Try local engine first when offline / no keys (FR-6.13 / fallback)
      if (!isOnline || (!apiKeys.gemini && !apiKeys.groq && !apiKeys.openrouter)) {
        setThinkingStep(t('Evaluating local models...'))
        await new Promise(r => setTimeout(r, 400))
        
        const localReply = evaluateLocalChatQuery(
          text,
          { items, register, credits, profile, staff: staffList },
          locale as 'en' | 'bn',
        )
        if (localReply) {
          setMessages(prev =>
            prev.map(m => (m.id === assistantId ? { ...m, content: localReply, model: 'local' } : m)),
          )
          setIsTyping(false)
          setStreamingId(null)
          isStreamingRef.current = false
          return
        }

        const ollamaReply = await queryOllamaOffline(text, { items, register, credits, profile, staff: staffList })
        if (ollamaReply) {
          setMessages(prev =>
            prev.map(m => (m.id === assistantId ? { ...m, content: ollamaReply, model: 'local-ollama' } : m)),
          )
          setIsTyping(false)
          setStreamingId(null)
          isStreamingRef.current = false
          return
        }

        // No local match and no key → graceful error
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: t('chatErrorNoKey'), model: 'error' }
              : m,
          ),
        )
        setIsTyping(false)
        setStreamingId(null)
        isStreamingRef.current = false
        setThinkingStep(null)
        return
      }

      setThinkingStep(t('Consulting upstream LLM gateway...'))
      await new Promise(r => setTimeout(r, 500))
      setThinkingStep(null)

      // Stream from the upstream model (FR-6.7)
      const ownerName = profile?.ownerName || (t(`Owner`))
      const storeName = profile?.storeName || (t(`your store`))
      const systemPrompt = buildSystemPrompt({
        ownerName,
        storeName,
        items,
        register,
        credits,
        staff: staffList,
        locale,
      })
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []
      if (text) parts.push({ text })
      if (imageArg) {
        const [meta = '', b64 = ''] = imageArg.dataUrl.split(',')
        const mime = (/data:([^;]+)/.exec(meta)?.[1]) || 'image/jpeg'
        if (b64) parts.push({ inlineData: { data: b64, mimeType: mime } })
      }

      const ac = new AbortController()
      abortRef.current = ac
      let tokens = 0
      let modelUsed: string | undefined

      try {
        for await (const chunk of generateAiContentStream(
          { systemPrompt, parts, apiKeys, expectJson: false },
          ac,
        )) {
          if (chunk.source) modelUsed = chunk.source
          if (chunk.text) {
            tokens += chunk.text.length
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk.text, model: modelUsed }
                  : m,
              ),
            )
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStoppedTokens(prev => ({ ...prev, [assistantId]: tokens }))
          setMessages(prev =>
            prev.map(m => (m.id === assistantId ? { ...m, stoppedAt: tokens } : m)),
          )
        } else {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: prev.find(x => x.id === assistantId)?.content + `\n\n_${t('chatErrorGeneric')}_`, model: 'error' }
                : m,
            ),
          )
        }
      } finally {
        setIsTyping(false)
        setStreamingId(null)
        isStreamingRef.current = false
        abortRef.current = null
      }
    },
    [apiKeys, credits, isOnline, items, locale, profile, register, staffList, t],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendTurn(input, imageAttachment || undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendTurn(input, imageAttachment || undefined)
    }
  }

  /* -------- Bubble actions (FR-6.6) ------------------------------- */
  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1600)
    } catch {
      /* clipboard blocked */
    }
  }

  const regenerate = (msg: ChatMessage) => {
    // Find the user prompt that preceded this assistant message
    const idx = messages.findIndex(m => m.id === msg.id)
    if (idx <= 0) return
    const userTurn = messages[idx - 1]
    if (!userTurn || userTurn.role !== 'user') return
    // Remove this assistant message and re-send
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    sendTurn(userTurn.content, userTurn.imageDataUrl ? { dataUrl: userTurn.imageDataUrl, name: 'pasted' } : undefined)
  }

  const setFeedback = (id: string, value: 'up' | 'down') => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, feedback: value } : m)))
    setFeedbackToast(t('feedbackThanks'))
    setTimeout(() => setFeedbackToast(null), 1600)
  }

  const clearChat = () => {
    if (!window.confirm(t(`Clear all chat history?`))) return
    setMessages([])
    if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey(tenantId))
    // Re-seed welcome
    setTimeout(() => {
      const ownerName = profile?.ownerName || (t(`Owner`))
      const storeName = profile?.storeName || (t(`your store`))
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: t(`Hello ${ownerName}! How can I help with "${storeName}"?`),
          ts: Date.now(),
          feedback: null,
        },
      ])
    }, 50)
  }

  const exportChat = (format: 'txt' | 'json') => {
    const date = new Date().toISOString().slice(0, 10)
    const data =
      format === 'json'
        ? JSON.stringify(
            { locale, exportedAt: new Date().toISOString(), tenantId, turns: messages },
            null,
            2,
          )
        : messages
            .map(m => {
              const ts = new Date(m.ts).toLocaleString()
              const head = m.role === 'user' ? (t(`You`)) : (t(`AI`))
              return `[${ts}] ${head}: ${m.content}`
            })
            .join('\n\n')
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equipulse-chat-${date}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /* -------- Suggestion chips & quick-action tiles (FR-6.4, 6.10) - */
  const suggestionChips = useMemo(
    () => [
      { id: 'chip-today', label: t('chipTodaySales', { defaultValue: "Today's Sales" }), prompt: t('chipTodaySalesPrompt', { defaultValue: "What is today's total sales?" }) },
      { id: 'chip-lowstock', label: t('chipLowStock', { defaultValue: "Low Stock" }), prompt: t('chipLowStockPrompt', { defaultValue: "Which products are low on stock?" }) },
      { id: 'chip-best', label: t('chipBestCustomer', { defaultValue: "Best Customer" }), prompt: t('chipBestCustomerPrompt', { defaultValue: "Who is my best customer?" }) },
      { id: 'chip-top', label: t('chipTopSku', { defaultValue: "Top SKU" }), prompt: t('chipTopSkuPrompt', { defaultValue: "What is the top SKU today?" }) },
      { id: 'chip-sales-alt', label: t('chipAltTotalSales', { defaultValue: "Total Sold?" }), prompt: t('chipAltTotalSalesPrompt', { defaultValue: "How much was sold today?" }) },
      { id: 'chip-baki', label: t('chipDue', { defaultValue: "Today's Due" }), prompt: t('chipDuePrompt', { defaultValue: "What is today's due?" }) },
      { id: 'chip-staff', label: t('chipAddStaff', { defaultValue: "Add Staff" }), prompt: t('chipAddStaffPrompt', { defaultValue: "Help me add new staff" }) },
      { id: 'chip-pdf', label: t('chipExportPdf', { defaultValue: "Export PDF" }), prompt: t('chipExportPdfPrompt', { defaultValue: "Export today's report as PDF" }) },
    ],
    [t],
  )

  const quickActionTiles = useMemo(
    () => [
      { id: 'tile-scan', emoji: '🧾', label: t('tileScanReceipt'), prompt: t('tileScanReceiptPrompt'), route: '/data' },
      { id: 'tile-report', emoji: '📊', label: t('tileSalesReport'), prompt: t('tileSalesReportPrompt'), route: '/pulse' },
      { id: 'tile-staff', emoji: '👥', label: t('tileAddStaff'), prompt: t('tileAddStaffPrompt'), route: '/staff' },
    ],
    [t],
  )

  const onTileClick = (tile: { route: string; prompt: string }) => {
    // Route + prime chat with intent
    window.history.pushState({}, '', tile.route)
    window.dispatchEvent(new PopStateEvent('popstate'))
    sendTurn(tile.prompt)
  }

  /* -------- Derived: char counter, online status, markdown html -- */
  const charCount = input.length
  const charWarn = charCount > MAX_INPUT * 0.9
  const charHtml = useMemo(() => {
    return t('charCounter')
      .replace('{count}', String(charCount))
      .replace('{max}', String(MAX_INPUT))
  }, [charCount, t])

  const isEmpty = messages.filter(m => m.id !== 'welcome').length === 0

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* FAB (FR-6.1) ;  keep id="tour-chat-btn" for the tour integration */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            id="tour-chat-btn"
            onClick={() => setIsOpen(true)}
            aria-label={t('chatWelcome')}
            className="fixed bottom-[6rem] md:bottom-6 right-4 md:right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-1 ring-accent/30 hover:bg-accent/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <MessageSquare className="h-6 w-6" />
            {isTyping && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-danger" />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label={t('chatWelcome')}
            initial={{ y: 100, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 100, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 sm:left-auto sm:right-6 sm:bottom-6 z-[100] flex h-[85vh] max-h-[640px] w-full sm:w-[420px] flex-col rounded-t-2xl sm:rounded-2xl border border-muted/40 bg-surface/95 shadow-2xl backdrop-blur pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-muted/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{t('chatSubtitle')}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-ink/60">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-success' : 'bg-warn'} animate-pulse`}
                    />
                    {isOnline ? t('streamOnline') : t('streamOffline')}
                    {streamingId && <span className="ml-1 opacity-60">· {t('streamCaret')}</span>}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => exportChat('txt')}
                  aria-label={t('chatExport')}
                  title={t('chatExportTxt')}
                  className="rounded p-1.5 text-ink/60 hover:bg-muted hover:text-ink"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  aria-label={t('chatClear')}
                  title={t('chatClear')}
                  className="rounded p-1.5 text-ink/60 hover:bg-muted hover:text-ink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="rounded p-1.5 text-ink/60 hover:bg-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages (FR-6.14: role=log, aria-live=polite) */}
            <div
              role="log"
              aria-live="polite"
              aria-busy={isTyping}
              className="flex-1 overflow-y-auto px-3 py-3"
            >
              {isEmpty && (
                <div className="mb-3 space-y-3">
                  {/* Quick-action tiles (FR-6.10) */}
                  <div className="grid grid-cols-3 gap-2">
                    {quickActionTiles.map(tile => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => onTileClick(tile)}
                        className="flex flex-col items-center gap-1 rounded-xl border border-muted/40 bg-muted/40 p-3 text-center text-[11px] text-ink hover:bg-muted/70"
                      >
                        <span className="text-xl" aria-hidden="true">
                          {tile.emoji}
                        </span>
                        <span>{tile.label}</span>
                      </button>
                    ))}
                  </div>
                  {/* Suggestion chips (FR-6.4) */}
                  <div>
                    <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink/50">
                      {t(`Quick start`)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestionChips.map(chip => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => sendTurn(chip.prompt)}
                          className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] text-accent hover:bg-accent/20"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map(m => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isStreaming={m.id === streamingId}
                  stoppedAt={m.stoppedAt ?? stoppedTokens[m.id]}
                  copied={copiedId === m.id}
                  isLast={m.id === messages[messages.length - 1]?.id}
                  onCopy={() => copyMessage(m.id, m.content)}
                  onRegenerate={() => regenerate(m)}
                  onFeedback={v => setFeedback(m.id, v)}
                />
              ))}

              {isTyping && streamingId === null && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 flex items-center gap-2 text-xs text-ink/60 bg-surface-strong/30 w-fit px-3 py-1.5 rounded-full border border-line"
                >
                  <Bot className="h-4 w-4 text-accent" />
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  <motion.span 
                    key={thinkingStep}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-medium tracking-wide"
                  >
                    {thinkingStep || t('thinking')}
                  </motion.span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {messages.some(m => m.model === 'error' && m.id === messages[messages.length - 1]?.id) &&
              !isTyping && (
                <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-ink">
                  <span>{t('chatErrorGeneric')}</span>
                  <button
                    type="button"
                    onClick={() => (window.location.hash = '#/profile')}
                    className="rounded bg-accent px-2 py-1 text-[11px] text-white"
                  >
                    {t('chatRetryWithKey')}
                  </button>
                </div>
              )}

            {/* Input form */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-muted/40 p-3"
              aria-label={t('chatWelcome')}
            >
              {imageAttachment && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-2 py-1.5 text-[11px] text-ink">
                  <ImageIcon className="h-3.5 w-3.5 text-accent" />
                  <span className="flex-1 truncate">{imageAttachment.name}</span>
                  <button
                    type="button"
                    onClick={() => setImageAttachment(null)}
                    aria-label="Remove"
                    className="text-ink/60 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    id="tour-chat-input"
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value.slice(0, MAX_INPUT))}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chatPlaceholder')}
                    rows={1}
                    aria-label={t('chatWelcome')}
                    className="w-full resize-none rounded-xl border border-muted/40 bg-muted/30 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-ink/50">
                    <span title={t('attachImageHint')} className="truncate">
                      <Paperclip className="mr-0.5 inline shrink-0 h-3 w-3" />
                      {t('attachImageHint')}
                    </span>
                    <span className={`shrink-0 ${charWarn ? 'text-warn' : ''}`}>{charHtml}</span>
                  </div>
                </div>
                {isTyping ? (
                  <button
                    type="button"
                    onClick={stopStream}
                    aria-label={t('chatStop')}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger text-white hover:bg-danger/90"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() && !imageAttachment}
                    aria-label={t('chatSend')}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isTyping && (
                <div className="mt-1 text-right text-[10px] text-ink/50">{t('chatStop')} (Esc)</div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy toast */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 text-xs text-surface shadow-lg"
          >
            {t('chatCopied')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback toast */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-20 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-success px-3 py-1.5 text-xs text-white shadow-lg"
          >
            {feedbackToast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  MessageBubble                                                      */
/* ------------------------------------------------------------------ */

type MessageBubbleProps = {
  msg: ChatMessage
  isStreaming: boolean
  stoppedAt?: number
  copied: boolean
  isLast: boolean
  onCopy: () => void
  onRegenerate: () => void
  onFeedback: (v: 'up' | 'down') => void
}

function MessageBubble({ msg, isStreaming, stoppedAt, copied, isLast, onCopy, onRegenerate, onFeedback }: MessageBubbleProps) {
  const isUser = msg.role === 'user'
  const html = useMemo(() => (isUser ? null : renderMarkdownToHtml(msg.content || '')), [isUser, msg.content])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`relative max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-ink text-surface'
            : 'rounded-bl-sm bg-muted/60 text-ink'
        }`}
      >
        {msg.imageDataUrl && (
          <img
            src={msg.imageDataUrl}
            alt="attachment"
            className="mb-1.5 max-h-40 rounded-lg border border-muted/40 object-contain"
          />
        )}
        {isUser ? (
          <span className="whitespace-pre-wrap break-words">{msg.content}</span>
        ) : (
          <>
            <div
              className="prose-equipulse break-words"
              // Markdown has already been HTML-escaped by markdownLite.
              dangerouslySetInnerHTML={{ __html: html || '' }}
            />
            {isStreaming && (
              <span className="ml-0.5 inline-block animate-pulse text-accent">▍</span>
            )}
            {stoppedAt !== undefined && !isStreaming && (
              <p className="mt-1 text-[10px] italic text-ink/50">
                (Stopped at {stoppedAt} chars)
              </p>
            )}
          </>
        )}
        <time className="mt-1 block text-right text-[10px] opacity-50">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>

        {/* Actions row (FR-6.6) */}
        <div
          className={`mt-1 flex items-center gap-1 ${isUser ? 'justify-end' : 'justify-start'} ${
            isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}
        >
          {!isUser && (
            <>
              <button
                type="button"
                onClick={onCopy}
                aria-label="Copy"
                className="rounded p-1 text-ink/50 hover:bg-muted hover:text-ink"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={onRegenerate}
                aria-label="Regenerate"
                className="rounded p-1 text-ink/50 hover:bg-muted hover:text-ink"
                title="Regenerate"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback('up')}
                aria-label="Helpful"
                className={`rounded p-1 hover:bg-muted ${msg.feedback === 'up' ? 'text-success' : 'text-ink/50'}`}
                title="Helpful"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback('down')}
                aria-label="Not helpful"
                className={`rounded p-1 hover:bg-muted ${msg.feedback === 'down' ? 'text-danger' : 'text-ink/50'}`}
                title="Not helpful"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {isUser && (
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy"
              className="rounded p-1 text-surface/60 hover:bg-ink/40"
              title="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
      {isUser && (
        <div className="ml-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink">
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  )
}
