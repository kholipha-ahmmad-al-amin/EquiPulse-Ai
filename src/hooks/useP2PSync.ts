import { useEffect, useState } from 'react'
import Peer, { type DataConnection } from 'peerjs'

export type P2PMessageType = 'SYNC_INVENTORY' | 'SYNC_REGISTER' | 'NEW_SALE' | 'PING';

export interface P2PSyncPayload {
  type: P2PMessageType;
  data: Record<string, unknown>;
  timestamp: string;
}

export function useP2PSync(storeId: string) {
  const [peer, setPeer] = useState<Peer | null>(null)
  const [connections, setConnections] = useState<DataConnection[]>([])
  const [syncStatus, setSyncStatus] = useState<'offline' | 'connecting' | 'synced'>('offline')

  useEffect(() => {
    if (!storeId) return

    // Initialize PeerJS node with a unique ID for this store
    // Use a clean version of the storeId to avoid invalid PeerJS characters
    const cleanStoreId = storeId.replace(/[^a-zA-Z0-9-]/g, '-');
    const newPeer = new Peer(`equipulse-node-${cleanStoreId}`, {
      debug: 1,
    })

    newPeer.on('open', (id) => {
      console.log('[P2P] Peer ID is: ' + id)
      setSyncStatus('synced')
    })

    newPeer.on('connection', (conn) => {
      console.log('[P2P] Incoming connection from', conn.peer)
      
      conn.on('open', () => {
        setConnections(prev => {
          if (prev.find(c => c.peer === conn.peer)) return prev;
          return [...prev, conn];
        });
      });

      conn.on('data', (data: unknown) => {
        console.log('[P2P] Received Data:', data)
        const payload = data as P2PSyncPayload;
        
        // Dispatch event for other hooks to pick up and save to IndexedDB
        window.dispatchEvent(new CustomEvent('equipulse-p2p-sync', { 
          detail: payload 
        }));
      })
      
      conn.on('close', () => {
        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
      });
    })

    newPeer.on('error', (err) => {
      console.error('[P2P] PeerJS error:', err)
      if (err.type === 'peer-unavailable') {
        setSyncStatus('offline')
      }
    })

    setPeer(newPeer);

    const handleBroadcast = (e: Event) => {
      const ce = e as CustomEvent<{ type: P2PMessageType, data: Record<string, unknown> }>;
      if (!newPeer) return;
      
      const payload: P2PSyncPayload = {
        type: ce.detail.type,
        data: ce.detail.data,
        timestamp: new Date().toISOString()
      };
      
      // peer.connections is a Record<string, DataConnection[]>
      const allConns = Object.values(newPeer.connections).flat() as DataConnection[];
      allConns.forEach(conn => {
        if (conn.open) {
          conn.send(payload);
        }
      });
    };

    window.addEventListener('equipulse-p2p-broadcast', handleBroadcast);

    return () => {
      window.removeEventListener('equipulse-p2p-broadcast', handleBroadcast);
      newPeer.destroy();
    }
  }, [storeId])

  const connectToPeer = (targetPeerId: string) => {
    if (!peer) return
    setSyncStatus('connecting')
    
    // In our new flow, the user might paste the exact peer ID of the target
    const conn = peer.connect(targetPeerId)
    
    conn.on('open', () => {
      console.log('[P2P] Connected to', targetPeerId)
      setConnections(prev => {
        if (prev.find(c => c.peer === targetPeerId)) return prev;
        return [...prev, conn];
      });
      setSyncStatus('synced')
      
      // Ping
      conn.send({ type: 'PING', data: { msg: 'Hello from ' + peer.id }, timestamp: new Date().toISOString() })
    })

    conn.on('data', (data: unknown) => {
      console.log('[P2P] Received Data from Host:', data)
      const payload = data as P2PSyncPayload;
      window.dispatchEvent(new CustomEvent('equipulse-p2p-sync', { 
        detail: payload 
      }));
    });

    conn.on('close', () => {
      setSyncStatus('offline')
      setConnections(prev => prev.filter(c => c.peer !== conn.peer));
    })

    conn.on('error', () => {
      setSyncStatus('offline')
    })
  }

  const broadcastEvent = (type: P2PMessageType, data: Record<string, unknown>) => {
    if (connections.length === 0) return;
    
    const payload: P2PSyncPayload = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    connections.forEach(conn => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  }

  return {
    peerId: peer?.id,
    connections: connections.map(c => c.peer),
    syncStatus,
    connectToPeer,
    broadcastEvent
  }
}
