import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
      log: ['error', 'warn'],
    });
  }
  return prismaInstance;
}
