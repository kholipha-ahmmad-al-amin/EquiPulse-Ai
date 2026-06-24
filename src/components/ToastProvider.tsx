/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, X, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  title: string
  message?: string
  type: ToastType
}

interface ToastContextValue {
  toast: (title: string, message?: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, message, type }])
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="flex w-full max-w-sm items-start gap-3 rounded-2xl bg-surface/90 p-4 shadow-2xl border border-line/50 backdrop-blur-md"
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 className="text-success" size={20} />}
                {t.type === 'error' && <AlertCircle className="text-danger" size={20} />}
                {t.type === 'info' && <CheckCircle2 className="text-accent" size={20} />}
                {t.type === 'warning' && <AlertTriangle className="text-warning" size={20} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.message && <p className="mt-1 text-xs text-ink-soft">{t.message}</p>}
              </div>
              <button 
                onClick={() => setToasts((prev) => prev.filter(x => x.id !== t.id))}
                className="shrink-0 text-ink-soft hover:text-ink transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context.toast
}
