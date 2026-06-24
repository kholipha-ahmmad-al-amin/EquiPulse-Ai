import { useState, useCallback, useEffect } from 'react'
import type { InventoryItem } from './useInventory'

export type DraftItem = {
  item: InventoryItem
  qty: number
}

export type DraftCart = {
  id: string
  name: string
  items: DraftItem[]
  timestamp: number
}

const DRAFTS_KEY = 'equipulse-pos-drafts'

export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftCart[]>([])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DRAFTS_KEY)
      if (stored) {
        setDrafts(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  const saveDraft = useCallback((name: string, items: DraftItem[]) => {
    const newDraft: DraftCart = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      name,
      items,
      timestamp: Date.now()
    }
    setDrafts(prev => {
      const updated = [newDraft, ...prev]
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeDraft = useCallback((id: string) => {
    setDrafts(prev => {
      const updated = prev.filter(d => d.id !== id)
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return { drafts, saveDraft, removeDraft }
}
