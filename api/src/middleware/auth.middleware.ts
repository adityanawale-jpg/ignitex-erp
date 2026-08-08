import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { executeQuerySingle } from '../database/connection';
import { sendUnauthorized } from '../utils/response';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
  };
}

interface TokenPayload {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  iat: number;
  exp: number;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

export const validateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const token =
      (body?.token as string) ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers['x-auth-token'];

    if (!token) {
      sendUnauthorized(res, 'Authentication token required');
      return;
    }

    const decoded = jwt.verify(token as string, getJwtSecret()) as TokenPayload;

    const user = await executeQuerySingle<{
      user_id: number;
      jwt_token: string;
      jwt_token_update: Date;
      user_status: boolean;
    }>(
      'SELECT user_id, jwt_token, jwt_token_update, user_status FROM user_master WHERE user_id = $1 AND jwt_token = $2',
      [decoded.id, token]
    );

    if (!user) {
      sendUnauthorized(res, 'Token has been invalidated. Please login again.');
      return;
    }

    if (!user.user_status) {
      sendUnauthorized(res, 'Your account has been deactivated');
      return;
    }

    if (new Date() > new Date(user.jwt_token_update)) {
      sendUnauthorized(res, 'Session expired. Please login again.');
      return;
    }

    req.user = {
      id: decoded.id,
      employee_id: decoded.employee_id,
      first_name: decoded.first_name,
      last_name: decoded.last_name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, 'Token expired. Please login again.');
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendUnauthorized(res, 'Invalid token');
    } else {
      logger.error('Token validation error:', error);
      sendUnauthorized(res, 'Authentication failed');
    }
  }
};

export const generateToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
};
