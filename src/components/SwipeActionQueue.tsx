import { useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { CheckCircle2, XCircle, Zap, ShieldAlert, TrendingUp } from 'lucide-react'
import { type MerchantPulseAction } from '../hooks/useMerchantPulse'
import { useI18n } from '../i18n'

type SwipeActionQueueProps = {
  actions: MerchantPulseAction[]
  onComplete?: () => void
}

export function SwipeActionQueue({ actions: initialActions, onComplete }: SwipeActionQueueProps) {
  const { t } = useI18n()
  const [cards, setCards] = useState(initialActions)

  // Only the top card can be dragged
  const activeCardIndex = cards.length - 1

  const handleSwipe = (_direction: 'left' | 'right', action: MerchantPulseAction) => {
    if (_direction === 'right') {
      window.dispatchEvent(new CustomEvent('equipulse-tour-action', { detail: { action: 'swipe-accept' } }))
    }
    
    // Remove the top card
    setCards((prev) => prev.filter((c) => c.id !== action.id))

    if (cards.length === 1 && onComplete) {
      setTimeout(onComplete, 500)
    }
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="size-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-success" />
        </div>
        <h3 className="font-heading text-2xl font-black text-ink mb-2">
          {t(`All Caught Up!`)}
        </h3>
        <p className="text-ink-soft max-w-sm mx-auto">
          {t(`You have no pending AI recommendations or actions. Enjoy peace of mind.`)}
        </p>
      </div>
    )
  }

  return (
    <div id="tour-swipe-queue" className="relative flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto overflow-hidden px-4">
      
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <div className="flex flex-col items-center opacity-50">
          <XCircle className="text-danger mb-1" size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-danger">
            {t(`Snooze`)}
          </span>
        </div>
        <div className="text-xs font-black uppercase tracking-widest text-ink-soft bg-surface-strong/50 px-4 py-2 rounded-full border border-line/50">
          {cards.length} {t(`Cards Left`)}
        </div>
        <div className="flex flex-col items-center opacity-50">
          <CheckCircle2 className="text-success mb-1" size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-success">
            {t(`Accept`)}
          </span>
        </div>
      </div>

      <div className="relative w-full aspect-[3/4] max-h-[500px]">
        <AnimatePresence>
          {cards.map((action, index) => {
            const isTop = index === activeCardIndex
            return (
              <SwipeCard
                key={action.id}
                action={action}
                isTop={isTop}
                index={cards.length - 1 - index}
                onSwipe={(dir) => handleSwipe(dir, action)}
              />
            )
          })}
        </AnimatePresence>
      </div>

      <p className="mt-8 text-xs text-ink-soft font-medium text-center">
        {t(`Swipe right to apply, swipe left to dismiss.`)}
      </p>
    </div>
  )
}

type SwipeCardProps = {
  action: MerchantPulseAction
  isTop: boolean
  index: number
  onSwipe: (direction: 'left' | 'right') => void
}

function SwipeCard({ action, isTop, index, onSwipe }: SwipeCardProps) {
  const { t, locale } = useI18n()
  const [showXAI, setShowXAI] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])
  const scale = isTop ? 1 : 1 - index * 0.05
  const yOffset = isTop ? 0 : index * 15

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x > threshold) {
      onSwipe('right')
    } else if (info.offset.x < -threshold) {
      onSwipe('left')
    } else {
      x.set(0)
    }
  }

  const getIcon = () => {
    if (action.tone === 'danger') return <ShieldAlert size={24} className="text-danger" />
    if (action.tone === 'success') return <TrendingUp size={24} className="text-success" />
    return <Zap size={24} className="text-accent" />
  }

  const getColorClasses = () => {
    switch (action.tone) {
      case 'danger': return 'from-danger/20 to-danger/5 border-danger/30'
      case 'warning': return 'from-warning/20 to-warning/5 border-warning/30'
      case 'success': return 'from-success/20 to-success/5 border-success/30'
      default: return 'from-accent/20 to-accent/5 border-accent/30'
    }
  }

  return (
    <motion.div
      className={`absolute inset-0 w-full h-full rounded-[2rem] bg-gradient-to-br bg-surface/90 backdrop-blur-3xl shadow-panel border ${getColorClasses()} p-6 flex flex-col justify-between origin-bottom overflow-hidden`}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity,
        scale,
        y: yOffset,
        zIndex: 10 - index,
      }}
      drag={isTop && !showXAI ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      whileTap={isTop && !showXAI ? { cursor: 'grabbing' } : {}}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="size-12 rounded-2xl bg-surface-strong/80 backdrop-blur-xl flex items-center justify-center shadow-sm">
          {getIcon()}
        </div>
        <div className="flex items-center gap-2">
          {isTop && (
            <button
              onClick={() => setShowXAI(true)}
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
            >
              {t(`Why?`)}
            </button>
          )}
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface-strong`}>
            {action.metric[(locale === 'bn' ? 'bn' : 'en')]}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center relative">
        <AnimatePresence mode="wait">
          {!showXAI ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="font-heading text-2xl font-black text-ink mb-3 leading-tight">
                {action.title[(locale === 'bn' ? 'bn' : 'en')]}
              </h2>
              <p className="text-ink-soft leading-relaxed text-sm">
                {action.body[(locale === 'bn' ? 'bn' : 'en')]}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="xai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-surface/95 backdrop-blur-xl z-20 rounded-xl border border-line p-4 flex flex-col shadow-glass"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
                  <Zap size={14} />
                  {t(`AI Reasoning Tree`)}
                </h3>
                <button onClick={() => setShowXAI(false)} className="p-1 text-ink-soft hover:text-ink">
                  <XCircle size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-line">
                <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-2.5 before:w-px before:bg-line/50">
                  <li className="relative pl-6">
                    <div className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-focus shadow-[0_0_8px_rgba(var(--color-focus),0.5)]"></div>
                    <p className="text-xs font-semibold text-ink">Analyzing local demand trends</p>
                    <p className="text-[10px] text-ink-soft mt-0.5">Found 34% spike in category over 48h</p>
                  </li>
                  <li className="relative pl-6">
                    <div className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-warning shadow-[0_0_8px_rgba(var(--color-warning),0.5)]"></div>
                    <p className="text-xs font-semibold text-ink">Checking inventory constraints</p>
                    <p className="text-[10px] text-ink-soft mt-0.5">Current stock covers only 1.2 days</p>
                  </li>
                  <li className="relative pl-6">
                    <div className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(var(--color-success),0.5)]"></div>
                    <p className="text-xs font-bold text-accent">Recommendation Generated</p>
                    <p className="text-[10px] text-ink-soft mt-0.5">{action.title['en']}</p>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 pt-6 border-t border-line/30 flex items-center justify-between pointer-events-none relative z-10">
        <motion.span className="text-xs font-bold text-danger transition-opacity" style={{ opacity: useTransform(x, [-100, -50], [1, 0]) }}>
          {t(`DISMISS`)}
        </motion.span>
        <motion.span className="text-xs font-bold text-success transition-opacity" style={{ opacity: useTransform(x, [50, 100], [0, 1]) }}>
          {t(`ACCEPT`)}
        </motion.span>
      </div>
      
    </motion.div>
  )
}
