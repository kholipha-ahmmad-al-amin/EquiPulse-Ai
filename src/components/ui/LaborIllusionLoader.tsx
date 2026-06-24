import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Cpu, Database, Network } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useState, useEffect } from 'react'

export function LaborIllusionLoader({ message }: { message?: string }) {
  const { t } = useI18n()
  const [currentStep, setCurrentStep] = useState(0)

  const icons = [Brain, Database, Network, Cpu]
  const steps = [
    t("Initializing AI models..."),
    t("Querying local vector database..."),
    t("Analyzing semantic patterns..."),
    t("Synthesizing actionable insights..."),
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [steps.length])

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-sm mx-auto gap-6 animate-fade-in">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Pulsing background rings */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-accent rounded-full blur-xl"
        />
        
        {/* Orbital nodes */}
        {icons.map((Icon, idx) => {
          const angle = (idx * 360) / icons.length;
          return (
            <motion.div
              key={idx}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 origin-center"
            >
              <div 
                className="absolute top-0 left-1/2 -ml-3 -mt-3 w-6 h-6 rounded-full bg-surface shadow-[0_0_15px_rgba(var(--color-accent),0.5)] border border-accent/40 flex items-center justify-center"
                style={{ transform: `rotate(${angle}deg) translateY(-40px) rotate(-${angle}deg)` }}
              >
                <Icon size={12} className="text-accent" />
              </div>
            </motion.div>
          )
        })}

        {/* Center core */}
        <div className="relative z-10 w-16 h-16 bg-surface-strong rounded-full border-2 border-accent shadow-glow flex items-center justify-center">
          <Brain size={28} className="text-accent animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-2 w-full">
        <h3 className="font-heading font-extrabold text-ink text-lg tracking-tight">
          {message || t("AI Processing...")}
        </h3>
        
        <div className="h-4 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-bold text-accent absolute inset-0 text-center"
            >
              {steps[currentStep]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden mt-4">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: steps.length * 2, ease: "linear" }}
            className="h-full bg-accent shadow-[0_0_10px_rgba(var(--color-accent),0.8)]"
          />
        </div>
      </div>
    </div>
  )
}
