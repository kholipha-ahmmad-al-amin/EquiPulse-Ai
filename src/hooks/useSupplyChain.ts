import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type Supplier = {
  id: string
  name: string
  contactPerson?: string
  phone: string
  email?: string
  address?: string
  categories: string[]
  status: 'active' | 'inactive'
  createdAt?: string
}

export type PurchaseOrderItem = {
  itemId: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type PurchaseOrder = {
  id: string
  supplierId: string
  supplierName: string
  orderDate: string
  expectedDate?: string
  status: 'draft' | 'sent' | 'received' | 'cancelled'
  items: PurchaseOrderItem[]
  totalAmount: number
  notes?: string
  createdAt?: string
}

export function useSupplyChain() {
  const { tenantId } = useAuthSession()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setSuppliers([])
      setPurchaseOrders([])
      setLoading(false)
      return
    }

    const suppliersRef = collection(db, 'users', tenantId, 'suppliers')
    const qSuppliers = query(suppliersRef, orderBy('createdAt', 'desc'))
    
    const unsubscribeSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      const data: Supplier[] = []
      snapshot.forEach(doc => {
        data.push(doc.data() as Supplier)
      })
      setSuppliers(data)
    })

    const posRef = collection(db, 'users', tenantId, 'purchase_orders')
    const qPos = query(posRef, orderBy('createdAt', 'desc'))

    const unsubscribePOs = onSnapshot(qPos, (snapshot) => {
      const data: PurchaseOrder[] = []
      snapshot.forEach(doc => {
        data.push(doc.data() as PurchaseOrder)
      })
      setPurchaseOrders(data)
      setLoading(false)
    }, (err) => {
      console.error(err)
      setLoading(false)
    })

    return () => {
      unsubscribeSuppliers()
      unsubscribePOs()
    }
  }, [tenantId])

  const saveSupplier = async (supplier: Supplier) => {
    if (!tenantId) throw new Error('Not authenticated')
    const ref = doc(collection(db, 'users', tenantId, 'suppliers'), supplier.id)
    await setDoc(ref, {
      ...supplier,
      createdAt: supplier.createdAt || new Date().toISOString()
    }, { merge: true })
  }

  const deleteSupplier = async (id: string) => {
    if (!tenantId) throw new Error('Not authenticated')
    const ref = doc(collection(db, 'users', tenantId, 'suppliers'), id)
    await deleteDoc(ref)
  }

  const savePurchaseOrder = async (po: PurchaseOrder) => {
    if (!tenantId) throw new Error('Not authenticated')
    const ref = doc(collection(db, 'users', tenantId, 'purchase_orders'), po.id)
    await setDoc(ref, {
      ...po,
      createdAt: po.createdAt || new Date().toISOString()
    }, { merge: true })
  }

  const deletePurchaseOrder = async (id: string) => {
    if (!tenantId) throw new Error('Not authenticated')
    const ref = doc(collection(db, 'users', tenantId, 'purchase_orders'), id)
    await deleteDoc(ref)
  }

  return {
    suppliers,
    purchaseOrders,
    loading,
    saveSupplier,
    deleteSupplier,
    savePurchaseOrder,
    deletePurchaseOrder
  }
}
