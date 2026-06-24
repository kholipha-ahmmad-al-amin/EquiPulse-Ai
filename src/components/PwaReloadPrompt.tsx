import { useRegisterSW } from 'virtual:pwa-register/react'
import { motion, AnimatePresence } from 'framer-motion'
import { DownloadCloud, X } from 'lucide-react'
import { useI18n } from '../i18n'

export function PwaReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Automatically check for updates every hour
      if (r) {
        setInterval(() => {
          console.log('Checking for sw update')
          r.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error: Error | unknown) {
      console.error('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  const { t } = useI18n()

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-4 inset-x-4 md:inset-x-auto md:right-6 md:top-6 z-[99999] md:w-[340px] flex flex-col gap-3 p-4 rounded-[1.25rem] border border-line/50 bg-surface/95 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/15 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="flex-shrink-0 size-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-accent),0.2)]">
              <DownloadCloud size={20} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="font-heading text-sm font-black text-ink mb-1 leading-tight">
                {needRefresh ? t(`Update Available`) : t(`Ready Offline`)}
              </h3>
              <p className="text-xs text-ink-soft leading-snug font-medium">
                {needRefresh 
                  ? t(`A new version is ready to install.`)
                  : t(`App cached for offline use.`)}
              </p>
            </div>
            <button
              onClick={close}
              className="flex-shrink-0 text-ink-soft hover:text-ink hover:bg-surface-strong p-1.5 rounded-lg transition-colors -mr-1 -mt-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1 relative z-10">
            {needRefresh && (
              <button
                onClick={() => {
                  updateServiceWorker(true)
                  setTimeout(() => window.location.reload(), 800)
                }}
                className="flex-1 rounded-xl bg-accent hover:bg-accent/90 text-surface py-2.5 text-xs font-black shadow-[0_4px_15px_-3px_rgba(var(--color-accent),0.4)] hover:shadow-[0_6px_20px_-3px_rgba(var(--color-accent),0.5)] transition-all active:scale-95"
              >
                {t(`Update Now`)}
              </button>
            )}
            <button
              onClick={close}
              className="flex-1 rounded-xl bg-surface-strong/60 hover:bg-surface-strong text-ink border border-line/40 py-2.5 text-xs font-black transition-all active:scale-95"
            >
              {t(`Dismiss`)}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
