import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type InventoryItem = {
  id: string
  sku?: string
  barcode?: string
  name: string
  quantity: number
  unit: string // e.g., 'kg', 'ltr', 'pcs'
  minThreshold: number
  price: number // selling price
  updatedAt?: string
  // New ERP Fields:
  unitPrice?: number
  costPrice?: number
  wholesalePrice?: number
  retailPrice?: number
  loyaltyPrice?: number
  supplierName?: string
  category?: string
  expiryDate?: string
  batchNo?: string
  taxRate?: number // Per-item tax override (e.g. 5 for 5%)
  size?: string
  color?: string
  lastRestockedAt?: string
  // Cluster 4 ERP Fields:
  warehouseQuantity?: number
  isBundle?: boolean
  bundleItems?: { id: string; quantity: number }[]
  hasSerial?: boolean
  locationStocks?: Record<string, number>
}

export function useInventory() {
  const { tenantId } = useAuthSession()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    const itemsRef = collection(db, `users/${tenantId}/inventory`)
    const q = query(itemsRef, orderBy('name'))
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newItems: InventoryItem[] = []
        snapshot.forEach((doc) => {
          newItems.push({ id: doc.id, ...doc.data() } as InventoryItem)
        })
        setItems(newItems)
        setLoading(false)
      },
      (error) => {
        console.error('Inventory error:', error)
        setLoading(false)
      }
    )

    const handleP2P = async (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string, data: InventoryItem, timestamp: string }>;
      const payload = customEvent.detail;
      
      if (payload.type === 'SYNC_INVENTORY' && payload.data) {
        // We received an inventory update from a peer on the LAN
        // Write it to our local Firestore cache
        const item = payload.data as InventoryItem;
        const docRef = doc(db, `users/${tenantId}/inventory`, item.id);
        await setDoc(docRef, item, { merge: true });
      }
    };

    window.addEventListener('equipulse-p2p-sync', handleP2P);

    return () => {
      unsubscribe();
      window.removeEventListener('equipulse-p2p-sync', handleP2P);
    };
  }, [tenantId])

  const saveItem = async (item: InventoryItem) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, `users/${tenantId}/inventory`, item.id)
    
    // Deep clean undefined and null fields to prevent Firestore serialization errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanObject = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(cleanObject)
      if (obj !== null && typeof obj === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleaned: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          const val = cleanObject(obj[key]);
          if (val !== undefined) {
            cleaned[key] = val;
          }
        }
        return cleaned;
      }
      return obj;
    };

    const dataToSave = cleanObject({
      ...item,
      updatedAt: new Date().toISOString()
    });

    await setDoc(docRef, dataToSave, { merge: true })
    
    // Broadcast via LAN P2P
    window.dispatchEvent(new CustomEvent('equipulse-p2p-broadcast', {
      detail: { type: 'SYNC_INVENTORY', data: dataToSave }
    }));

    // Trigger Outbound Webhook for Low Stock
    if (item.quantity <= item.minThreshold) {
      try {
        const stored = window.localStorage.getItem('equipulse-store-settings')
        if (stored) {
          const settings = JSON.parse(stored)
          const url = settings.n8nWebhookUrl
          if (url) {
            void fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'low_stock_alert',
                timestamp: new Date().toISOString(),
                data: {
                  itemId: item.id,
                  itemName: item.name,
                  currentQuantity: item.quantity,
                  minThreshold: item.minThreshold,
                }
              })
            }).catch(() => {})
          }
        }
      } catch {
        // Ignore webhook errors
      }
    }
  }

  const removeItem = async (id: string) => {
    if (!tenantId) throw new Error('Must be logged in')
    const docRef = doc(db, `users/${tenantId}/inventory`, id)
    await deleteDoc(docRef)
  }

  return { items, loading, saveItem, removeItem }
}
