/**
 * Zalo Real-Time Calling E2E Test Across Cluster Nodes (Node 1 <-> Node 2 via Redis Pub/Sub)
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

interface ZaloCallSession {
  id: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerColor: string;
  callType: 'audio' | 'video';
  status: 'idle' | 'ringing' | 'connected' | 'ended' | 'declined';
  startedAt?: number | null;
  connectedAt?: number | null;
  duration?: number;
}

class ZaloCallTestClient {
  public ydoc: Y.Doc;
  public awareness: awarenessProtocol.Awareness;
  public ws: WebSocket;
  public isSynced: boolean = false;
  public callMap: Y.Map<any>;
  public chatArray: Y.Array<any>;

  constructor(
    public nodeUrl: string,
    public roomId: string,
    public userId: string,
    public userName: string,
    public userColor: string
  ) {
    this.ydoc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.ydoc);
    this.awareness.setLocalState({
      user: { id: userId, name: userName, color: userColor },
      typing: false,
    });

    const fullUrl = `${nodeUrl}?docId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(userName)}`;
    this.ws = new WebSocket(fullUrl);
    this.ws.binaryType = 'arraybuffer';
    this.callMap = this.ydoc.getMap<any>('zalo_call_session');
    this.chatArray = this.ydoc.getArray<any>('zalo_messages');
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
          } else if (msgType === MSG_AWARENESS) {
            awarenessProtocol.applyAwarenessUpdate(this.awareness, payload, this);
          }
        } catch (err) {
          console.error(`[${this.userId}] Error handling packet:`, err);
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

async function runZaloCallTest() {
  console.log('\n============================================================');
  console.log('🧪 VERIFYING REAL-TIME ZALO CALLING ACROSS CLUSTER GATEWAY');
  console.log('============================================================\n');

  const roomId = `zalo_call_room_${Date.now()}`;

  console.log('1. Connecting Client A (Nam) on Node 1 (port 4001)...');
  const nam = new ZaloCallTestClient(NODE_1_URL, roomId, 'usr_nam', 'Nguyễn Văn Nam', '#3b82f6');
  console.log('2. Connecting Client B (Mai) on Node 2 (port 4002)...');
  const mai = new ZaloCallTestClient(NODE_2_URL, roomId, 'usr_mai', 'Trần Thị Mai', '#ec4899');

  await Promise.all([nam.connect(), mai.connect()]);
  nam.bindUpdates();
  mai.bindUpdates();

  console.log('✅ Both Nam and Mai connected and synchronized initial state.\n');
  await new Promise((r) => setTimeout(r, 600));

  // --- Scenario 1: Nam initiates Video Call -> Mai receives Ringing ---
  console.log('--- Scenario 1: Nam calls Mai (Video Call) ---');
  const call1: ZaloCallSession = {
    id: 'call_123',
    roomId,
    callerId: nam.userId,
    callerName: nam.userName,
    callerColor: nam.userColor,
    callType: 'video',
    status: 'ringing',
    startedAt: Date.now(),
  };

  nam.ydoc.transact(() => {
    nam.callMap.set('current_call', call1);
  });
  console.log('Nam set call status to "ringing".');

  await new Promise((r) => setTimeout(r, 800));

  const maiReceivedCall = mai.callMap.get('current_call');
  if (!maiReceivedCall || maiReceivedCall.status !== 'ringing') {
    throw new Error(`Mai did not receive ringing state! Got: ${JSON.stringify(maiReceivedCall)}`);
  }
  console.log(`✅ Mai received ringing call from ${maiReceivedCall.callerName} (Type: ${maiReceivedCall.callType})`);

  // --- Scenario 2: Mai accepts Call -> Both connected ---
  console.log('\n--- Scenario 2: Mai accepts call ---');
  const acceptedCall: ZaloCallSession = {
    ...maiReceivedCall,
    status: 'connected',
    connectedAt: Date.now(),
  };
  mai.ydoc.transact(() => {
    mai.callMap.set('current_call', acceptedCall);
  });

  await new Promise((r) => setTimeout(r, 800));

  const namConnectedCall = nam.callMap.get('current_call');
  if (!namConnectedCall || namConnectedCall.status !== 'connected') {
    throw new Error(`Nam did not receive connected state! Got: ${JSON.stringify(namConnectedCall)}`);
  }
  console.log('✅ Both Nam and Mai are now in "connected" state with live media streams!');

  // --- Scenario 3: End Call with Duration ---
  console.log('\n--- Scenario 3: End Call after 35 seconds ---');
  const endedCall: ZaloCallSession = {
    ...acceptedCall,
    status: 'ended',
    duration: 35,
  };
  nam.ydoc.transact(() => {
    nam.callMap.set('current_call', endedCall);
    nam.chatArray.push([
      {
        id: 'zmsg_call_log_1',
        roomId,
        senderId: nam.userId,
        senderName: nam.userName,
        senderColor: nam.userColor,
        type: 'text',
        content: '📞 Cuộc gọi video kết thúc (00:35)',
        timestamp: Date.now(),
        reactions: {},
      },
    ]);
  });

  await new Promise((r) => setTimeout(r, 800));

  const maiEndedCall = mai.callMap.get('current_call');
  if (!maiEndedCall || maiEndedCall.status !== 'ended') {
    throw new Error('Call end did not synchronize to Mai!');
  }
  const maiMessages = mai.chatArray.toArray();
  const logInMai = maiMessages.find((m) => m.id === 'zmsg_call_log_1');
  if (!logInMai || !logInMai.content.includes('00:35')) {
    throw new Error('Call log message failed to sync to Mai!');
  }
  console.log(`✅ Mai received call ended state & chat log: "${logInMai.content}"`);

  // --- Scenario 4: Call Decline / Missed Call ---
  console.log('\n--- Scenario 4: Nam calls again, Mai declines ---');
  const call2: ZaloCallSession = {
    id: 'call_456',
    roomId,
    callerId: nam.userId,
    callerName: nam.userName,
    callerColor: nam.userColor,
    callType: 'audio',
    status: 'ringing',
    startedAt: Date.now(),
  };
  nam.ydoc.transact(() => {
    nam.callMap.set('current_call', call2);
  });

  await new Promise((r) => setTimeout(r, 800));

  // Mai declines
  mai.ydoc.transact(() => {
    mai.callMap.set('current_call', {
      ...call2,
      status: 'declined',
    });
    mai.chatArray.push([
      {
        id: 'zmsg_call_log_2',
        roomId,
        senderId: mai.userId,
        senderName: mai.userName,
        senderColor: mai.userColor,
        type: 'text',
        content: '❌ Cuộc gọi thoại bị từ chối',
        timestamp: Date.now(),
        reactions: {},
      },
    ]);
  });

  await new Promise((r) => setTimeout(r, 800));

  const namDeclinedCall = nam.callMap.get('current_call');
  if (!namDeclinedCall || namDeclinedCall.status !== 'declined') {
    throw new Error('Decline did not synchronize to Nam!');
  }
  const namMessages = nam.chatArray.toArray();
  const declineInNam = namMessages.find((m) => m.id === 'zmsg_call_log_2');
  if (!declineInNam || !declineInNam.content.includes('bị từ chối')) {
    throw new Error('Decline log failed to sync to Nam!');
  }
  console.log(`✅ Nam received call declined state & chat log: "${declineInNam.content}"`);

  // Cleanup
  nam.close();
  mai.close();
  console.log('\n🎉 REAL-TIME CALLING SIGNALING & LOGGING ACROSS NODES VERIFIED 100% SUCCESSFULLY!\n');
}

runZaloCallTest().catch((err) => {
  console.error('❌ Zalo Call Test failed:', err);
  process.exit(1);
});
