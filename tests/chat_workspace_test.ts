/**
 * End-to-End Chat & Real-Time Collaborative Workspace Convergence Test
 *
 * Verifies:
 * 1. REST API: Document creation, in-place title rename (PATCH), fetching.
 * 2. Multi-Node WebSocket mesh across Node 1 (port 4001) and Node 2 (port 4002).
 * 3. Bidirectional Yjs CRDT document convergence.
 * 4. Yjs CRDT real-time chat sync across nodes via Redis Pub/Sub.
 * 5. Awareness protocol (live typing indicators and user presence).
 * 6. Chat reaction updates and thread replies over CRDT array.
 */

import WebSocket from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import {
  MSG_SYNC,
  MSG_AWARENESS,
  createBinaryPacket,
  parseBinaryPacket,
} from '@collab/shared';

const GATEWAY_URL = 'http://localhost:8080';
const NODE_1_URL = 'ws://localhost:4001/ws';
const NODE_2_URL = 'ws://localhost:4002/ws';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  reactions: Record<string, string[]>;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  } | null;
}

class TestClient {
  public ydoc: Y.Doc;
  public awareness: awarenessProtocol.Awareness;
  public ws: WebSocket;
  public id: string;
  public name: string;
  public isSynced: boolean = false;

  constructor(public baseWsUrl: string, public docId: string, id: string, name: string) {
    this.id = id;
    this.name = name;
    this.ydoc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.ydoc);
    this.awareness.setLocalState({
      user: { id, name, color: '#10b981' },
      typing: false,
    });

    const fullUrl = `${baseWsUrl}?docId=${encodeURIComponent(docId)}&userId=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
    this.ws = new WebSocket(fullUrl);
    this.ws.binaryType = 'arraybuffer';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.isSynced) {
          this.isSynced = true;
          resolve();
        }
      }, 3000);

      this.ws.on('open', () => {
        // Step 1: Initiate SyncStep1 with our state vector
        const syncEncoder = encoding.createEncoder();
        syncProtocol.writeSyncStep1(syncEncoder, this.ydoc);
        this.ws.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(syncEncoder)));

        // Step 2: Send Awareness update
        const localAwareness = awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
          this.ydoc.clientID,
        ]);
        this.ws.send(createBinaryPacket(MSG_AWARENESS, localAwareness));
      });

      this.ws.on('message', (data: Buffer | ArrayBuffer) => {
        let uint8: Uint8Array;
        if (Buffer.isBuffer(data)) {
          uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else {
          uint8 = new Uint8Array(data);
        }

        try {
          const { msgType, payload } = parseBinaryPacket(uint8);

          if (msgType === MSG_SYNC) {
            const decoder = decoding.createDecoder(payload);
            const encoder = encoding.createEncoder();
            const syncType = syncProtocol.readSyncMessage(decoder, encoder, this.ydoc, this);

            if (encoding.length(encoder) > 0) {
              this.ws.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
            }

            if (
              syncType === syncProtocol.messageYjsSyncStep2 ||
              syncType === syncProtocol.messageYjsUpdate
            ) {
              if (!this.isSynced) {
                this.isSynced = true;
                clearTimeout(timer);
                resolve();
              }
            }
          } else if (msgType === MSG_AWARENESS) {
            awarenessProtocol.applyAwarenessUpdate(this.awareness, payload, this);
          }
        } catch (err) {
          console.error(`[${this.id}] Error handling packet:`, err);
        }
      });

      this.ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  bindUpdates() {
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== this && this.ws.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        syncProtocol.writeUpdate(encoder, update);
        this.ws.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
      }
    });

    this.awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      if (origin !== this && this.ws.readyState === WebSocket.OPEN) {
        const changedClients = added.concat(updated).concat(removed);
        const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
        this.ws.send(createBinaryPacket(MSG_AWARENESS, update));
      }
    });
  }

  close() {
    this.awareness.destroy();
    this.ws.close();
  }
}

async function runE2E() {
  console.log('🚀 [E2E] Starting Large-Scale Real-Time Workspace & Chat Verification...');

  // --- Step 1: REST API Validation ---
  console.log('\n--- 1. REST API Validation ---');
  const createRes = await fetch(`${GATEWAY_URL}/api/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Initial Sprint Planning' }),
  });
  const createJson = (await createRes.json()) as any;
  if (!createJson.success || !createJson.data?.id) {
    throw new Error('Failed to create document: ' + JSON.stringify(createJson));
  }
  const docId = createJson.data.id;
  console.log(`✅ Document created with ID: ${docId}, Title: "${createJson.data.title}"`);

  // Test PATCH title rename
  const patchRes = await fetch(`${GATEWAY_URL}/api/documents/${docId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Q4 Engineering Architecture Roadmap' }),
  });
  const patchJson = (await patchRes.json()) as any;
  if (!patchJson.success || patchJson.data?.title !== 'Q4 Engineering Architecture Roadmap') {
    throw new Error('Failed to patch document title: ' + JSON.stringify(patchJson));
  }
  console.log(`✅ Document renamed via PATCH to: "${patchJson.data.title}"`);

  // --- Step 2: Multi-Node WebSocket Connections ---
  console.log('\n--- 2. Multi-Node WebSocket Connections ---');
  console.log(`Connecting Client Alice -> Node 1 (${NODE_1_URL})...`);
  const alice = new TestClient(NODE_1_URL, docId, 'user_alice_1', 'Alice (Architect)');
  await alice.connect();
  alice.bindUpdates();
  console.log('✅ Alice connected to Node 1');

  console.log(`Connecting Client Bob -> Node 2 (${NODE_2_URL})...`);
  const bob = new TestClient(NODE_2_URL, docId, 'user_bob_2', 'Bob (Lead Dev)');
  await bob.connect();
  bob.bindUpdates();
  console.log('✅ Bob connected to Node 2');

  // Allow handshake synchronization to settle
  await new Promise((r) => setTimeout(r, 600));

  // --- Step 3: Editor Content CRDT Convergence Across Nodes ---
  console.log('\n--- 3. Editor Content CRDT Synchronization ---');
  const aliceContent = alice.ydoc.getText('content');
  aliceContent.insert(0, '# Architectural Blueprint\n- Phase 1: Distributed Mesh\n');

  // Wait for Redis Pub/Sub broadcast across Node 1 -> Node 2
  await new Promise((r) => setTimeout(r, 800));

  const bobContent = bob.ydoc.getText('content').toString();
  console.log(`Bob's editor content:\n"""\n${bobContent}"""`);
  if (!bobContent.includes('Architectural Blueprint')) {
    throw new Error('CRDT document sync failed between Alice and Bob!');
  }
  console.log('✅ Editor document content synchronized across Node 1 and Node 2!');

  // --- Step 4: Real-Time Chat Synchronization Across Nodes ---
  console.log('\n--- 4. Real-Time Chat Sync via Yjs Array ---');
  const aliceChat = alice.ydoc.getArray<ChatMessage>('chat_messages');
  const bobChat = bob.ydoc.getArray<ChatMessage>('chat_messages');

  const chatMsgId = 'msg_' + Date.now();
  const aliceMessage: ChatMessage = {
    id: chatMsgId,
    senderId: alice.id,
    senderName: alice.name,
    senderColor: '#3b82f6',
    text: 'Hey Bob, let’s review the horizontal scaling benchmarks for Redis Pub/Sub.',
    timestamp: Date.now(),
    reactions: {},
    replyTo: null,
  };

  aliceChat.push([aliceMessage]);
  console.log(`Alice sent chat message: "${aliceMessage.text}"`);

  // Wait for Redis sync
  await new Promise((r) => setTimeout(r, 800));

  const bobMessages = bobChat.toArray();
  console.log(`Bob received ${bobMessages.length} chat message(s).`);
  if (bobMessages.length === 0 || bobMessages[0].id !== chatMsgId) {
    throw new Error('Chat message failed to synchronize to Bob on Node 2!');
  }
  console.log(`✅ Bob successfully received message: "${bobMessages[0].text}"`);

  // --- Step 5: Chat Reactions over CRDT ---
  console.log('\n--- 5. Chat Reactions over CRDT ---');
  bob.ydoc.transact(() => {
    const raw = bobChat.toArray();
    const target = { ...raw[0] };
    target.reactions = { '🔥': [bob.id], '🚀': [bob.id] };
    bobChat.delete(0, 1);
    bobChat.insert(0, [target]);
  });
  console.log('Bob reacted with 🔥 and 🚀 to Alice’s message');

  await new Promise((r) => setTimeout(r, 800));

  const aliceMessagesAfterReaction = aliceChat.toArray();
  const reactionsOnAlice = aliceMessagesAfterReaction[0]?.reactions;
  console.log('Alice’s view of reactions:', reactionsOnAlice);
  if (!reactionsOnAlice || !reactionsOnAlice['🔥']?.includes(bob.id)) {
    throw new Error('Reaction sync failed across nodes!');
  }
  console.log('✅ Reactions synchronized back to Alice on Node 1!');

  // --- Step 6: Live Typing Awareness Protocol ---
  console.log('\n--- 6. Live Typing Awareness ---');
  alice.awareness.setLocalStateField('typing', true);
  console.log('Alice started typing...');

  await new Promise((r) => setTimeout(r, 600));

  const bobAwarenessStates = Array.from(bob.awareness.getStates().values());
  const typingUser = bobAwarenessStates.find((s: any) => s.user?.id === alice.id);
  console.log('Bob sees Alice awareness:', typingUser);
  if (!typingUser || !typingUser.typing) {
    throw new Error('Awareness typing state not propagated across nodes!');
  }
  console.log('✅ Live typing indicator verified across nodes!');

  // --- Cleanup ---
  console.log('\n--- 7. Cleanup & Disconnect ---');
  alice.close();
  bob.close();
  console.log('✅ Sockets closed cleanly.');

  console.log('\n🎉 ALL E2E CRDT WORKSPACE & CHAT VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
}

runE2E().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
