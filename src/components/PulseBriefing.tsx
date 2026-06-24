import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type PanInfo,
} from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useHaptic } from '../hooks/useHaptic'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { type MerchantPulseAction } from '../hooks/useMerchantPulse'
import { useMerchantPulse } from '../hooks/useMerchantPulse'
import { useDecisionSync } from '../hooks/useDecisionSync'
import { useToast } from './ToastProvider'

// ─────────────────────────────────────────────────────────────────────────────
// PulseBriefing
// A premium, "daily briefing" experience for the AI Decision Queue.
// Replaces the old SwipeActionQueue in /queue with a hero header, 3D-tilted
// glass card, count-up money, terracotta AI voice, haptic + confetti on accept,
// XAI modal, and a celebration empty state.
// ─────────────────────────────────────────────────────────────────────────────

type Direction = 'left' | 'right' | 'up'

type PulseBriefingProps = {
  actions: MerchantPulseAction[]
  onComplete?: () => void
  /** Operator display name, e.g. "Rahim" ;  used in the greeting. */
  operatorName?: string
}

const SWIPE_COMMIT = 140
const SWIPE_VELOCITY = 600
const MAX_TILT = 18 // degrees at edge of drag

const toneAccent: Record<
  MerchantPulseAction['tone'],
  { token: string; soft: string; ring: string; label: string }
> = {
  accent: {
    token: 'var(--color-accent)',
    soft: 'rgba(var(--color-accent) / 0.14)',
    ring: 'rgba(var(--color-accent) / 0.35)',
    label: 'pulseAiVoice',
  },
  success: {
    token: 'var(--color-success)',
    soft: 'rgba(var(--color-success) / 0.14)',
    ring: 'rgba(var(--color-success) / 0.35)',
    label: 'pulseAiVoice',
  },
  warning: {
    token: 'var(--color-warning)',
    soft: 'rgba(var(--color-warning) / 0.16)',
    ring: 'rgba(var(--color-warning) / 0.4)',
    label: 'pulseAiVoice',
  },
  danger: {
    token: 'var(--color-danger)',
    soft: 'rgba(var(--color-danger) / 0.16)',
    ring: 'rgba(var(--color-danger) / 0.4)',
    label: 'pulseAiVoice',
  },
  focus: {
    token: 'var(--color-focus)',
    soft: 'rgba(var(--color-focus) / 0.14)',
    ring: 'rgba(var(--color-focus) / 0.35)',
    label: 'pulseAiVoice',
  },
}

function greetingKey(hour: number) {
  if (hour < 5) return 'pulseGreetingNight'
  if (hour < 12) return 'pulseGreetingMorning'
  if (hour < 17) return 'pulseGreetingAfternoon'
  if (hour < 21) return 'pulseGreetingEvening'
  return 'pulseGreetingNight'
}

function pickOperatorName(profile: { storeName?: string } | null, fallback?: string) {
  if (fallback && fallback.trim()) return fallback.trim()
  const store = profile?.storeName?.trim()
  if (!store) return ''
  // Take first word of the store name for a warm personal greeting
  return store.split(/\s+/)[0] ?? ''
}

function CountUpNumber({
  value,
  format,
  className,
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const motion = useMotionValue(0)
  const spring = useSpring(motion, { stiffness: 90, damping: 22, mass: 0.6 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    motion.set(value)
    const unsub = spring.on('change', (latest) => {
      setDisplay(latest)
    })
    return () => unsub()
  }, [motion, spring, value])

  const text = format ? format(display) : Math.round(display).toLocaleString()
  return <span className={className}>{text}</span>
}

function PulseGauge({ score, delta }: { score: number; delta: number }) {
  // Map 0-100 to a 360° gauge; we draw an arc and a filled progress arc.
  const clamped = Math.max(0, Math.min(100, score))
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const dash = (clamped / 100) * circumference
  const trendLabel =
    delta > 0 ? 'pulseScoreRising' : delta < 0 ? 'pulseScoreFalling' : 'pulseScoreSteady'
  void trendLabel
  return (
    <div className="pulse-gauge" aria-label="Pulse score">
      <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
        <defs>
          <linearGradient id="pulse-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-focus)" />
          </linearGradient>
        </defs>
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(var(--color-line) / 0.6)"
          strokeWidth="6"
        />
        <motion.circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="url(#pulse-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform="rotate(-90 32 32)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ stiffness: 80, damping: 18, mass: 0.8 }}
        />
        <circle
          cx="32"
          cy="32"
          r={26}
          fill="none"
          stroke="rgba(var(--color-accent) / 0.08)"
          strokeWidth="1"
        />
      </svg>
      <div className="pulse-gauge__text">
        <span className="pulse-gauge__score">{Math.round(clamped)}</span>
        <span className="pulse-gauge__delta" data-trend={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '-'}
          {Math.abs(delta) || ''}
        </span>
      </div>
    </div>
  )
}

function Taka({ value, className }: { value: number; className?: string }) {
  const { tNum, locale } = useI18n()
  return (
    <span className={className}>
      <span className="pulse-taka" aria-hidden="true">৳</span>
      {locale === 'bn' ? tNum(Math.round(value)) : Math.round(value).toLocaleString()}
    </span>
  )
}

function StreakBadge({ streak }: { streak: number }) {
  const { t, locale } = useI18n()
  if (streak <= 0) return null
  return (
    <span className="pulse-streak" title={t('pulseStreakDays')}>
      <Flame size={12} aria-hidden="true" />
      <span>
        {locale === 'bn' ? t("") : `${streak} `}
        {t('pulseStreakDays')}
      </span>
    </span>
  )
}

function OfflineRibbon() {
  const { isOnline } = useNetworkStatus()
  const { t } = useI18n()
  if (isOnline) {
    return (
      <span className="pulse-online">
        <Wifi size={12} aria-hidden="true" />
        {t(`Online`)}
      </span>
    )
  }
  return (
    <span className="pulse-offline" title={t('pulseOfflineHint')}>
      <WifiOff size={12} aria-hidden="true" />
      {t('pulseOfflineSaved')}
    </span>
  )
}

function SwipeProgressBar({
  x,
  threshold,
}: {
  x: ReturnType<typeof useMotionValue<number>>
  threshold: number
}) {
  const leftBloom = useTransform(x, [-threshold, 0], [1, 0])
  const rightBloom = useTransform(x, [0, threshold], [0, 1])
  return (
    <div className="pulse-progress">
      <motion.div
        className="pulse-progress__bloom pulse-progress__bloom--left"
        style={{ opacity: leftBloom }}
      />
      <motion.div
        className="pulse-progress__bloom pulse-progress__bloom--right"
        style={{ opacity: rightBloom }}
      />
      <motion.div
        className="pulse-progress__bar"
        style={{ scaleX: useTransform(x, [-threshold, 0, threshold], [-1, 0, 1]) }}
      />
    </div>
  )
}
void SwipeProgressBar

function XaiPanel({
  action,
  onClose,
}: {
  action: MerchantPulseAction
  onClose: () => void
}) {
  const { t } = useI18n()
  const title = action.title.en
  return (
    <AnimatePresence>
      <motion.div
        className="pulse-xai__scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          className="pulse-xai"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={t('pulseWhyTitle')}
        >
          <header className="pulse-xai__header">
            <div className="pulse-xai__title">
              <Sparkles size={14} aria-hidden="true" />
              <span>{t('pulseWhyTitle')}</span>
            </div>
            <button
              className="pulse-xai__close"
              onClick={onClose}
              aria-label="Close"
              type="button"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>
          <ol className="pulse-xai__steps">
            <li>
              <span className="pulse-xai__dot" data-tone="focus" />
              <div>
                <p className="pulse-xai__step-title">
                  {t("Analyzing local demand trends")}
                </p>
                <p className="pulse-xai__step-body">
                  {t("Found a 34% spike in this category over 48h")}
                </p>
              </div>
            </li>
            <li>
              <span className="pulse-xai__dot" data-tone="warning" />
              <div>
                <p className="pulse-xai__step-title">
                  {t("Checking inventory & risk")}
                </p>
                <p className="pulse-xai__step-body">
                  {t("Current stock covers ~1.2 days of demand")}
                </p>
              </div>
            </li>
            <li>
              <span className="pulse-xai__dot" data-tone="success" />
              <div>
                <p className="pulse-xai__step-title">
                  {t("Recommendation generated")}
                </p>
                <p className="pulse-xai__step-body">{title}</p>
              </div>
            </li>
          </ol>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function CelebrationState({
  score,
  delta,
  onReset,
}: {
  score: number
  delta: number
  onReset: () => void
}) {
  const { t } = useI18n()
  return (
    <motion.div
      className="pulse-celebrate"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      <div className="pulse-celebrate__halo" aria-hidden="true" />
      <div className="pulse-celebrate__ring">
        <CheckCircle2 size={56} className="pulse-celebrate__icon" />
      </div>
      <h3 className="pulse-celebrate__title">{t('pulseCelebrateTitle')}</h3>
      <p className="pulse-celebrate__body">{t('pulseCelebrateBody')}</p>
      <div className="pulse-celebrate__meta">
        <PulseGauge score={score} delta={delta} />
        <span className="pulse-celebrate__score-label">{t('pulseScoreLabel')}</span>
      </div>
      <button className="pulse-celebrate__cta" type="button" onClick={onReset}>
        {t(`Review again`)}
      </button>
    </motion.div>
  )
}

export function PulseBriefing({ actions, onComplete, operatorName }: PulseBriefingProps) {
  const { t } = useI18n()
  const { triggerHaptic } = useHaptic()
  const { syncAcceptedDecision } = useDecisionSync()
  const toast = useToast()
  const pulse = useMerchantPulse()
  const [cards, setCards] = useState(actions)
  const [committed, setCommitted] = useState(0)
  const [streak] = useState(3)
  const [xaiFor, setXaiFor] = useState<MerchantPulseAction | null>(null)
  const [score, setScore] = useState(72)
  const [scoreDelta, setScoreDelta] = useState(2)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Derived pulse health
  const pulseScore = useMemo(() => {
    const base = 55
    const stockLift = Math.max(0, 25 - pulse.lowStockItems.length * 8)
    const overduePenalty = pulse.overdueCredits.length * 6
    const expLift = pulse.weeklyExpenseTotal > 0 ? 6 : 0
    return Math.max(20, Math.min(99, base + stockLift - overduePenalty + expLift))
  }, [pulse.lowStockItems.length, pulse.overdueCredits.length, pulse.weeklyExpenseTotal])

  useEffect(() => {
    setScore(pulseScore)
  }, [pulseScore])

  const greeting = useMemo(() => greetingKey(new Date().getHours()), [])
  const name = pickOperatorName(null, operatorName)
  const total = cards.length + committed

  // Confetti on accept ;  calibrated for "satisfying" not "carnival"
  const fireConfetti = () => {
    try {
      const colors = [
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent')
          .trim(),
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-focus')
          .trim(),
      ].filter(Boolean)
      const rgb = colors.map((c) => `rgb(${c})`)
      void confetti({
        particleCount: 36,
        spread: 55,
        startVelocity: 32,
        gravity: 0.85,
        ticks: 90,
        scalar: 0.9,
        origin: { y: 0.55 },
        colors: rgb.length ? rgb : undefined,
      })
    } catch {
      // ignore
    }
  }

  const commit = (dir: Direction, action: MerchantPulseAction) => {
    if (dir === 'right') {
      triggerHaptic([12, 40, 12])
      fireConfetti()
      window.dispatchEvent(
        new CustomEvent('equipulse-tour-action', { detail: { action: 'swipe-accept' } }),
      )
      setScore((s) => Math.min(100, s + 2))
      setScoreDelta((d) => d + 1)
      void syncAcceptedDecision({
        taskId: action.id,
        priority: action.tone,
        title: typeof action.title === 'string' ? action.title : action.title.en,
        summary: typeof action.body === 'string' ? action.body : action.body?.en || '',
        confidence: 'N/A',
        revenueImpact: typeof action.metric === 'string' ? action.metric : action.metric?.en || 'N/A',
        stockImpact: 'N/A'
      }).catch((error: unknown) => {
        console.error('Decision sync failed:', error)
        toast(
          t(`Decision sync failed`),
          error instanceof Error ? error.message : t(`Please try again later.`),
          'error',
        )
      })
    } else if (dir === 'left') {
      triggerHaptic(8)
      setScore((s) => Math.max(20, s - 1))
    } else {
      triggerHaptic(6)
    }

    const decidedStr = window.localStorage.getItem('equipulse-decided-tasks')
    const decided = decidedStr ? JSON.parse(decidedStr) : {}
    decided[action.id] = Date.now()
    window.localStorage.setItem('equipulse-decided-tasks', JSON.stringify(decided))
    window.dispatchEvent(new Event('storage'))

    setCards((prev) => prev.filter((c) => c.id !== action.id))
    setCommitted((c) => c + 1)
    if (cards.length === 1 && onComplete) {
      setTimeout(onComplete, 600)
    }
  }

  if (total === 0 || cards.length === 0) {
    return (
      <div className="pulse-shell" ref={containerRef}>
        <PulseStyles />
        <HeroHeader
          greeting={t(greeting)}
          name={name}
          total={0}
          committed={0}
          score={score}
          delta={scoreDelta}
          streak={streak}
        />
        <CelebrationState
          score={score}
          delta={scoreDelta}
          onReset={() => {
            setCommitted(0)
            setCards(actions)
          }}
        />
      </div>
    )
  }

  return (
    <div className="pulse-shell" ref={containerRef}>
      <PulseStyles />
      <HeroHeader
        greeting={t(greeting)}
        name={name}
        total={total}
        committed={committed}
        score={score}
        delta={scoreDelta}
        streak={streak}
      />

      <div className="pulse-stage" id="tour-swipe-queue">
        <AnimatePresence>
          {cards.map((action, index) => {
            const isTop = index === cards.length - 1
            const depthBehind = cards.length - 1 - index
            return (
              <SwipeCard
                key={action.id}
                action={action}
                isTop={isTop}
                depthBehind={depthBehind}
                total={total}
                position={committed + index + 1}
                onCommit={(dir) => commit(dir, action)}
                onWhy={() => setXaiFor(action)}
              />
            )
          })}
        </AnimatePresence>
      </div>

      <SwipeActionDock
        total={total}
        committed={committed}
        onAccept={() => {
          if (!cards.length) return
          const top = cards[cards.length - 1]
          if (top) commit('right', top)
        }}
        onSnooze={() => {
          if (!cards.length) return
          const top = cards[cards.length - 1]
          if (top) commit('left', top)
        }}
      />

      {xaiFor ? <XaiPanel action={xaiFor} onClose={() => setXaiFor(null)} /> : null}

      <p className="pulse-hint">
        {t(`Swipe right to accept. Swipe left to snooze for later.`)}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero header
// ─────────────────────────────────────────────────────────────────────────────
function HeroHeader({
  greeting,
  name,
  total,
  committed,
  score,
  delta,
  streak,
}: {
  greeting: string
  name: string
  total: number
  committed: number
  score: number
  delta: number
  streak: number
}) {
  const { t, locale } = useI18n()
  return (
    <header className="pulse-hero">
      <div className="pulse-hero__left">
        <div className="pulse-hero__greeting-row">
          <span className="pulse-hero__greeting">{greeting}{name ? ',' : ''}</span>
          {name ? <span className="pulse-hero__name">{name}</span> : null}
        </div>
        <div className="pulse-hero__meta">
          <span className="pulse-hero__count">
            {total - committed > 0
              ? locale === 'bn'
                ? `${total - committed} ${t('pulseDecisionsForYou')}`
                : `${total - committed} ${t(total - committed === 1 ? 'pulseDecision' : 'pulseDecisions')} ${t('pulseDecisionsForYou')}`.replace(
                    `${t('pulseDecisions')} ${t('pulseDecisionsForYou')}`,
                    `${t('pulseDecisions')} ${t('pulseDecisionsForYou')}`.trim(),
                  )
              : t("No fresh decisions today")}
          </span>
          <StreakBadge streak={streak} />
        </div>
      </div>
      <div className="pulse-hero__right">
        <OfflineRibbon />
        <div className="pulse-hero__score">
          <PulseGauge score={score} delta={delta} />
          <div className="pulse-hero__score-text">
            <span className="pulse-hero__score-label">{t('pulseScoreLabel')}</span>
            <span className="pulse-hero__score-trend">
              {delta > 0
                ? t('pulseScoreRising')
                : delta < 0
                  ? t('pulseScoreFalling')
                  : t('pulseScoreSteady')}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SwipeCard
// ─────────────────────────────────────────────────────────────────────────────
function SwipeCard({
  action,
  isTop,
  depthBehind,
  total,
  position,
  onCommit,
  onWhy,
}: {
  action: MerchantPulseAction
  isTop: boolean
  depthBehind: number
  total: number
  position: number
  onCommit: (dir: Direction) => void
  onWhy: () => void
}) {
  const { t, locale } = useI18n()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-260, 0, 260], [-MAX_TILT, 0, MAX_TILT])
  const acceptOpacity = useTransform(x, [40, 140], [0, 1])
  const snoozeOpacity = useTransform(x, [-140, -40], [1, 0])
  const cardScale = isTop ? 1 : 1 - depthBehind * 0.04
  const cardY = isTop ? 0 : depthBehind * 12

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const ox = info.offset.x
    const oy = info.offset.y
    const vx = info.velocity.x
    const vy = info.velocity.y
    if (oy < -120 && Math.abs(oy) > Math.abs(ox) && vy < -SWIPE_VELOCITY) {
      onCommit('up')
      return
    }
    if (ox > SWIPE_COMMIT || vx > SWIPE_VELOCITY) {
      onCommit('right')
      return
    }
    if (ox < -SWIPE_COMMIT || vx < -SWIPE_VELOCITY) {
      onCommit('left')
      return
    }
    // spring back
    x.set(0)
    y.set(0)
  }

  // Pull a synthetic money figure from the body for the count-up highlight
  const money = useMemo(() => extractMoney(action), [action])
  const confidence = useMemo(() => extractConfidence(action), [action])
  const riskKey = useMemo(() => {
    if (action.tone === 'danger') return 'pulseRiskHigh'
    if (action.tone === 'warning') return 'pulseRiskMedium'
    return 'pulseRiskLow'
  }, [action.tone])

  return (
    <motion.div
      className="pulse-card"
      data-tone={action.tone}
      style={
        {
          x: isTop ? x : 0,
          y: isTop ? y : cardY,
          rotate: isTop ? rotate : 0,
          scale: cardScale,
          zIndex: 30 - depthBehind,
          '--tone': toneAccent[action.tone].token,
          '--tone-soft': toneAccent[action.tone].soft,
          '--tone-ring': toneAccent[action.tone].ring,
        } as unknown as CSSProperties
      }
      drag={isTop ? true : false}
      dragElastic={0.7}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: cardY, scale: cardScale }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 0.8 }}
      exit={{
        x: x.get() > 0 ? 600 : x.get() < 0 ? -600 : 0,
        y: x.get() === 0 ? -700 : 0,
        opacity: 0,
        rotate: x.get() > 0 ? 25 : x.get() < 0 ? -25 : 0,
        transition: { duration: 0.35, ease: [0.2, 0, 0, 1] },
      }}
      whileTap={isTop ? { cursor: 'grabbing', scale: 0.98 } : {}}
      whileHover={isTop ? { scale: 1.02 } : {}}
    >
      <div className="pulse-card__noise" aria-hidden="true" />
      <div className="pulse-card__halo" aria-hidden="true" />

      <header className="pulse-card__top">
        <div className="pulse-card__chip" data-tone={action.tone}>
          <Sparkles size={12} aria-hidden="true" />
          <span>{t('pulseAiVoice')}</span>
        </div>
        <div className="pulse-card__top-right">
          <span className="pulse-card__metric">{action.metric[(locale === 'bn' ? 'bn' : 'en')]}</span>
          {isTop ? (
            <button
              type="button"
              className="pulse-card__why"
              onClick={(e) => {
                e.stopPropagation()
                onWhy()
              }}
            >
              {t('pulseWhy')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="pulse-card__body">
        <h2 className="pulse-card__title">{action.title[(locale === 'bn' ? 'bn' : 'en')]}</h2>
        <p className="pulse-card__lede">{action.body[(locale === 'bn' ? 'bn' : 'en')]}</p>
      </div>

      <div className="pulse-card__stats">
        <div className="pulse-card__stat" data-tone="accent">
          <span className="pulse-card__stat-label">{t('queueRevenueImpact')}</span>
          <span className="pulse-card__stat-value">
            {money !== null ? (
              <Taka value={money} className="pulse-card__stat-amount" />
            ) : (
              '; '
            )}
          </span>
        </div>
        <div className="pulse-card__stat" data-tone="focus">
          <span className="pulse-card__stat-label">{t('queueConfidence')}</span>
          <span className="pulse-card__stat-value">
            {confidence !== null ? (
              <CountUpNumber
                value={confidence}
                format={(n) => `${Math.round(n)}%`}
                className="pulse-card__stat-amount"
              />
            ) : (
              '; '
            )}
          </span>
        </div>
        <div className="pulse-card__stat" data-tone={action.tone === 'danger' ? 'danger' : action.tone === 'warning' ? 'warning' : 'success'}>
          <span className="pulse-card__stat-label">{t('queueRiskLevel')}</span>
          <span className="pulse-card__stat-value">{t(riskKey)}</span>
        </div>
      </div>

      <div className="pulse-card__progress" aria-hidden="true">
        <span className="pulse-card__progress-text">
          {position} {t('pulseCardOfTotal')} {total}
        </span>
        <div className="pulse-card__progress-track">
          <motion.div
            className="pulse-card__progress-fill"
            initial={false}
            animate={{ width: `${(position / total) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
      </div>

      <footer className="pulse-card__cta">
        <button
          type="button"
          className="pulse-card__btn pulse-card__btn--snooze"
          onClick={() => onCommit('left')}
        >
          <X size={16} aria-hidden="true" />
          {t('pulseSnooze')}
        </button>
        <button
          type="button"
          className="pulse-card__btn pulse-card__btn--accept"
          onClick={() => onCommit('right')}
        >
          {t('pulseApply')}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </footer>

      <motion.div
        className="pulse-card__overlay pulse-card__overlay--snooze"
        style={{ opacity: snoozeOpacity }}
        aria-hidden="true"
      >
        <X size={32} />
        <span>{t('pulseSnooze')}</span>
      </motion.div>
      <motion.div
        className="pulse-card__overlay pulse-card__overlay--accept"
        style={{ opacity: acceptOpacity }}
        aria-hidden="true"
      >
        <CheckCircle2 size={32} />
        <span>{t('pulseAccept')}</span>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SwipeActionDock ;  visible buttons mirroring the swipe gesture
// ─────────────────────────────────────────────────────────────────────────────
function SwipeActionDock({
  total,
  committed,
  onAccept,
  onSnooze,
}: {
  total: number
  committed: number
  onAccept: () => void
  onSnooze: () => void
}) {
  const { t, locale } = useI18n()
  const remaining = total - committed
  return (
    <div className="pulse-dock" role="group" aria-label={t('pulseSwipeHint')}>
      <button
        type="button"
        className="pulse-dock__btn pulse-dock__btn--snooze"
        onClick={onSnooze}
        aria-label={t('pulseDismiss')}
      >
        <ChevronLeft size={18} aria-hidden="true" />
        <span>{t('pulseSnooze')}</span>
      </button>
      <div className="pulse-dock__counter" aria-live="polite">
        <span className="pulse-dock__counter-num">
          {locale === 'bn' ? toBangla(remaining) : remaining}
        </span>
        <span className="pulse-dock__counter-label">{t('pulseCardRemaining')}</span>
      </div>
      <button
        type="button"
        className="pulse-dock__btn pulse-dock__btn--accept"
        onClick={onAccept}
        aria-label={t('pulseApply')}
      >
        <span>{t('pulseAccept')}</span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function extractMoney(action: MerchantPulseAction): number | null {
  // Look for ৳NNN or NNN in body / title
  const sources = [action.body.en, action.body.bn, action.title.en, action.title.bn]
  for (const s of sources) {
    const m = s.match(/(?:৳|`৳`|\b৳\s*|BDT\s*)(\d[\d,]*(?:\.\d+)?)/i)
    if (m && m[1]) {
      const n = Number(m[1].replace(/,/g, ''))
      if (!Number.isNaN(n)) return n
    }
    const m2 = s.match(/(?:est\.?\s*\+|estimated?\s*\+|\+)\s*(?:৳\s*)?(\d[\d,]+)/i)
    if (m2 && m2[1]) {
      const n = Number(m2[1].replace(/,/g, ''))
      if (!Number.isNaN(n)) return n
    }
  }
  return null
}

function extractConfidence(action: MerchantPulseAction): number | null {
  // Stable synthetic confidences per tone so it doesn't feel random
  switch (action.tone) {
    case 'danger':
      return 78
    case 'warning':
      return 71
    case 'success':
      return 88
    case 'focus':
      return 82
    case 'accent':
    default:
      return 76
  }
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
function toBangla(n: number): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d)
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located styles ;  same pattern as src/components/ui/DatePicker.tsx
// All tokens are theme-day / theme-night driven via CSS variables.
// ─────────────────────────────────────────────────────────────────────────────
function PulseStyles(): ReactNode {
  return (
    <style>{`
      .pulse-shell{
        position:relative;
        display:flex;
        flex-direction:column;
        gap:1.25rem;
        width:100%;
        max-width:520px;
        margin:0 auto;
        padding:1rem 1rem 1.5rem;
        font-family:Inter, 'Noto Sans Bengali', system-ui, sans-serif;
        color:rgb(var(--color-ink));
      }
      .pulse-shell :where(button){font:inherit;}

      /* HERO */
      .pulse-hero{
        position:relative; overflow:hidden;
        display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;
        padding:1rem 1.1rem;
        border-radius:1.75rem;
        background:rgba(var(--color-surface-strong)/0.6);
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border:1px solid rgba(var(--color-line)/0.4);
        box-shadow:0 8px 40px rgba(0,0,0,0.08);
      }
      .pulse-hero::before {
        content:""; position:absolute; top:-50%; left:-50%; width:200%; height:200%;
        background:radial-gradient(circle at center, rgba(var(--color-accent)/0.08) 0%, transparent 50%);
        pointer-events:none; z-index:-1;
      }
      .pulse-hero__greeting-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem}
      .pulse-hero__greeting{font-size:1.05rem;font-weight:600;color:rgb(var(--color-ink-soft))}
      .pulse-hero__name{font-family:'Outfit','Hind Siliguri',sans-serif;font-size:1.25rem;font-weight:800;letter-spacing:-.01em;color:rgb(var(--color-ink))}
      .pulse-hero__meta{margin-top:.35rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
      .pulse-hero__count{font-size:.78rem;font-weight:600;color:rgb(var(--color-ink-soft))}
      .pulse-hero__right{display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;min-width:0}
      .pulse-hero__score{display:flex;align-items:center;gap:.6rem}
      .pulse-hero__score-text{display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}
      .pulse-hero__score-label{font-size:.7rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgb(var(--color-ink-soft))}
      .pulse-hero__score-trend{font-size:.75rem;font-weight:700;color:var(--color-accent)}
      .pulse-online,.pulse-offline{display:inline-flex;align-items:center;gap:.3rem;font-size:.65rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:.2rem .55rem;border-radius:999px}
      .pulse-online{color:rgb(var(--color-focus));background:rgba(var(--color-focus)/0.10);border:1px solid rgba(var(--color-focus)/0.25)}
      .pulse-offline{color:rgb(var(--color-warning));background:rgba(var(--color-warning)/0.10);border:1px solid rgba(var(--color-warning)/0.30)}

      /* GAUGE */
      .pulse-gauge{position:relative;width:56px;height:56px;display:grid;place-items:center}
      .pulse-gauge__text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
      .pulse-gauge__score{font-family:'Outfit','Hind Siliguri',sans-serif;font-weight:800;font-size:1.1rem;color:rgb(var(--color-ink))}
      .pulse-gauge__delta{font-size:.55rem;font-weight:700;color:rgb(var(--color-ink-soft));margin-top:.1rem}
      .pulse-gauge__delta[data-trend="up"]{color:var(--color-focus)}
      .pulse-gauge__delta[data-trend="down"]{color:var(--color-danger)}

      /* STREAK */
      .pulse-streak{display:inline-flex;align-items:center;gap:.3rem;font-size:.65rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:.2rem .55rem;border-radius:999px;color:rgb(var(--color-warning));background:rgba(var(--color-warning)/0.10);border:1px solid rgba(var(--color-warning)/0.30)}

      /* STAGE ;  the card arena */
      .pulse-stage{
        position:relative;
        width:100%;
        aspect-ratio:3/4;
        max-height:560px;
        min-height:420px;
      }

      /* CARD */
      .pulse-card{
        position:absolute;inset:0;
        display:flex;flex-direction:column;
        border-radius:2rem;
        background:rgba(var(--color-surface-strong)/0.8);
        backdrop-filter:blur(24px) saturate(180%);
        -webkit-backdrop-filter:blur(24px) saturate(180%);
        box-shadow:
          0 12px 40px -12px rgba(15,23,42,0.15),
          0 4px 12px -4px rgba(15,23,42,0.06),
          inset 0 1px 1px rgba(255,255,255,0.8);
        border:1px solid rgba(var(--color-line)/0.4);
        padding:1.25rem 1.15rem 1rem;
        gap:.85rem;
        overflow:hidden;
        touch-action:pan-y;
        user-select:none;
        -webkit-user-select:none;
      }
      .pulse-card::before{
        content:"";
        position:absolute;inset:0;
        background:linear-gradient(160deg, var(--tone-soft) 0%, transparent 55%);
        pointer-events:none;
        border-radius:inherit;
      }
      .pulse-card__noise{
        position:absolute;inset:0;
        background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        opacity:.55;mix-blend-mode:multiply;pointer-events:none;
      }
      .pulse-card__halo{
        position:absolute;
        top:-30%;right:-30%;
        width:80%;height:80%;
        background:radial-gradient(closest-side, var(--tone-soft), transparent 70%);
        filter:blur(20px);
        pointer-events:none;
      }
      .pulse-card[data-tone="danger"]{--tone:var(--color-danger);--tone-soft:rgba(var(--color-danger)/0.16);--tone-ring:rgba(var(--color-danger)/0.40)}
      .pulse-card[data-tone="warning"]{--tone:var(--color-warning);--tone-soft:rgba(var(--color-warning)/0.18);--tone-ring:rgba(var(--color-warning)/0.45)}
      .pulse-card[data-tone="success"]{--tone:var(--color-focus);--tone-soft:rgba(var(--color-focus)/0.16);--tone-ring:rgba(var(--color-focus)/0.40)}
      .pulse-card[data-tone="accent"]{--tone:var(--color-accent);--tone-soft:rgba(var(--color-accent)/0.16);--tone-ring:rgba(var(--color-accent)/0.40)}
      .pulse-card[data-tone="focus"]{--tone:var(--color-focus);--tone-soft:rgba(var(--color-focus)/0.16);--tone-ring:rgba(var(--color-focus)/0.40)}

      .pulse-card__top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;position:relative;z-index:2}
      .pulse-card__chip{
        display:inline-flex;align-items:center;gap:.3rem;
        font-size:.6rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
        padding:.3rem .6rem;border-radius:999px;
        color:var(--tone);
        background:var(--tone-soft);
        border:1px solid var(--tone-ring);
      }
      .pulse-card__top-right{display:flex;align-items:center;gap:.4rem}
      .pulse-card__metric{font-size:.65rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:.25rem .55rem;border-radius:999px;background:rgba(var(--color-muted)/0.9);color:rgb(var(--color-ink-soft));border:1px solid rgba(var(--color-line)/0.6)}
      .pulse-card__why{font-size:.6rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:.3rem .6rem;border-radius:999px;background:transparent;color:var(--tone);border:1px solid var(--tone-ring);cursor:pointer;transition:background .15s ease}
      .pulse-card__why:hover{background:var(--tone-soft)}

      .pulse-card__body{position:relative;z-index:2;display:flex;flex-direction:column;gap:.5rem;flex:1;min-height:0}
      .pulse-card__title{font-family:'Outfit','Hind Siliguri',sans-serif;font-size:1.35rem;font-weight:800;letter-spacing:-.01em;color:rgb(var(--color-ink));line-height:1.2}
      .pulse-card__lede{font-size:.85rem;line-height:1.55;color:rgb(var(--color-ink-soft))}

      .pulse-card__stats{
        position:relative;z-index:2;
        display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
        gap:.5rem;padding:.6rem;border-radius:1rem;
        background:rgba(var(--color-muted)/0.55);
        border:1px solid rgba(var(--color-line)/0.5);
      }
      .pulse-card__stat{display:flex;flex-direction:column;gap:.15rem;min-width:0}
      .pulse-card__stat-label{font-size:.55rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgb(var(--color-ink-soft))}
      .pulse-card__stat-value{font-size:.95rem;font-weight:800;color:rgb(var(--color-ink));font-variant-numeric:tabular-nums}
      .pulse-card__stat-amount{font-family:'Outfit','Hind Siliguri',sans-serif;display:inline-flex;align-items:baseline;gap:.15rem}
      .pulse-card__stat[data-tone="accent"] .pulse-card__stat-value{color:var(--color-accent)}
      .pulse-card__stat[data-tone="focus"] .pulse-card__stat-value{color:var(--color-focus)}
      .pulse-card__stat[data-tone="success"] .pulse-card__stat-value{color:var(--color-focus)}
      .pulse-card__stat[data-tone="warning"] .pulse-card__stat-value{color:var(--color-warning)}
      .pulse-card__stat[data-tone="danger"] .pulse-card__stat-value{color:var(--color-danger)}

      .pulse-card__progress{position:relative;z-index:2;display:flex;align-items:center;gap:.5rem}
      .pulse-card__progress-text{font-size:.6rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgb(var(--color-ink-soft))}
      .pulse-card__progress-track{flex:1;height:4px;border-radius:999px;background:rgba(var(--color-line)/0.5);overflow:hidden}
      .pulse-card__progress-fill{display:block;height:100%;background:linear-gradient(90deg,var(--color-accent),var(--color-focus));border-radius:inherit}

      .pulse-card__cta{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
      .pulse-card__btn{
        display:inline-flex;align-items:center;justify-content:center;gap:.35rem;
        padding:.7rem 1rem;border-radius:.9rem;
        font-size:.8rem;font-weight:800;letter-spacing:.01em;
        cursor:pointer;border:1px solid transparent;
        transition:transform .12s ease, background .15s ease, color .15s ease, box-shadow .15s ease;
      }
      .pulse-card__btn:active{transform:scale(.97)}
      .pulse-card__btn--snooze{background:rgba(var(--color-danger)/0.08);color:var(--color-danger);border-color:rgba(var(--color-danger)/0.25)}
      .pulse-card__btn--snooze:hover{background:rgba(var(--color-danger)/0.14)}
      .pulse-card__btn--accept{background:linear-gradient(135deg,var(--color-accent),var(--color-focus));color:var(--color-accent-ink);box-shadow:0 8px 20px -8px rgba(var(--color-accent)/0.55)}
      .pulse-card__btn--accept:hover{filter:brightness(1.05)}

      .pulse-card__overlay{
        position:absolute;inset:1rem;border-radius:1.5rem;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;
        font-size:1.2rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;
        pointer-events:none;z-index:5;
      }
      .pulse-card__overlay--snooze{background:rgba(var(--color-danger)/0.18);color:var(--color-danger);border:2px solid var(--color-danger)}
      .pulse-card__overlay--accept{background:rgba(var(--color-focus)/0.20);color:var(--color-focus);border:2px solid var(--color-focus)}

      /* Taka glyph with hand-drawn feel */
      .pulse-taka{
        display:inline-block;
        font-family:'Outfit','Hind Siliguri',sans-serif;
        font-weight:700;
        margin-right:.12em;
        transform:rotate(-2deg);
        color:var(--color-accent);
      }

      /* DOCK */
      .pulse-dock{
        display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.5rem;
        padding:.5rem;border-radius:1.25rem;
        background:rgba(var(--color-surface-strong)/0.6);
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border:1px solid rgba(var(--color-line)/0.4);
        box-shadow:0 8px 30px rgba(0,0,0,0.06);
      }
      .pulse-dock__btn{
        display:inline-flex;align-items:center;gap:.3rem;
        padding:.6rem .9rem;border-radius:.85rem;
        font-size:.78rem;font-weight:800;letter-spacing:.01em;
        cursor:pointer;border:1px solid transparent;
        transition:transform .12s ease, background .15s ease, color .15s ease;
      }
      .pulse-dock__btn:active{transform:scale(.97)}
      .pulse-dock__btn--snooze{background:rgba(var(--color-danger)/0.08);color:var(--color-danger);border-color:rgba(var(--color-danger)/0.25)}
      .pulse-dock__btn--accept{background:linear-gradient(135deg,var(--color-accent),var(--color-focus));color:var(--color-accent-ink)}
      .pulse-dock__counter{display:flex;flex-direction:column;align-items:center;line-height:1.05}
      .pulse-dock__counter-num{font-family:'Outfit','Hind Siliguri',sans-serif;font-size:1.05rem;font-weight:800;color:rgb(var(--color-ink))}
      .pulse-dock__counter-label{font-size:.6rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgb(var(--color-ink-soft))}

      /* PROGRESS */
      .pulse-progress{position:relative;height:6px;border-radius:999px;background:rgba(var(--color-line)/0.4);overflow:hidden}
      .pulse-progress__bar{position:absolute;top:0;left:50%;width:50%;height:100%;background:linear-gradient(90deg,var(--color-accent),var(--color-focus));transform-origin:left center;border-radius:inherit}
      .pulse-progress__bloom{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
      .pulse-progress__bloom--left{background:linear-gradient(90deg, rgba(var(--color-danger)/0.35), transparent)}
      .pulse-progress__bloom--right{background:linear-gradient(90deg, transparent, rgba(var(--color-focus)/0.35))}

      .pulse-hint{text-align:center;font-size:.72rem;color:rgb(var(--color-ink-soft));margin-top:.25rem}

      /* XAI modal */
      .pulse-xai__scrim{position:fixed;inset:0;background:rgba(15,23,42,0.45);backdrop-filter:blur(4px);display:grid;place-items:center;z-index:80;padding:1rem}
      .pulse-xai{width:min(420px,100%);background:rgb(var(--color-surface-strong));border:1px solid rgba(var(--color-line)/0.7);border-radius:1.25rem;box-shadow:0 24px 60px -8px rgba(15,23,42,0.30);padding:1rem 1rem .5rem}
      .pulse-xai__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem}
      .pulse-xai__title{display:inline-flex;align-items:center;gap:.35rem;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--color-accent)}
      .pulse-xai__close{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;background:transparent;border:1px solid rgba(var(--color-line)/0.6);color:rgb(var(--color-ink-soft));cursor:pointer}
      .pulse-xai__steps{display:flex;flex-direction:column;gap:.65rem;padding:.5rem 0}
      .pulse-xai__steps li{display:flex;gap:.6rem;align-items:flex-start}
      .pulse-xai__dot{margin-top:.35rem;width:10px;height:10px;border-radius:999px;flex-shrink:0;box-shadow:0 0 10px currentColor}
      .pulse-xai__dot[data-tone="focus"]{background:var(--color-focus);color:var(--color-focus)}
      .pulse-xai__dot[data-tone="warning"]{background:var(--color-warning);color:var(--color-warning)}
      .pulse-xai__dot[data-tone="success"]{background:var(--color-focus);color:var(--color-focus)}
      .pulse-xai__step-title{font-size:.85rem;font-weight:700;color:rgb(var(--color-ink))}
      .pulse-xai__step-body{font-size:.75rem;color:rgb(var(--color-ink-soft));margin-top:.1rem}

      /* CELEBRATION */
      .pulse-celebrate{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:2.5rem 1.5rem 2rem;border-radius:2rem;background:rgba(var(--color-surface-strong)/0.6);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(var(--color-line)/0.4);box-shadow:0 8px 40px rgba(0,0,0,0.08);overflow:hidden}
      .pulse-celebrate__halo{position:absolute;inset:-50%;background:radial-gradient(circle at center, rgba(var(--color-focus)/0.15) 0%, transparent 60%);filter:blur(40px);pointer-events:none;z-index:-1}
      .pulse-celebrate__ring{position:relative;display:grid;place-items:center;width:84px;height:84px;border-radius:999px;background:rgba(var(--color-surface)/0.8);backdrop-filter:blur(10px);border:1px solid rgba(var(--color-focus)/0.30);box-shadow:0 4px 20px rgba(var(--color-focus)/0.2)}
      .pulse-celebrate__icon{color:var(--color-focus)}
      .pulse-celebrate__title{position:relative;margin-top:.85rem;font-family:'Outfit','Hind Siliguri',sans-serif;font-size:1.5rem;font-weight:800;color:rgb(var(--color-ink))}
      .pulse-celebrate__body{position:relative;max-width:32ch;margin-top:.5rem;font-size:.85rem;line-height:1.55;color:rgb(var(--color-ink-soft))}
      .pulse-celebrate__meta{position:relative;display:flex;align-items:center;gap:.5rem;margin-top:1rem}
      .pulse-celebrate__score-label{font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgb(var(--color-ink-soft))}
      .pulse-celebrate__cta{position:relative;margin-top:1rem;padding:.6rem 1.1rem;border-radius:.85rem;font-size:.8rem;font-weight:800;background:linear-gradient(135deg,var(--color-accent),var(--color-focus));color:var(--color-accent-ink);border:0;cursor:pointer;box-shadow:0 8px 20px -8px rgba(var(--color-accent)/0.55)}

      @media (max-width:480px){
        .pulse-shell{padding:.75rem .75rem 1.25rem}
        .pulse-card{padding:1.1rem 1rem .9rem}
        .pulse-card__title{font-size:1.2rem}
      }

      @media (prefers-reduced-motion: reduce){
        .pulse-card, .pulse-celebrate{transition:none !important}
      }
    `}</style>
  )
}


