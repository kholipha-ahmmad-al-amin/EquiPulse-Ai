import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { 
  HelpCircle, LayoutGrid, ShoppingBag, TrendingUp, PartyPopper, Sparkles
} from 'lucide-react'
import { useI18n } from '../i18n'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const ONBOARDING_KEY = 'equipulse-interactive-action-tour-completed-v5'

type TourStep = {
  route: string
  action: string | null
  titleKey: string
  descKey: string
  actionPromptKey: string
  icon: typeof LayoutGrid
}

const tourSteps: TourStep[] = [
  {
    route: '/pos',
    action: 'locale-changed',
    icon: Sparkles,
    titleKey: 'guide.welcome.title',
    descKey: 'guide.welcome.desc',
    actionPromptKey: 'guide.welcome.prompt',
  },
  {
    route: '/pos',
    action: 'pos-completed',
    icon: ShoppingBag,
    titleKey: 'guide.pos.title',
    descKey: 'guide.pos.desc',
    actionPromptKey: 'guide.pos.prompt',
  },
  {
    route: '/data',
    action: 'ocr-completed',
    icon: LayoutGrid,
    titleKey: 'guide.ocr.title',
    descKey: 'guide.ocr.desc',
    actionPromptKey: 'guide.ocr.prompt',
  },
  {
    route: '/queue',
    action: 'swipe-accept',
    icon: TrendingUp,
    titleKey: 'guide.advice.title',
    descKey: 'guide.advice.desc',
    actionPromptKey: 'guide.advice.prompt',
  },
  {
    route: '/metrics',
    action: 'metric-clicked',
    icon: TrendingUp,
    titleKey: 'guide.metrics.title',
    descKey: 'guide.metrics.desc',
    actionPromptKey: 'guide.metrics.prompt',
  },
  {
    route: '/controls',
    action: null,
    icon: PartyPopper,
    titleKey: 'guide.done.title',
    descKey: 'guide.done.desc',
    actionPromptKey: 'guide.done.prompt',
  },
]

export function OnboardingGuide() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isActive, setIsActive] = useState(false)
  const [isCompleted, setIsCompleted] = useState(() => !!window.localStorage.getItem(ONBOARDING_KEY))
  const [currentStep, setCurrentStep] = useState(0)
  
  const initialLocaleRef = useRef(locale)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const driverObjRef = useRef<any>(null)

  const handleDismiss = useCallback(() => {
    window.localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsCompleted(true)
    setIsActive(false)
    if (driverObjRef.current) {
      driverObjRef.current.destroy()
    }
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleDismiss()
      void confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#16a34a', '#facc15', '#0f172a', '#38bdf8'],
      })
    }
  }, [currentStep, handleDismiss])

  const startTour = useCallback(() => {
    setCurrentStep(0)
    initialLocaleRef.current = locale
    setIsActive(true)
  }, [locale])

  const hasStartedRef = useRef(false)

  // Auto-start
  useEffect(() => {
    if (!isCompleted && !hasStartedRef.current) {
      const timer = setTimeout(() => {
        setIsActive(true)
        setCurrentStep(0)
        initialLocaleRef.current = locale
        hasStartedRef.current = true
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [locale, isCompleted])

  // Navigate when step changes
  useEffect(() => {
    if (!isActive) return
    const step = tourSteps[currentStep]
    if (step && location.pathname !== step.route) {
      navigate(step.route)
    }
  }, [currentStep, isActive, navigate, location.pathname])

  // Listen for actions
  useEffect(() => {
    if (!isActive) return
    const handleTourAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ action: string }>
      const requiredAction = tourSteps[currentStep]?.action
      if (customEvent.detail && customEvent.detail.action === requiredAction) {
        handleNext()
      }
    }
    window.addEventListener('equipulse-tour-action', handleTourAction)
    return () => window.removeEventListener('equipulse-tour-action', handleTourAction)
  }, [currentStep, isActive, handleNext])

  // Listen for global guide open
  useEffect(() => {
    const handleOpenGuide = () => startTour()
    window.addEventListener('equipulse-open-guide', handleOpenGuide)
    return () => window.removeEventListener('equipulse-open-guide', handleOpenGuide)
  }, [startTour])

  // Driver.js engine
  useEffect(() => {
    if (!isActive) return

    // Destroy previous instance
    if (driverObjRef.current) {
      driverObjRef.current.destroy()
    }

    const step = tourSteps[currentStep]
    if (!step) return

    const getSelectorForStep = (stepIdx: number): string | null => {
      if (stepIdx === 0) return window.innerWidth < 1280 ? (locale === 'en' ? '#tour-lang-bn-mobile' : '#tour-lang-en-mobile') : (locale === 'en' ? '#tour-lang-bn-desktop' : '#tour-lang-en-desktop')
      if (stepIdx === 1) return '#tour-pos-checkout'
      if (stepIdx === 2) return '#tour-ocr-upload'
      if (stepIdx === 3) return '#tour-swipe-queue'
      if (stepIdx === 4) return '#tour-metrics-chart'
      if (stepIdx === 5) return null // Final step has no specific element
      return null
    }

    const titleHtml = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-flex; justify-content: center; align-items: center; width: 28px; height: 28px; background: var(--color-accent); color: white; border-radius: 8px;">
          ${currentStep + 1}
        </span>
        <span style="font-size: 1.1rem; font-weight: 900; color: var(--color-ink);">${t(step.titleKey)}</span>
      </div>
    `
    
    let descHtml = `
      <div style="margin-top: 12px; font-size: 0.95rem; line-height: 1.5; color: var(--color-ink-soft);">
        ${t(step.descKey)}
      </div>
    `

    if (step.action !== null) {
      descHtml += `
        <div style="margin-top: 16px; padding: 8px 12px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; color: var(--color-accent); font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">
          ✨ ${t(step.actionPromptKey)}
        </div>
      `
    }

    const driverObj = driver({
      showProgress: false,
      allowClose: true,
      overlayColor: 'rgba(15, 23, 42, 0.85)',
      stagePadding: 8,
      popoverClass: 'equipulse-driver-popover',
      onDestroyStarted: () => {
        if (!driverObj.hasNextStep() || isCompleted) {
          handleDismiss()
        } else {
          // If user closes manually before finishing
          handleDismiss()
        }
      },
      nextBtnText: step.action === null ? t('Done') : t('Skip'),
      prevBtnText: currentStep > 0 ? t('Back') : '',
      showButtons: ['next', 'previous', 'close'],
      onNextClick: () => {
        // If it requires an action, 'Next' button acts as a Skip
        handleNext()
      },
      onPrevClick: () => {
        if (currentStep > 0) {
          setCurrentStep(p => p - 1)
        }
      }
    })

    driverObjRef.current = driverObj

    // Wait a bit for the UI to render the target after route change
    const timeout = setTimeout(() => {
      const selector = getSelectorForStep(currentStep)
      
      if (selector && document.querySelector(selector)) {
        driverObj.highlight({
          element: selector,
          popover: {
            title: titleHtml,
            description: descHtml,
            side: 'bottom',
            align: 'center'
          }
        })
      } else {
        // If no element, just show a centered popover (or wait for element)
        if (step.action === null) {
          driverObj.highlight({
            popover: {
              title: titleHtml,
              description: descHtml,
              side: 'bottom',
              align: 'center'
            }
          })
        }
      }
    }, 500)

    return () => clearTimeout(timeout)

  }, [currentStep, isActive, locale, handleNext, handleDismiss, isCompleted, t])

  return (
    <>
      {!isActive && !isCompleted && (
        <motion.button
          onClick={startTour}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2.5 rounded-full bg-accent px-5 py-3.5 text-xs font-black text-surface shadow-glow transition-all hover:scale-105 active:scale-95 animate-pulse"
        >
          <HelpCircle size={18} />
          <span>{t(`Shop Guide`)}</span>
        </motion.button>
      )}

      {/* Global styles for the driver.js popover to match EquiPulse brand */}
      <style>{`
        .equipulse-driver-popover {
          border-radius: 1.5rem !important;
          border: 1px solid var(--color-line) !important;
          background: var(--color-surface) !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
          padding: 24px !important;
          max-width: 400px !important;
          font-family: inherit !important;
        }
        .driver-popover-title {
          font-family: inherit !important;
          margin-bottom: 0 !important;
        }
        .driver-popover-description {
          font-family: inherit !important;
          color: var(--color-ink-soft) !important;
        }
        .driver-popover-footer {
          margin-top: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        .driver-popover-footer button {
          border-radius: 0.75rem !important;
          padding: 8px 16px !important;
          font-weight: 800 !important;
          font-size: 0.85rem !important;
          text-shadow: none !important;
          transition: all 0.2s !important;
        }
        .driver-popover-next-btn {
          background: var(--color-accent) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 4px 14px 0 rgba(56, 189, 248, 0.39) !important;
        }
        .driver-popover-next-btn:hover {
          transform: translateY(-2px) !important;
        }
        .driver-popover-prev-btn {
          background: transparent !important;
          color: var(--color-ink-soft) !important;
          border: 1px solid var(--color-line) !important;
        }
        .driver-popover-prev-btn:hover {
          background: var(--color-muted) !important;
          color: var(--color-ink) !important;
        }
        .driver-popover-close-btn {
          display: none !important; /* We handle close in footer or let driver.js add X if needed */
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  )
}
