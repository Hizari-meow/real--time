import test from 'node:test';
import assert from 'node:assert';
import { Redis } from 'ioredis';
import {
  RedisInterNodeMessage,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '@collab/shared';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

test('Redis Backplane: Cross-node message routing and loop prevention', async (t) => {
  // Simulate Node 1
  const node1Id = 'node_test_1';
  const node1Pub = new Redis(REDIS_URL);
  const node1Sub = new Redis(REDIS_URL);

  // Simulate Node 2
  const node2Id = 'node_test_2';
  const node2Pub = new Redis(REDIS_URL);
  const node2Sub = new Redis(REDIS_URL);

  const testDocId = `test_doc_${Date.now()}`;
  const channel = `room:doc:${testDocId}`;

  const node1Received: any[] = [];
  const node2Received: any[] = [];

  // Node 1 listener
  node1Sub.on('message', (ch, msg) => {
    if (ch === channel) {
      const parsed: RedisInterNodeMessage = JSON.parse(msg);
      // Loop prevention check: if originated by node1, ignore
      if (parsed.nodeId === node1Id) {
        return;
      }
      node1Received.push(parsed);
    }
  });

  // Node 2 listener
  node2Sub.on('message', (ch, msg) => {
    if (ch === channel) {
      const parsed: RedisInterNodeMessage = JSON.parse(msg);
      // Loop prevention check: if originated by node2, ignore
      if (parsed.nodeId === node2Id) {
        return;
      }
      node2Received.push(parsed);
    }
  });

  await Promise.all([
    node1Sub.subscribe(channel),
    node2Sub.subscribe(channel),
  ]);

  // Give subscription a moment to propagate
  await new Promise((resolve) => setTimeout(resolve, 100));

  await t.test('Node 1 publishes binary mutation -> Node 2 receives, Node 1 does not echo', async () => {
    const rawBytes = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 64]);
    const payloadBase64 = uint8ArrayToBase64(rawBytes);

    const message: RedisInterNodeMessage = {
      nodeId: node1Id,
      documentId: testDocId,
      type: 'update',
      payloadBase64,
      timestamp: Date.now(),
    };

    await node1Pub.publish(channel, JSON.stringify(message));

    // Wait for dispatch
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Node 2 must receive it
    assert.strictEqual(node2Received.length, 1, 'Node 2 must receive exactly 1 message');
    assert.strictEqual(node2Received[0].type, 'update');
    const receivedBytes = base64ToUint8Array(node2Received[0].payloadBase64);
    assert.deepStrictEqual(receivedBytes, rawBytes, 'Node 2 received bytes must match sent bytes');

    // Node 1 must NOT receive its own message (Loop Prevention)
    assert.strictEqual(node1Received.length, 0, 'Node 1 must NOT receive its own message (loop prevention)');
  });

  await t.test('Node 2 publishes awareness frame -> Node 1 receives, Node 2 does not echo', async () => {
    const rawAwareness = new Uint8Array([10, 20, 30, 40]);
    const payloadBase64 = uint8ArrayToBase64(rawAwareness);

    const message: RedisInterNodeMessage = {
      nodeId: node2Id,
      documentId: testDocId,
      type: 'awareness',
      payloadBase64,
      timestamp: Date.now(),
    };

    await node2Pub.publish(channel, JSON.stringify(message));

    await new Promise((resolve) => setTimeout(resolve, 150));

    assert.strictEqual(node1Received.length, 1, 'Node 1 must receive exactly 1 message from Node 2');
    assert.strictEqual(node1Received[0].type, 'awareness');
    const receivedBytes = base64ToUint8Array(node1Received[0].payloadBase64);
    assert.deepStrictEqual(receivedBytes, rawAwareness);

    // Node 2 count should still be 1 (no self-echo)
    assert.strictEqual(node2Received.length, 1, 'Node 2 must NOT receive its own awareness frame');
  });

  await t.test('Lazy unsubscribe: Node 2 unsubscribes and ceases receiving messages', async () => {
    await node2Sub.unsubscribe(channel);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message: RedisInterNodeMessage = {
      nodeId: node1Id,
      documentId: testDocId,
      type: 'update',
      payloadBase64: uint8ArrayToBase64(new Uint8Array([99])),
      timestamp: Date.now(),
    };

    await node1Pub.publish(channel, JSON.stringify(message));
    await new Promise((resolve) => setTimeout(resolve, 150));

    assert.strictEqual(node2Received.length, 1, 'Node 2 should receive nothing after unsubscribe');
  });

  // Teardown connections
  await Promise.all([
    node1Pub.quit(),
    node1Sub.quit(),
    node2Pub.quit(),
    node2Sub.quit(),
  ]);
});
