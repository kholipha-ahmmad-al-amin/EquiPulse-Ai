import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../../firebase/config'

export type LeaderboardEntry = {
  id: string
  displayName: string
  points: number
  tier: string
}

export function useLeaderboard(limitCount = 10) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const leaderboardQuery = query(
      collection(db, 'storeProfiles'),
      orderBy('participationPoints', 'desc'),
      limit(limitCount),
    )

    return onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        setEntries(
          snapshot.docs.map((entry) => {
            const data = entry.data()
            return {
              id: entry.id,
              displayName: typeof data.storeName === 'string' ? data.storeName : 'SME Merchant',
              points: typeof data.participationPoints === 'number' ? data.participationPoints : 0,
              tier: typeof data.tier === 'string' ? data.tier : 'Silver',
            }
          }),
        )
        setError(null)
        setLoading(false)
      },
      (snapshotError) => {
        console.error('Leaderboard error:', snapshotError)
        setError(snapshotError.message)
        setLoading(false)
      },
    )
  }, [limitCount])

  return { entries, error, loading }
}
