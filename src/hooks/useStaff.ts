import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type StaffMember = {
  uid: string
  email: string
  role: 'manager' | 'cashier'
  name: string
  baseSalary?: number
  advances?: number
  commissionRate?: number
  commissionEarned?: number
}

export function useStaff() {
  const { tenantId } = useAuthSession()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  useEffect(() => {
    // Both owner and staff can potentially see the staff list, 
    // but the actual security rules on Firestore might restrict it.
    // Assuming staff can at least read the list for now.
    if (!tenantId) {
      setStaffList([])
      setLoadingStaff(false)
      return
    }

    setLoadingStaff(true)
    const staffRef = collection(db, `users/${tenantId}/staff`)
    const unsubscribe = onSnapshot(
      staffRef,
      (snapshot) => {
        const staffData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StaffMember))
        setStaffList(staffData)
        setLoadingStaff(false)
      },
      (error) => {
        console.error('Failed to fetch staff list:', error)
        setLoadingStaff(false)
      }
    )

    return () => unsubscribe()
  }, [tenantId])

  return { staffList, loadingStaff }
}
