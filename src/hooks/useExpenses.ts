import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type ShopExpense = {
  id: string
  category: 'transport' | 'utility' | 'labor' | 'tea' | string
  amount: number
  date: string
  note?: string
  createdAt?: string
}

export function useExpenses() {
  const { tenantId } = useAuthSession()
  const [expenses, setExpenses] = useState<ShopExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setExpenses([])
      setLoading(false)
      return
    }

    setLoading(true)
    const expensesRef = collection(db, `users/${tenantId}/expenses`)
    const q = query(expensesRef, orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: ShopExpense[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as ShopExpense)
        })
        setExpenses(data)
        setLoading(false)
      },
      (error) => {
        console.error('Failed to fetch expenses:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [tenantId])

  const addExpense = async (expense: ShopExpense) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, `users/${tenantId}/expenses`, expense.id)
    await setDoc(docRef, {
      ...expense,
      createdAt: expense.createdAt || new Date().toISOString()
    })
  }

  const removeExpense = async (id: string) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, `users/${tenantId}/expenses`, id)
    await deleteDoc(docRef)
  }

  return { expenses, loading, addExpense, removeExpense }
}
