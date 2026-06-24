import { useState, useEffect } from 'react'
import { Utensils, CheckCircle2, Clock, ChefHat } from 'lucide-react'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from '../hooks/useAuthSession'
import { useI18n } from '../i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { useHaptic } from '../hooks/useHaptic'
import { useToast } from './ToastProvider'

export type KitchenOrder = {
  id: string
  orderNumber: string
  items: { name: string; qty: number; note?: string }[]
  status: 'pending' | 'cooking' | 'ready'
  timestamp: string
}

export function KitchenView() {
  const { tenantId } = useAuthSession()
  const { t } = useI18n()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const { triggerHaptic } = useHaptic()
  const toast = useToast()

  useEffect(() => {
    if (!tenantId) return
    const q = query(
      collection(db, 'users', tenantId, 'kitchen_orders'),
      where('status', 'in', ['pending', 'cooking']),
      orderBy('timestamp', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as KitchenOrder))
      setOrders(data)
    })
    return () => unsub()
  }, [tenantId])

  const updateStatus = async (orderId: string, newStatus: 'cooking' | 'ready') => {
    if (!tenantId) return
    try {
      triggerHaptic(50)
      await updateDoc(doc(db, 'users', tenantId, 'kitchen_orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      })
      if (newStatus === 'ready') {
        toast('Order Ready', `Order ${orderId.slice(-4)} is ready!`, 'success')
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="glass bg-surface-strong/60 backdrop-blur-3xl rounded-3xl p-6 xl:p-8 shadow-sm border border-line/40 min-h-[600px]">
        <header className="flex items-center gap-3 mb-6 border-b border-line pb-6">
          <div className="p-3 bg-accent/10 rounded-xl">
            <Utensils className="text-accent" size={24} />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-black text-ink">{t(`Kitchen Display System`)}</h2>
            <p className="text-sm text-ink-soft">{t(`Manage incoming food orders in real-time`)}</p>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <ChefHat size={64} className="mb-4 text-ink-soft" />
            <h3 className="font-bold text-xl">{t(`No Pending Orders`)}</h3>
            <p>{t(`Kitchen is clear!`)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {orders.map(order => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`border-2 rounded-2xl p-5 shadow-sm flex flex-col ${order.status === 'pending' ? 'border-warning/50 bg-warning/5' : 'border-accent/50 bg-accent/5'}`}
                >
                  <div className="flex justify-between items-center mb-4 border-b border-line/40 pb-3">
                    <h3 className="font-black text-xl text-ink">#{order.orderNumber || order.id.slice(-4).toUpperCase()}</h3>
                    <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-surface">
                      <Clock size={12} />
                      {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 mb-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-lg">
                        <span className="font-bold text-ink">{item.qty}x {item.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-3">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'cooking')}
                        className="flex-1 bg-warning text-white font-bold py-3 rounded-xl shadow-sm hover:opacity-90 transition-all"
                      >
                        {t(`Start Cooking`)}
                      </button>
                    )}
                    {order.status === 'cooking' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'ready')}
                        className="flex-1 bg-success text-white font-bold py-3 rounded-xl shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} /> {t(`Mark Ready`)}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
