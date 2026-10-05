import { createApp } from './server.js';
import { config } from './config.js';
import { RedisPool } from './redis/redis-client.js';
import { getPrismaClient } from './storage/db.js';

async function main() {
  const { httpServer, gateway } = await createApp();

  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(
      `[Gateway Node ${config.nodeId}] Listening on 0.0.0.0:${config.port} (HTTP & WebSocket)`
    );
  });

  const shutdown = async (signal: string) => {
    console.log(`[Gateway Node ${config.nodeId}] Received ${signal}. Initiating graceful shutdown...`);

    try {
      await gateway.shutdown();
      await RedisPool.getInstance().disconnect();
      await getPrismaClient().$disconnect();
      httpServer.close(() => {
        console.log(`[Gateway Node ${config.nodeId}] Server closed cleanly.`);
        process.exit(0);
      });
    } catch (err) {
      console.error(`[Gateway Node ${config.nodeId}] Error during shutdown:`, err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[Main] Fatal bootstrap error:', err);
  process.exit(1);
});
