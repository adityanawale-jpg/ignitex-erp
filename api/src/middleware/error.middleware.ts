import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * HTTP Request Logger Middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log request
  logger.info(`→ ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 100),
  });

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: unknown, ...args: unknown[]) {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`← ${req.method} ${req.path} ${res.statusCode} [${duration}ms]`);

    return (originalEnd as Function)(chunk, ...args);
  };

  next();
};

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.status || err.statusCode || 500;

  logger.error(`Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    meta: { timestamp: new Date().toISOString() },
  });
};
