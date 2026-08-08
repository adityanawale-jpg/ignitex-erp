import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import dotenv from 'dotenv';
import path from 'path';

import { testConnection } from './database/connection';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes/index';
import { logger } from './utils/logger';
import { withRetry } from './utils/retry';
import { redis } from './utils/redisClient';
import { startDailyRateScheduler } from './services/dailyRateScheduler';

// Load environment variables
dotenv.config();

// Fail fast on startup if required secrets are missing, rather than
// silently signing/verifying JWTs with a known fallback value.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

const app: Application = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// Rate limiting — completely skipped in development (StrictMode + HMR generate many calls)
const isDev = process.env.NODE_ENV !== 'production'
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '2000'),
  skip: () => isDev,  // bypass entirely in development
  standardHeaders: true,
  legacyHeaders: false,
  // If the Redis store errors (outage), let the request through unlimited
  // rather than 500ing every request — rate limiting is a safety net, it
  // shouldn't itself become an outage.
  passOnStoreError: true,
  // Redis-backed store so limits survive container restarts and are shared
  // across replicas; falls back to express-rate-limit's default in-memory
  // store when Redis isn't configured (e.g. plain local dev).
  store: (() => {
    const client = redis;
    if (!client) return undefined;
    return new RedisStore({
      // ioredis's .call() resolves to Promise<unknown>; rate-limit-redis's
      // SendCommandFn wants Promise<RedisReply>. Always a plain reply here
      // (INCR/EXPIRE/etc.), so the cast is safe.
      sendCommand: (...args: string[]) => client.call(args[0], args.slice(1)) as any,
    });
  })(),
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logger.warn(`Rate limit exceeded: ${req.method} ${req.path} from ${ip}`);

    // Log to system_error_log asynchronously (non-blocking)
    import('./database/connection').then(({ executeQuery }) => {
      executeQuery(
        `INSERT INTO system_error_log (severity, error_type, message, request_path, request_method, ip_address, created_at)
         VALUES ('WARNING', 'RATE_LIMIT', 'Too many requests — rate limit exceeded', $1, $2, $3, NOW())`,
        [req.path, req.method, ip],
      ).catch(() => { /* ignore log failures */ });
    });

    res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
  },
});
app.use('/api', limiter);

// ============================================================
// CORE MIDDLEWARE
// ============================================================
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-auth-token'],
}));

app.use(compression());
// Document/media uploads (CAD/drawing/tech-doc up to 25MB, video up to 50MB)
// need a bigger body limit than the rest of the API. A path-scoped parser
// registered ahead of the generic one below claims the body first — the
// generic express.json() sees req._body already set and skips re-parsing,
// so every other route keeps the smaller 10mb ceiling.
app.use(`/api/${API_VERSION}/masters/document-upload`, express.json({ limit: '70mb' }));
app.use(`/api/${API_VERSION}/masters/item-media`, express.json({ limit: '70mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (profile photos, etc.)
// Cross-Origin-Resource-Policy must be 'cross-origin' so browsers allow img tags on port 80
// to load files served from port 5000 (Helmet defaults to same-origin which blocks this).
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use(requestLogger);

// ============================================================
// API ROUTES
// ============================================================
app.use(`/api/${API_VERSION}`, routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'IgniteX.ai ERP API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================
// SERVER STARTUP
// ============================================================
const startServer = async (): Promise<void> => {
  try {
    // Test database connection — retried with backoff since in Docker Compose
    // the API container can start before Postgres is ready to accept
    // connections yet; a single failed attempt shouldn't be fatal.
    await withRetry(testConnection, {
      retries: 5,
      delaysMs: [1000, 2000, 4000, 8000, 16000],
      label: 'Database connection at startup',
    });

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('╔════════════════════════════════════════╗');
      logger.info('║     IGNITEX.AI ERP API SERVER          ║');
      logger.info('╚════════════════════════════════════════╝');
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

      // Daily Rate auto update. Safe to start on every instance — the run is
      // claimed with a conditional UPDATE, so only one of them does the work.
      startDailyRateScheduler();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections — log but do NOT kill the server
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;
