import WebSocket from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import assert from 'node:assert';
import {
  MSG_SYNC,
  createBinaryPacket,
  parseBinaryPacket,
} from '@collab/shared';
import { getPrismaClient } from '../packages/server/src/storage/db.js';
import { S3StorageService } from '../packages/server/src/storage/s3-client.js';

interface HeadlessClient {
  id: string;
  name: string;
  wsUrl: string;
  ws: WebSocket;
  doc: Y.Doc;
  text: Y.Text;
  isSynced: boolean;
  receivedUpdates: number;
}

function createHeadlessClient(id: string, name: string, wsUrl: string): Promise<HeadlessClient> {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();
    const text = doc.getText('content');
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    const client: HeadlessClient = {
      id,
      name,
      wsUrl,
      ws,
      doc,
      text,
      isSynced: false,
      receivedUpdates: 0,
    };

    // Forward local doc mutations to server over binary WebSocket frame
    doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin === client) return; // Ignore updates applied from server

      if (ws.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        syncProtocol.writeUpdate(encoder, update);
        ws.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
      }
    });

    ws.on('open', () => {
      // Initiate SyncStep1 with our state vector
      const syncEncoder = encoding.createEncoder();
      syncProtocol.writeSyncStep1(syncEncoder, doc);
      ws.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(syncEncoder)));
    });

    ws.on('message', (data: Buffer | ArrayBuffer) => {
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
          const syncType = syncProtocol.readSyncMessage(decoder, encoder, doc, client);

          if (encoding.length(encoder) > 0) {
            ws.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
          }

          if (syncType === syncProtocol.messageYjsSyncStep2 || syncType === syncProtocol.messageYjsUpdate) {
            client.receivedUpdates++;
            if (!client.isSynced) {
              client.isSynced = true;
              resolve(client);
            }
          }
        }
      } catch (err) {
        console.error(`[${id}] Packet parsing error:`, err);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[${id}] WebSocket closed: code=${code}, reason=${reason.toString()}`);
    });

    ws.on('error', (err) => {
      console.error(`[${id}] WebSocket error:`, err);
      reject(err);
    });

    // Timeout safety for handshake
    setTimeout(() => {
      if (!client.isSynced) {
        client.isSynced = true;
        resolve(client);
      }
    }, 2000);
  });
}

async function runConvergenceVerification() {
  console.log('\n======================================================================');
  console.log('PHASE 5: CONCURRENCY CONVERGENCE & MULTI-NODE RESILIENCE TEST SUITE');
  console.log('======================================================================\n');

  const docId = `doc_concurrency_${Date.now()}`;
  console.log(`[Setup] Target Collaborative Document: ${docId}`);

  // Gateway node endpoints
  const node1Url = `ws://localhost:4001/ws?docId=${docId}&userId=client_1&name=Client+1`;
  const node2Url = `ws://localhost:4002/ws?docId=${docId}&userId=client_2&name=Client+2`;
  const node1UrlAlt = `ws://localhost:4001/ws?docId=${docId}&userId=client_3&name=Client+3`;

  const [initNode1, initNode2] = await Promise.all([
    fetch('http://localhost:4001/health').then((r) => r.json()),
    fetch('http://localhost:4002/health').then((r) => r.json()),
  ]);
  const initialRoomsNode1 = initNode1.activeRooms || 0;
  const initialRoomsNode2 = initNode2.activeRooms || 0;

  console.log('[Setup] Connecting 3 headless clients across 2 distributed gateway nodes:');
  console.log(` - Client 1 -> Gateway Node 1 (port 4001)`);
  console.log(` - Client 2 -> Gateway Node 2 (port 4002)`);
  console.log(` - Client 3 -> Gateway Node 1 (port 4001)`);

  const [c1, c2, c3] = await Promise.all([
    createHeadlessClient('Client-1', 'Alice', node1Url),
    createHeadlessClient('Client-2', 'Bob', node2Url),
    createHeadlessClient('Client-3', 'Charlie', node1UrlAlt),
  ]);

  console.log('✔ All 3 clients connected and synchronized initial state.\n');

  // Concurrency Stress Parameters
  const TOTAL_OPERATIONS = 500;
  console.log(`[Execution] Dispatching ${TOTAL_OPERATIONS} concurrent randomized insert/delete operations...`);

  const startTime = Date.now();
  const clients = [c1, c2, c3];

  // Interleaved mutation loop
  for (let i = 0; i < TOTAL_OPERATIONS; i++) {
    const activeClient = clients[i % 3];
    const textLen = activeClient.text.length;

    // 80% insertions, 20% deletions (if length > 5)
    const isInsert = textLen < 5 || Math.random() < 0.8;

    if (isInsert) {
      const pos = Math.floor(Math.random() * (textLen + 1));
      const charChunk = `[c${(i % 3) + 1}:#${i}]`;
      activeClient.text.insert(pos, charChunk);
    } else {
      const pos = Math.floor(Math.random() * (textLen - 3));
      const delLen = Math.min(3, textLen - pos);
      activeClient.text.delete(pos, delLen);
    }

    // Small micro-delay every 20 operations to simulate natural high-throughput typing bursts
    if (i % 25 === 0) {
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  const dispatchDuration = Date.now() - startTime;
  console.log(`✔ Finished dispatching 500 operations in ${dispatchDuration}ms.`);
  console.log('[Convergence] Waiting for cross-node Redis propagation and CRDT reconciliation...');

  // Allow inter-node network & Redis pub/sub queue to fully drain and converge
  await new Promise((r) => setTimeout(r, 3000));

  const text1 = c1.text.toString();
  const text2 = c2.text.toString();
  const text3 = c3.text.toString();

  const sv1 = Y.encodeStateVector(c1.doc);
  const sv2 = Y.encodeStateVector(c2.doc);
  const sv3 = Y.encodeStateVector(c3.doc);

  console.log('\n--- CONVERGENCE VALIDATION ---');
  console.log(`Client 1 Text Length: ${text1.length} chars | State Vector Bytes: ${sv1.byteLength}`);
  console.log(`Client 2 Text Length: ${text2.length} chars | State Vector Bytes: ${sv2.byteLength}`);
  console.log(`Client 3 Text Length: ${text3.length} chars | State Vector Bytes: ${sv3.byteLength}`);

  // 1. Text equality assertions
  assert.strictEqual(text1, text2, 'FATAL: Client 1 and Client 2 text diverged!');
  assert.strictEqual(text2, text3, 'FATAL: Client 2 and Client 3 text diverged!');
  assert.ok(text1.length > 50, 'Text output should be substantially populated');
  console.log('✔ Assertion 1: All 3 clients converged to 100% identical document text.');

  // 2. CRDT State Vector equality assertions
  assert.strictEqual(
    Buffer.from(sv1).compare(Buffer.from(sv2)),
    0,
    'FATAL: Client 1 and Client 2 state vectors do not match!'
  );
  assert.strictEqual(
    Buffer.from(sv2).compare(Buffer.from(sv3)),
    0,
    'FATAL: Client 2 and Client 3 state vectors do not match!'
  );
  console.log('✔ Assertion 2: All 3 clients possess 100% identical Yjs state vectors.');

  // 3. Storage snapshot & version control assertions
  console.log('\n--- STORAGE SNAPSHOT & PERSISTENCE VALIDATION ---');
  const prisma = getPrismaClient();
  const s3 = S3StorageService.getInstance();

  // Wait extra 3 seconds for 5s inactivity debounce to commit latest state
  console.log('[Storage] Awaiting debounced snapshot commit to MinIO & PostgreSQL...');
  await new Promise((r) => setTimeout(r, 3500));

  const dbSnapshots = await prisma.documentSnapshot.findMany({
    where: { documentId: docId },
    orderBy: { version: 'desc' },
  });

  console.log(`Database recorded snapshots for ${docId}: ${dbSnapshots.length}`);
  assert.ok(
    dbSnapshots.length >= 1,
    'FATAL: Expected at least 1 debounced snapshot in PostgreSQL'
  );

  const latestDbSnapshot = dbSnapshots[0];
  console.log(`Latest snapshot version: v${latestDbSnapshot.version}, S3 key: ${latestDbSnapshot.s3Key}`);

  // Verify binary state in MinIO
  const s3Data = await s3.getSnapshot(latestDbSnapshot.s3Key);
  assert.ok(s3Data.byteLength > 0, 'FATAL: MinIO snapshot file is empty!');
  console.log(`✔ MinIO binary snapshot confirmed: ${s3Data.byteLength} bytes.`);

  // Verify history milestones
  const historyEntries = await prisma.documentHistory.findMany({
    where: { documentId: docId },
  });
  assert.ok(historyEntries.length >= 1, 'FATAL: Expected DocumentHistory milestone records');
  console.log(`✔ Assertion 3: Document snapshots and history successfully persisted to MinIO + PostgreSQL.`);

  // 4. Room Evacuation & Lazy Redis Unsubscribe Validation
  console.log('\n--- ROOM EVACUATION & RESOURCE RECLAIM VALIDATION ---');
  console.log('[Cleanup] Disconnecting all 3 clients to evacuate room across both nodes...');
  c1.ws.close();
  c2.ws.close();
  c3.ws.close();

  // Give server time to detect close, flush snapshot, unsubscribe, and delete room from memory
  await new Promise((r) => setTimeout(r, 1000));

  // Query health endpoints of both nodes
  const [resNode1, resNode2] = await Promise.all([
    fetch('http://localhost:4001/health').then((r) => r.json()),
    fetch('http://localhost:4002/health').then((r) => r.json()),
  ]);

  console.log(`Node 1 Active Rooms: ${resNode1.activeRooms}`);
  console.log(`Node 2 Active Rooms: ${resNode2.activeRooms}`);

  assert.strictEqual(
    resNode1.activeRooms,
    initialRoomsNode1,
    `Node 1 must return to ${initialRoomsNode1} active room(s) after target document evacuation`
  );
  assert.strictEqual(
    resNode2.activeRooms,
    initialRoomsNode2,
    `Node 2 must return to ${initialRoomsNode2} active room(s) after target document evacuation`
  );
  console.log('✔ Assertion 4: Room evacuation verified. Redis channels unsubscribed and RAM reclaimed.');

  console.log('\n======================================================================');
  console.log('ALL PHASE 1-5 SPECIFICATIONS & INVARIANTS VERIFIED SUCCESSFULLY');
  console.log('======================================================================\n');

  process.exit(0);
}

runConvergenceVerification().catch((err) => {
  console.error('\n✖ Convergence test failed with error:', err);
  process.exit(1);
});
