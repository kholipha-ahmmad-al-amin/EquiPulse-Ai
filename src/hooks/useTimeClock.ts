import { useState, useEffect, useCallback } from 'react'
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'
import { useCashierLock } from './useCashierLock'

export type TimePunch = {
  id: string
  cashierId: string
  cashierName: string
  punchInTime: string
  punchOutTime?: string
  date: string
}

export function useTimeClock() {
  const { tenantId } = useAuthSession()
  const { activeCashierId, activeCashierName } = useCashierLock()
  const [activePunch, setActivePunch] = useState<TimePunch | null>(null)

  const fetchActivePunch = useCallback(async () => {
    if (!tenantId || !activeCashierId) return
    const todayId = new Date().toISOString().split('T')[0]
    const q = query(
      collection(db, 'users', tenantId, 'staff_attendance'),
      where('cashierId', '==', activeCashierId),
      where('date', '==', todayId)
    )
    const snapshot = await getDocs(q)
    let found = null
    snapshot.forEach((doc) => {
      const data = doc.data() as TimePunch
      if (!data.punchOutTime) found = data // still clocked in
    })
    setActivePunch(found)
  }, [tenantId, activeCashierId])

  useEffect(() => {
    fetchActivePunch()
  }, [fetchActivePunch])

  const punchIn = async () => {
    if (!tenantId || !activeCashierId || !activeCashierName) return
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)
    const newPunch: TimePunch = {
      id,
      cashierId: activeCashierId,
      cashierName: activeCashierName,
      punchInTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0] || ''
    }
    await setDoc(doc(db, 'users', tenantId, 'staff_attendance', id), newPunch)
    setActivePunch(newPunch)
  }

  const punchOut = async () => {
    if (!tenantId || !activePunch) return
    const updated = { ...activePunch, punchOutTime: new Date().toISOString() }
    await setDoc(doc(db, 'users', tenantId, 'staff_attendance', activePunch.id), updated)
    setActivePunch(null)
  }

  return { activePunch, punchIn, punchOut }
}
