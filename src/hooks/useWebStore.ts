// useWebStore: public read of a tenant's published inventory.
// Powers the one-click web store at /store/:tenantId.
// Items are published to a public collection `storefront/{tenantId}/items` via togglePublish().
// No authentication required to read; the publish action requires the user to be signed in.

import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'
import type { InventoryItem } from './useInventory'

export interface StorefrontItem {
  id: string
  name: string
  price: number
  unit?: string
  imageUrl?: string
  description?: string
  category?: string
  inStock: boolean
}

const isFirestoreReady = () => {
  try {
    return !!db && typeof (db as { app?: unknown }).app !== 'undefined'
  } catch {
    return false
  }
}

const PUBLIC_PATH = (tenantId: string) => `storefront/${tenantId}/items`

export const toStorefrontItem = (item: InventoryItem): StorefrontItem => ({
  id: item.id,
  name: item.name,
  price: item.price || 0,
  unit: item.unit,
  imageUrl: (item as { imageUrl?: string }).imageUrl,
  description: (item as { description?: string }).description,
  category: item.category,
  inStock: (item.quantity || 0) > 0,
})

export function useWebStore(tenantId: string | null | undefined) {
  const [items, setItems] = useState<StorefrontItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setItems([])
      setLoading(false)
      return
    }
    if (!isFirestoreReady()) {
      setError('Firestore is not configured for this deployment.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const q = query(collection(db, PUBLIC_PATH(tenantId)))
    const unsub = onSnapshot(
      q,
      snap => {
        const list: StorefrontItem[] = []
        snap.forEach(d => {
          const data = d.data() as StorefrontItem
          list.push({ ...data, id: data.id || d.id })
        })
        setItems(list)
        setLoading(false)
      },
      err => {
        setError(err.message || 'Failed to load storefront')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [tenantId])

  return { items, loading, error }
}

// Hook for the OWNER side: publish/unpublish inventory items to the public storefront.
export function useStorefrontPublisher() {
  const { tenantId } = useAuthSession()
  const [publishing, setPublishing] = useState(false)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setPublishedIds(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = onSnapshot(
      collection(db, PUBLIC_PATH(tenantId)),
      snap => {
        const ids = new Set<string>()
        snap.forEach(d => ids.add(d.id))
        setPublishedIds(ids)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId])

  const publish = useCallback(
    async (item: InventoryItem) => {
      if (!tenantId) throw new Error('No tenant id')
      setPublishing(true)
      try {
        const ref = doc(db, PUBLIC_PATH(tenantId), item.id)
        await setDoc(ref, {
          ...toStorefrontItem(item),
          updatedAt: serverTimestamp(),
        })
      } finally {
        setPublishing(false)
      }
    },
    [tenantId],
  )

  const unpublish = useCallback(
    async (itemId: string) => {
      if (!tenantId) throw new Error('No tenant id')
      setPublishing(true)
      try {
        await deleteDoc(doc(db, PUBLIC_PATH(tenantId), itemId))
      } finally {
        setPublishing(false)
      }
    },
    [tenantId],
  )

  const publishMany = useCallback(
    async (items: InventoryItem[]) => {
      if (!tenantId) throw new Error('No tenant id')
      setPublishing(true)
      try {
        await Promise.all(items.map(item => publish(item)))
      } finally {
        setPublishing(false)
      }
    },
    [tenantId, publish],
  )

  return { publish, unpublish, publishMany, publishing, publishedIds, loading }
}

// Public URL helper
export const storefrontUrl = (tenantId: string, origin?: string) => {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/store/${encodeURIComponent(tenantId)}`
}
