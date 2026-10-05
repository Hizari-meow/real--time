/**
 * 2-in-1 Unified Platform Integration Test (Workspace + Chat)
 *
 * Verifies:
 * 1. Collaborative Kanban Board CRDT synchronization across nodes (Node 1 <-> Node 2).
 * 2. Collaborative Whiteboard & Sticky Notes CRDT synchronization across nodes.
 * 3. 2-in-1 Chat integration: Document card sharing & Task creation cards in chat.
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

const NODE_1_URL = 'ws://localhost:4001/ws';
const NODE_2_URL = 'ws://localhost:4002/ws';

class IntegrationClient {
  public ydoc: Y.Doc;
  public awareness: awarenessProtocol.Awareness;
  public ws: WebSocket;
  public isSynced: boolean = false;

  constructor(
    public nodeUrl: string,
    public docId: string,
    public userId: string,
    public userName: string
  ) {
    this.ydoc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.ydoc);
    this.awareness.setLocalState({
      user: { id: userId, name: userName, color: '#3b82f6' },
    });

    const fullUrl = `${nodeUrl}?docId=${encodeURIComponent(docId)}&userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(userName)}`;
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
        const syncEncoder = encoding.createEncoder();
        syncProtocol.writeSyncStep1(syncEncoder, this.ydoc);
        this.ws.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(syncEncoder)));

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
          }
        } catch (err) {
          console.error(`[${this.userId}] Packet error:`, err);
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
  }

  close() {
    this.awareness.destroy();
    this.ws.close();
  }
}

async function runIntegrationTest() {
  console.log('\n============================================================');
  console.log('🚀 2-IN-1 COLLABORATIVE WORKSPACE & CHAT INTEGRATION TEST');
  console.log('============================================================\n');

  // --- 1. Test Kanban CRDT Sync Across Nodes ---
  console.log('--- 1. Testing Collaborative Kanban Board Sync ---');
  const kanbanDocId = `test_kanban_${Date.now()}`;
  const kanbanUserA = new IntegrationClient(NODE_1_URL, kanbanDocId, 'usr_nam', 'Nguyễn Văn Nam');
  const kanbanUserB = new IntegrationClient(NODE_2_URL, kanbanDocId, 'usr_mai', 'Trần Thị Mai');

  await Promise.all([kanbanUserA.connect(), kanbanUserB.connect()]);
  kanbanUserA.bindUpdates();
  kanbanUserB.bindUpdates();

  const tasksA = kanbanUserA.ydoc.getArray('kanban_tasks');
  const tasksB = kanbanUserB.ydoc.getArray('kanban_tasks');

  const newTask = {
    id: 'task_e2e_1',
    title: 'Xây dựng Bảng Kanban đồng thời',
    column: 'todo',
    priority: 'high',
    assigneeName: 'Trần Thị Mai',
  };

  kanbanUserA.ydoc.transact(() => {
    tasksA.push([newTask]);
  });
  console.log('User A created Task on Node 1: "Xây dựng Bảng Kanban đồng thời"');

  await new Promise((r) => setTimeout(r, 800));

  const listB = tasksB.toArray() as any[];
  const foundTask = listB.find((t) => t.id === 'task_e2e_1');
  if (!foundTask || foundTask.title !== newTask.title) {
    throw new Error('Task did not sync to User B on Node 2!');
  }
  console.log(`✅ User B on Node 2 received Task: "${foundTask.title}" (Column: ${foundTask.column})`);

  // User B moves task to 'in_progress'
  kanbanUserB.ydoc.transact(() => {
    const list = tasksB.toArray() as any[];
    const idx = list.findIndex((t) => t.id === 'task_e2e_1');
    const updated = { ...list[idx], column: 'in_progress' };
    tasksB.delete(idx, 1);
    tasksB.insert(idx, [updated]);
  });
  console.log('User B moved Task to "in_progress" on Node 2');

  await new Promise((r) => setTimeout(r, 800));

  const updatedInA = (tasksA.toArray() as any[]).find((t) => t.id === 'task_e2e_1');
  if (!updatedInA || updatedInA.column !== 'in_progress') {
    throw new Error('Task column update did not sync back to User A!');
  }
  console.log(`✅ User A sees Task moved to: "${updatedInA.column}"\n`);

  kanbanUserA.close();
  kanbanUserB.close();

  // --- 2. Test Whiteboard Canvas Sync Across Nodes ---
  console.log('--- 2. Testing Collaborative Whiteboard Canvas Sync ---');
  const boardDocId = `test_whiteboard_${Date.now()}`;
  const boardUserA = new IntegrationClient(NODE_1_URL, boardDocId, 'usr_nam', 'Nguyễn Văn Nam');
  const boardUserB = new IntegrationClient(NODE_2_URL, boardDocId, 'usr_mai', 'Trần Thị Mai');

  await Promise.all([boardUserA.connect(), boardUserB.connect()]);
  boardUserA.bindUpdates();
  boardUserB.bindUpdates();

  const elementsA = boardUserA.ydoc.getArray('whiteboard_elements');
  const elementsB = boardUserB.ydoc.getArray('whiteboard_elements');

  const stickyNote = {
    id: 'sticky_e2e_1',
    type: 'sticky',
    x: 150,
    y: 150,
    text: 'Ý tưởng Sprint tiếp theo: Hợp nhất Chat & Docs',
    votes: { '⭐': 1 },
    authorName: 'Nguyễn Văn Nam',
  };

  boardUserA.ydoc.transact(() => {
    elementsA.push([stickyNote]);
  });
  console.log('User A placed Sticky Note on Canvas (Node 1)');

  await new Promise((r) => setTimeout(r, 800));

  const notesInB = elementsB.toArray() as any[];
  const foundSticky = notesInB.find((s) => s.id === 'sticky_e2e_1');
  if (!foundSticky || !foundSticky.text.includes('Hợp nhất Chat & Docs')) {
    throw new Error('Sticky note did not sync to User B on Node 2!');
  }
  console.log(`✅ User B on Node 2 received Sticky Note: "${foundSticky.text}"`);

  // User B votes '🔥' on the sticky
  boardUserB.ydoc.transact(() => {
    const list = elementsB.toArray() as any[];
    const idx = list.findIndex((s) => s.id === 'sticky_e2e_1');
    const updated = {
      ...list[idx],
      votes: { ...list[idx].votes, '🔥': 2 },
    };
    elementsB.delete(idx, 1);
    elementsB.insert(idx, [updated]);
  });
  console.log('User B voted 🔥 on Sticky Note');

  await new Promise((r) => setTimeout(r, 800));

  const votedInA = (elementsA.toArray() as any[]).find((s) => s.id === 'sticky_e2e_1');
  if (!votedInA || votedInA.votes['🔥'] !== 2) {
    throw new Error('Sticky vote did not sync to User A!');
  }
  console.log(`✅ User A received updated votes: ${JSON.stringify(votedInA.votes)}\n`);

  boardUserA.close();
  boardUserB.close();

  // --- 3. Test 2-in-1 Chat Integration: Doc Cards & Task Cards ---
  console.log('--- 3. Testing 2-in-1 Chat Integration (Doc Cards & Task Cards) ---');
  const chatDocId = `test_chat_2in1_${Date.now()}`;
  const chatUserA = new IntegrationClient(NODE_1_URL, chatDocId, 'usr_nam', 'Nguyễn Văn Nam');
  const chatUserB = new IntegrationClient(NODE_2_URL, chatDocId, 'usr_mai', 'Trần Thị Mai');

  await Promise.all([chatUserA.connect(), chatUserB.connect()]);
  chatUserA.bindUpdates();
  chatUserB.bindUpdates();

  const chatMessagesA = chatUserA.ydoc.getArray('zalo_messages');
  const chatMessagesB = chatUserB.ydoc.getArray('zalo_messages');

  // User A shares Document Card into Chat
  const docMsg = {
    id: 'msg_doc_1',
    roomId: chatDocId,
    senderId: 'usr_nam',
    senderName: 'Nguyễn Văn Nam',
    type: 'doc',
    content: '📄 Chia sẻ tài liệu: Kiến trúc Phân tán CRDT',
    mediaMeta: {
      docId: 'doc_arch_123',
      title: 'Kiến trúc Phân tán CRDT',
      version: 4,
    },
    timestamp: Date.now(),
  };

  // User B converts a chat message into a Task Card
  const taskMsg = {
    id: 'msg_task_1',
    roomId: chatDocId,
    senderId: 'usr_mai',
    senderName: 'Trần Thị Mai',
    type: 'task',
    content: '📋 Đã tạo công việc: Triển khai Benchmark NGINX',
    mediaMeta: {
      taskTitle: 'Triển khai Benchmark NGINX',
      assigneeName: 'Nguyễn Văn Nam',
      column: 'in_progress',
    },
    timestamp: Date.now(),
  };

  chatUserA.ydoc.transact(() => {
    chatMessagesA.push([docMsg]);
  });
  console.log('User A shared Document Card into Chat room');

  chatUserB.ydoc.transact(() => {
    chatMessagesB.push([taskMsg]);
  });
  console.log('User B posted Task Card into Chat room');

  await new Promise((r) => setTimeout(r, 800));

  const msgsInB = chatMessagesB.toArray() as any[];
  const docInB = msgsInB.find((m) => m.type === 'doc');
  if (!docInB || docInB.mediaMeta?.title !== 'Kiến trúc Phân tán CRDT') {
    throw new Error('Document Card did not synchronize to User B!');
  }
  console.log(`✅ User B received interactive Document Card: "${docInB.mediaMeta?.title}" (v${docInB.mediaMeta?.version})`);

  const msgsInA = chatMessagesA.toArray() as any[];
  const taskInA = msgsInA.find((m) => m.type === 'task');
  if (!taskInA || taskInA.mediaMeta?.taskTitle !== 'Triển khai Benchmark NGINX') {
    throw new Error('Task Card did not synchronize to User A!');
  }
  console.log(`✅ User A received interactive Task Card: "${taskInA.mediaMeta?.taskTitle}" (Phụ trách: ${taskInA.mediaMeta?.assigneeName})\n`);

  chatUserA.close();
  chatUserB.close();

  console.log('🎉 ALL 2-IN-1 INTEGRATION CRITERIA VERIFIED 100% SUCCESSFULLY!\n');
}

runIntegrationTest().catch((err) => {
  console.error('❌ Integration Test failed:', err);
  process.exit(1);
});
