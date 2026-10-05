'use client';

import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { ConnectionStatus } from '@collab/shared';
import { ResilientWebSocketProvider } from '../lib/yjs-provider';
import { setupIndexedDB } from '../lib/indexeddb';

export interface UseResilientWebSocketResult {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  provider: ResilientWebSocketProvider | null;
  status: ConnectionStatus;
  isSynced: boolean;
}

export function useResilientWebSocket(
  docId: string,
  user: { id: string; name: string; color: string }
): UseResilientWebSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [isSynced, setIsSynced] = useState<boolean>(false);

  // Maintain stable instances
  const ydocRef = useRef<Y.Doc | null>(null);
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  const ydoc = ydocRef.current;

  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  if (!awarenessRef.current) {
    awarenessRef.current = new awarenessProtocol.Awareness(ydoc);
  }
  const awareness = awarenessRef.current;

  const [provider, setProvider] = useState<ResilientWebSocketProvider | null>(null);

  useEffect(() => {
    // 1. Initialize local-first IndexedDB persistence
    const idb = setupIndexedDB(docId, ydoc);

    // 2. Resolve WebSocket URL
    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

    // 3. Instantiate resilient WebSocket provider with exponential backoff & jitter
    const p = new ResilientWebSocketProvider({
      url: envWsUrl,
      docId,
      doc: ydoc,
      awareness,
      userId: user.id,
      name: user.name,
      color: user.color,
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      onSynced: () => {
        setIsSynced(true);
      },
    });

    setProvider(p);

    return () => {
      p.destroy();
      idb?.destroy();
    };
  }, [docId, user.id, user.name, user.color, ydoc, awareness]);

  return {
    ydoc,
    awareness,
    provider,
    status,
    isSynced,
  };
}
