import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer, Server } from 'node:http';
import { config } from './config.js';
import { WebSocketGateway } from './ws/gateway.js';
import { authRouter } from './routes/auth.js';
import { documentsRouter } from './routes/documents.js';
import { restoreRouter } from './routes/restore.js';
import { tasksRouter } from './routes/tasks.js';
import { filesRouter } from './routes/files.js';
import { auditRouter } from './routes/audit.js';
import { aiRouter } from './routes/ai.js';
import { automationsRouter } from './routes/automations.js';
import { membersRouter } from './routes/members.js';
import { notificationsRouter } from './routes/notifications.js';
import { chatRouter } from './routes/chat.js';
import { projectsRouter, sprintsRouter } from './routes/projects.js';
import { NotificationService } from './core/notification/NotificationService.js';
import { getOutboxRelay } from './core/events/event-system.js';
import { RoomManager } from './ws/room-manager.js';
import { S3StorageService } from './storage/s3-client.js';

export interface AppInstance {
  app: Express;
  httpServer: Server;
  gateway: WebSocketGateway;
}

export async function createApp(): Promise<AppInstance> {
  const app = express();

  // CORS Configuration: Must never use wildcard '*' when credentials mode is 'include'
  const defaultOrigins = [
    'http://localhost:3005',
    'http://127.0.0.1:3005',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const envOrigins = (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS)
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins = envOrigins && envOrigins.length > 0 ? envOrigins : defaultOrigins;

  const corsOptions: cors.CorsOptions = {
    origin: (requestOrigin, callback) => {
      // Allow non-browser requests (e.g. server-to-server, curl, tests)
      if (!requestOrigin) {
        return callback(null, true);
      }

      // Check explicit allowed origin list
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }

      // In non-production, permit any localhost or 127.0.0.1 port
      if (
        process.env.NODE_ENV !== 'production' &&
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
      ) {
        return callback(null, true);
      }

      // Reject unauthorized origins cleanly without crashing
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-workspace-id',
      'x-org-id',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    const roomManager = RoomManager.getInstance();
    res.json({
      status: 'healthy',
      nodeId: config.nodeId,
      port: config.port,
      activeRooms: roomManager.getActiveRoomCount(),
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/documents', restoreRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/automations', automationsRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/sprints', sprintsRouter);

  // Initialize unified Notification Service event handlers
  NotificationService.getInstance().registerEventHandlers();

  // Start background Outbox Relay for transactional domain events
  getOutboxRelay().start();

  // Create HTTP Server
  const httpServer = createServer(app);

  // Attach WebSocket Gateway
  const gateway = new WebSocketGateway(httpServer);

  // Ensure storage bucket is ready
  await S3StorageService.getInstance().ensureBucketExists();

  return { app, httpServer, gateway };
}
