import {
  collection,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { useCallback, useState } from 'react'
import { db } from '../../firebase/config'
import { useAuthSession } from './useAuthSession'

export type AcceptedDecisionInput = {
  taskId: string
  priority: string
  title: string
  summary: string
  confidence: string
  revenueImpact: string
  stockImpact: string
}

const ACCEPT_POINTS = 10

export function useDecisionSync() {
  const { tenantId, user } = useAuthSession()
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const syncAcceptedDecision = useCallback(
    async (decision: AcceptedDecisionInput) => {
      if (!tenantId || !user) {
        setSyncError('Sign in to sync accepted decisions to Firestore.')
        return
      }

      const userRef = doc(db, 'users', tenantId)
      const decisionRef = doc(collection(userRef, 'decisions'))
      const batch = writeBatch(db)

      if (user.uid === tenantId) {
        batch.set(
          userRef,
          {
            uid: tenantId,
            displayName: user.displayName || user.email || 'EquiPulse Operator',
            email: user.email,
            globalCoopPoints: increment(ACCEPT_POINTS),
            acceptedDecisionCount: increment(1),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      }

      batch.set(decisionRef, {
        ...decision,
        action: 'accept-deploy',
        pointsAwarded: ACCEPT_POINTS,
        createdAt: serverTimestamp(),
      })

      const eventRef = doc(collection(db, 'event_stream'))
      batch.set(eventRef, {
        eventType: 'DECISION_ACCEPTED',
        userId: user.uid,
        payload: decision,
        timestamp: serverTimestamp(),
      })

      const queueRef = doc(collection(db, 'webhook_queue'))
      batch.set(queueRef, {
        userId: user.uid,
        taskId: decision.taskId,
        priority: decision.priority,
        title: decision.title,
        pointsAwarded: ACCEPT_POINTS,
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      try {
        await batch.commit()
        setSyncError(null)
        setLastSyncedAt(new Date())

        const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.equisaas-bd.com/webhook/decision-sync'
        void fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'decision_accepted',
            timestamp: new Date().toISOString(),
            data: decision
          })
        }).catch(err => console.warn('Failed to sync decision to n8n webhook:', err))
        
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : 'Decision sync failed.')
        throw error
      }
    }, [tenantId, user])

  const seedUserProfile = useCallback(async () => {
    if (!user) {
      return
    }

    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        displayName: user.displayName || user.email || 'EquiPulse Operator',
        email: user.email,
        globalCoopPoints: increment(0),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }, [user])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dispatchLowStockWebhook = useCallback(async (item: any) => {
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
          }).catch(err => console.warn('Failed to dispatch low stock webhook:', err))
        }
      }
    } catch {
      // Ignore sync errors silently
    }
  }, [])

  return {
    canSync: Boolean(user),
    lastSyncedAt,
    seedUserProfile,
    syncAcceptedDecision,
    dispatchLowStockWebhook,
    syncError,
  }
}
