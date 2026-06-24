import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { useAuthSession } from './useAuthSession'

let globalDoc: Y.Doc | null = null
let globalProvider: WebrtcProvider | null = null

export function useCRDT() {
  const { tenantId } = useAuthSession()
  const [synced, setSynced] = useState(false)
  const [peers, setPeers] = useState(0)

  useEffect(() => {
    if (!tenantId) return

    if (!globalDoc) {
      globalDoc = new Y.Doc()
      const roomName = `equipulse-crdt-${tenantId}`
      
      // Initialize WebRTC Provider for local network P2P sync
      globalProvider = new WebrtcProvider(roomName, globalDoc, {
        signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
      })
      
      globalProvider.on('synced', (state: { synced: boolean }) => {
        setSynced(state.synced)
      })

      globalProvider.on('peers', (event: { webrtcPeers: unknown[] }) => {
        setPeers(event.webrtcPeers.length)
      })
    }

    return () => {
      // Don't destroy on unmount, keep it alive globally for the session
    }
  }, [tenantId])

  return {
    doc: globalDoc,
    synced,
    peers
  }
}
