import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  deleteDoc,
  increment,
  getDocs,
  limit
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type CustomerProfile = {
  id: string
  name: string
  mobile: string
  email?: string
  address?: string
  totalSpent: number
  loyaltyPoints: number
  lastPurchaseDate?: string
  createdAt: string
  updatedAt: string
}

export function useCRM() {
  const { tenantId } = useAuthSession()
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setCustomers([])
      setLoading(false)
      return
    }

    setLoading(true)
    const customersRef = collection(db, 'users', tenantId, 'customers')
    const q = query(customersRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: CustomerProfile[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as CustomerProfile)
        })
        setCustomers(data)
        setLoading(false)
      },
      (error) => {
        console.error('Failed to fetch customers:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [tenantId])

  const addOrUpdateCustomer = async (customer: Partial<CustomerProfile> & { name: string, mobile: string }) => {
    if (!tenantId) throw new Error('Must be logged in')
    
    // We can use mobile number as ID to avoid duplicates if preferred, or random UUID.
    const customerId = customer.id || customer.mobile.replace(/[^0-9]/g, '') || Date.now().toString()
    
    const docRef = doc(db, 'users', tenantId, 'customers', customerId)
    
    // Check if updating existing or adding new
    const existing = customers.find(c => c.id === customerId)
    
    if (existing) {
      await updateDoc(docRef, {
        ...customer,
        updatedAt: new Date().toISOString()
      })
    } else {
      await setDoc(docRef, {
        id: customerId,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email || '',
        address: customer.address || '',
        totalSpent: customer.totalSpent || 0,
        loyaltyPoints: customer.loyaltyPoints || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
    return customerId
  }

  const addPurchase = async (customerId: string, amount: number, pointsEarned: number) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, 'users', tenantId, 'customers', customerId)
    await updateDoc(docRef, {
      totalSpent: increment(amount),
      loyaltyPoints: increment(pointsEarned),
      lastPurchaseDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  
  const redeemPoints = async (customerId: string, points: number) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, 'users', tenantId, 'customers', customerId)
    await updateDoc(docRef, {
      loyaltyPoints: increment(-Math.abs(points)),
      updatedAt: new Date().toISOString()
    })
  }

  const deleteCustomer = async (id: string) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, 'users', tenantId, 'customers', id)
    await deleteDoc(docRef)
  }

  const getCustomerHistory = async (customerId: string) => {
    if (!tenantId) return []
    try {
      const q = query(
        collection(db, 'users', tenantId, 'customers', customerId, 'purchases'),
        orderBy('timestamp', 'desc'),
        limit(20)
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => d.data())
    } catch (e) {
      console.error(e)
      return []
    }
  }

  return { customers, loading, addOrUpdateCustomer, addPurchase, redeemPoints, deleteCustomer, getCustomerHistory }
}
