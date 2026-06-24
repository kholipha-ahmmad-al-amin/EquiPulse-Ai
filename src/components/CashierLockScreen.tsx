import { useState, useEffect } from 'react'
import { Lock, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthSession } from '../hooks/useAuthSession'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useI18n } from '../i18n'
import { useToast } from './ToastProvider'
import { hashStaffPin } from '../utils/pinSecurity'

export function CashierLockScreen({ onUnlock }: { onUnlock: (cashierId?: string, cashierName?: string, cashierRole?: string) => void }) {
  const { tenantId, signOut } = useAuthSession()
  const { t } = useI18n()
  const toast = useToast()
  
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || pin.length !== 4) return
    if (!tenantId) return

    if (Date.now() < lockedUntil) {
      toast(
        t(`Please wait`),
        t(`Too many incorrect PIN attempts.`),
        'error',
      )
      return
    }

    setLoading(true)
    setError(false)

    try {
      const staffRef = collection(db, 'users', tenantId, 'staff')
      const pinHash = await hashStaffPin(tenantId, pin)
      const hashedSnapshot = await getDocs(query(staffRef, where('pinHash', '==', pinHash)))
      const snapshot = hashedSnapshot.empty
        ? await getDocs(query(staffRef, where('pin', '==', pin)))
        : hashedSnapshot
      
      if (!snapshot.empty && snapshot.docs[0]) {
        const staffDoc = snapshot.docs[0]
        const data = staffDoc.data()
        setAttemptCount(0)
        toast(t(`Welcome`), `${data.name} (${data.role})`, 'success')
        onUnlock(staffDoc.id, data.name, data.role)
      } else {
        const nextAttemptCount = attemptCount + 1
        setAttemptCount(nextAttemptCount)
        if (nextAttemptCount >= 5) {
          setLockedUntil(Date.now() + 30000)
          setAttemptCount(0)
        }
        setError(true)
        setPin('')
        toast(t(`Invalid PIN`), t(`Please enter a valid 4-digit PIN`), 'error')
      }
    } catch (err) {
      console.error(err)
      setError(true)
      setPin('')
      toast('Error', 'Connection failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleNumPad = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num)
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      // We need to call the async function inside
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
      void handlePinSubmit(syntheticEvent)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-strong/90 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-surface border border-line rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
        
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="text-primary" size={32} />
        </div>
        
        <h2 className="font-heading font-black text-2xl text-ink mb-2">
          {t(`System Locked`)}
        </h2>
        <p className="text-sm text-ink-soft mb-8">
          {t(`Enter your 4-digit PIN to continue`)}
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                pin.length > i 
                  ? 'bg-primary scale-110' 
                  : error 
                    ? 'bg-danger/30' 
                    : 'bg-line'
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 mb-8 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumPad(num.toString())}
              disabled={loading}
              className="h-14 rounded-2xl bg-surface-strong text-xl font-bold text-ink hover:bg-line/50 hover:text-primary transition-colors active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => void signOut()}
            className="h-14 rounded-2xl bg-danger/10 text-danger hover:bg-danger/20 transition-colors flex items-center justify-center active:scale-95"
            title="Log Out"
          >
            <LogOut size={20} />
          </button>
          <button
            onClick={() => handleNumPad('0')}
            disabled={loading}
            className="h-14 rounded-2xl bg-surface-strong text-xl font-bold text-ink hover:bg-line/50 hover:text-primary transition-colors active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || pin.length === 0}
            className="h-14 rounded-2xl bg-surface-strong text-xl font-bold text-ink hover:bg-line/50 hover:text-danger transition-colors flex items-center justify-center active:scale-95 disabled:opacity-50"
          >
            ⌫
          </button>
        </div>

      </motion.div>
    </div>
  )
}
