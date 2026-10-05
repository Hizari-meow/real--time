import { Redis } from 'ioredis';
import { config } from '../config.js';

export class RedisPool {
  private static instance: RedisPool;
  public readonly publisher: Redis;
  public readonly subscriber: Redis;

  private constructor() {
    this.publisher = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    this.subscriber = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    this.publisher.on('error', (err) => {
      console.error(`[Redis Publisher][${config.nodeId}] Error:`, err);
    });

    this.subscriber.on('error', (err) => {
      console.error(`[Redis Subscriber][${config.nodeId}] Error:`, err);
    });

    this.publisher.on('connect', () => {
      console.log(`[Redis Publisher][${config.nodeId}] Connected successfully.`);
    });

    this.subscriber.on('connect', () => {
      console.log(`[Redis Subscriber][${config.nodeId}] Connected successfully.`);
    });
  }

  public static getInstance(): RedisPool {
    if (!RedisPool.instance) {
      RedisPool.instance = new RedisPool();
    }
    return RedisPool.instance;
  }

  public async disconnect(): Promise<void> {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }
}
