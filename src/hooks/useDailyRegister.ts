import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type RegisterPaymentMethod = 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'credit' | 'split' | 'gift_card' | 'upay' | 'tap'

export type RegisterPaymentSplit = {
  method: Exclude<RegisterPaymentMethod, 'split'>
  amount: number
  reference?: string
}

export type RegisterLineItem = {
  itemId: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type CashTransaction = {
  id: string
  type: 'sale' | 'expense' | 'credit_payment' | 'cash_in' | 'cash_out'
  amount: number
  note: string
  timestamp: string
  paymentMethod?: RegisterPaymentMethod
  payments?: RegisterPaymentSplit[]
  items?: RegisterLineItem[]
  referenceId?: string
  cashierId?: string | null
  cashierName?: string | null
}

export type DailyRegister = {
  id: string // YYYY-MM-DD format
  openingBalance: number
  closingBalance: number | null
  status: 'open' | 'closed'
  transactions: CashTransaction[]
  createdAt?: unknown
  updatedAt?: unknown
}

export function useDailyRegister() {
  const { tenantId } = useAuthSession()
  const [register, setRegister] = useState<DailyRegister | null>(null)
  const [loading, setLoading] = useState(true)

  const todayId = new Date().toISOString().split('T')[0] as string

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    const docRef = doc(collection(db, 'users', tenantId, 'registers'), todayId)
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRegister({ id: docSnap.id, ...docSnap.data() } as DailyRegister)
      } else {
        setRegister(null)
      }
      setLoading(false)
    })

    const handleP2P = async (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string, data: unknown, timestamp: string }>;
      const payload = customEvent.detail;
      
      if (payload.type === 'SYNC_REGISTER' && payload.data) {
        // We received a transaction update from a peer
        const newTx = payload.data as CashTransaction;
        // Merge into local Firestore cache
        await setDoc(
          docRef,
          { transactions: arrayUnion(newTx) },
          { merge: true }
        );
      }
    };

    window.addEventListener('equipulse-p2p-sync', handleP2P);

    return () => {
      unsubscribe();
      window.removeEventListener('equipulse-p2p-sync', handleP2P);
    };
  }, [tenantId, todayId])

  const openRegister = async (openingBalance: number) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(collection(db, 'users', tenantId, 'registers'), todayId)
    
    const newRegister: Partial<DailyRegister> = {
      openingBalance,
      closingBalance: null,
      status: 'open',
      transactions: [],
      createdAt: serverTimestamp()
    }
    
    await setDoc(docRef, newRegister)
  }

  const closeRegister = async (closingBalance: number) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(collection(db, 'users', tenantId, 'registers'), todayId)
    await updateDoc(docRef, {
      closingBalance,
      status: 'closed'
    })
  }

  const logTransaction = async (tx: Omit<CashTransaction, 'id' | 'timestamp'>) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(collection(db, 'users', tenantId, 'registers'), todayId)
    
    const newTx: CashTransaction = {
      ...tx,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      cashierId: localStorage.getItem('equipulse_active_cashier_id') || null,
      cashierName: localStorage.getItem('equipulse_active_cashier_name') || null
    }
    
    await setDoc(
      docRef,
      {
        id: todayId,
        openingBalance: register?.openingBalance ?? 0,
        closingBalance: null,
        status: register?.status ?? 'open',
        transactions: arrayUnion(newTx),
        updatedAt: serverTimestamp(),
        createdAt: register?.createdAt ?? serverTimestamp(),
      },
      { merge: true },
    )
    
    // Broadcast via LAN P2P
    window.dispatchEvent(new CustomEvent('equipulse-p2p-broadcast', {
      detail: { type: 'SYNC_REGISTER', data: newTx }
    }));
  }

  const restoreRegister = async (snapshot: DailyRegister) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(collection(db, 'users', tenantId, 'registers'), snapshot.id || todayId)
    await setDoc(
      docRef,
      {
        ...snapshot,
        id: snapshot.id || todayId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  return {
    register,
    loading,
    openRegister,
    closeRegister,
    logTransaction,
    restoreRegister,
  }
}
