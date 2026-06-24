import { useState, useEffect } from 'react'
import {
  arrayUnion,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'
import type { Locale } from '../i18n'

export type CustomerCredit = {
  id: string
  name: string
  mobile: string
  amount: number
  originalAmount?: number
  paidAmount?: number
  dueDate: string
  status: 'pending' | 'partial' | 'paid'
  createdAt?: string
  updatedAt?: string
  payments?: LedgerPayment[]
}

export type LedgerPayment = {
  id: string
  amount: number
  method: 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank'
  note?: string
  paidAt: string
}

export function useCustomerLedger() {
  const { tenantId, user } = useAuthSession()
  const [credits, setCredits] = useState<CustomerCredit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      let cancelled = false
      queueMicrotask(() => {
        if (!cancelled) {
          setCredits([])
          setLoading(false)
        }
      })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
      }
    })
    const creditsRef = collection(db, 'users', tenantId, 'credits')
    const q = query(creditsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: CustomerCredit[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as CustomerCredit)
        })
        setCredits(data)
        setLoading(false)
      },
      (error) => {
        console.error('Failed to fetch credits:', error)
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [tenantId])

  const addCredit = async (credit: CustomerCredit) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, 'users', tenantId, 'credits', credit.id)
    const originalAmount = credit.originalAmount ?? credit.amount
    const paidAmount = credit.paidAmount ?? 0
    await setDoc(docRef, {
      ...credit,
      originalAmount,
      paidAmount,
      amount: Math.max(0, originalAmount - paidAmount),
      status: paidAmount >= originalAmount ? 'paid' : paidAmount > 0 ? 'partial' : credit.status,
      createdAt: credit.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  const recordPayment = async (
    creditId: string,
    amount: number,
    method: LedgerPayment['method'] = 'cash',
    note?: string,
  ) => {
    if (!tenantId) throw new Error('Must be logged in')
    if (amount <= 0) throw new Error('Payment amount must be greater than zero.')

    const credit = credits.find((entry) => entry.id === creditId)
    if (!credit) throw new Error('Credit record was not found.')

    const originalAmount = credit.originalAmount ?? credit.amount + (credit.paidAmount ?? 0)
    const nextPaidAmount = Math.min(originalAmount, (credit.paidAmount ?? 0) + amount)
    const nextBalance = Math.max(0, originalAmount - nextPaidAmount)
    const nextStatus: CustomerCredit['status'] =
      nextBalance <= 0 ? 'paid' : nextPaidAmount > 0 ? 'partial' : 'pending'

    const payment: LedgerPayment = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
      amount,
      method,
      note,
      paidAt: new Date().toISOString(),
    }

    const docRef = doc(db, 'users', tenantId, 'credits', creditId)
    await updateDoc(docRef, {
      amount: nextBalance,
      originalAmount,
      paidAmount: nextPaidAmount,
      payments: arrayUnion(payment),
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })
  }

  const removeCredit = async (id: string) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, 'users', tenantId, 'credits', id)
    await deleteDoc(docRef)
  }

  const queueCreditReminder = async (credit: CustomerCredit, locale: Locale) => {
    if (!tenantId) throw new Error('Must be logged in')

    const outstanding = Math.max(0, credit.amount)
    const message =
      locale === 'bn'
        ? `প্রিয় ${credit.name}, আপনার দোকানের বাকি ৳${Math.round(outstanding).toLocaleString()} পরিশোধের অনুরোধ রইল। ধন্যবাদ।`
        : `Dear ${credit.name}, please clear your pending shop credit of ৳${Math.round(outstanding).toLocaleString()}. Thank you.`

    const batch = writeBatch(db)
    const reminderRef = doc(collection(db, 'users', tenantId, 'credit_reminders'))
    const queueRef = doc(collection(db, 'webhook_queue'))

    batch.set(reminderRef, {
      creditId: credit.id,
      customerName: credit.name,
      mobile: credit.mobile,
      amount: outstanding,
      dueDate: credit.dueDate,
      channel: 'sms',
      locale,
      message,
      status: 'queued',
      createdAt: serverTimestamp(),
    })

    batch.set(queueRef, {
      userId: user?.uid || tenantId,
      taskId: `credit-reminder-${credit.id}`,
      priority: 'credit-reminder',
      title:
        locale === 'bn'
          ? `${credit.name}-কে বাকির রিমাইন্ডার`
          : `Credit reminder for ${credit.name}`,
      type: 'credit_reminder',
      channel: 'sms',
      status: 'pending',
      payload: {
        creditId: credit.id,
        customerName: credit.name,
        mobile: credit.mobile,
        amount: outstanding,
        dueDate: credit.dueDate,
        locale,
        message,
      },
      createdAt: serverTimestamp(),
    })

    await batch.commit()
  }

  return { credits, loading, addCredit, queueCreditReminder, recordPayment, removeCredit }
}
