import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    total?:       number;
    page?:        number;
    limit?:       number;
    total_pages?: number;
    timestamp?:   string;
    [key: string]: unknown;
  };
}

/**
 * Prisma's raw query methods ($queryRaw/$queryRawUnsafe) deserialize
 * PostgreSQL bigint/COUNT(*) columns as native JS BigInt (JSON.stringify
 * can't serialize those) and numeric/decimal columns as Prisma.Decimal
 * instances (JSON.stringify would otherwise dump their internal
 * {s,e,d} representation instead of the number). The raw `pg` pool this
 * app used previously returned both as plain strings, so no controller
 * ever had to think about it — this closes that gap in one place
 * instead of at every call site.
 */
const sanitizeBigInt = <T>(value: T): T => {
  if (typeof value === 'bigint') return Number(value) as unknown as T;
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) return value.toString() as unknown as T;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(sanitizeBigInt) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = sanitizeBigInt(v);
    return out as T;
  }
  return value;
};

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Data fetched successfully',
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data: sanitizeBigInt(data),
    meta: {
      timestamp: new Date().toISOString(),
      ...sanitizeBigInt(meta ?? {}),
    },
  };
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  error?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(response);
};

/**
 * Send unauthorized response
 */
export const sendUnauthorized = (res: Response, message = 'Unauthorized access'): Response => {
  return sendError(res, message, 401);
};

/**
 * Send forbidden response
 */
export const sendForbidden = (res: Response, message = 'Access forbidden'): Response => {
  return sendError(res, message, 403);
};

/**
 * Send not found response
 */
export const sendNotFound = (res: Response, message = 'Resource not found'): Response => {
  return sendError(res, message, 404);
};

/**
 * Send validation error response
 */
export const sendValidationError = (res: Response, message: string): Response => {
  return sendError(res, message, 422);
};

/**
 * Sanitize SQL parameters to prevent injection
 */
export const sanitizeParam = (value: unknown, type: string): unknown => {
  if (value === null || value === undefined) return null;

  switch (type.toLowerCase()) {
    case 'str':
      // No character stripping: prepareQuery() always binds this through
      // pg's parameterized query protocol ($1, $2, ...), which is already
      // injection-safe regardless of what the value contains. Blocklisting
      // '";-/* here doesn't add protection — it silently corrupts any
      // legitimate value that contains them (hyphenated employee/doc codes
      // like RC-001, PO-000001; names with apostrophes; etc).
      return String(value);
    case 'int':
      const intVal = parseInt(String(value));
      return isNaN(intVal) ? 0 : intVal;
    case 'dbl':
      const dblVal = parseFloat(String(value));
      return isNaN(dblVal) ? 0 : dblVal;
    case 'bool':
      return Boolean(value);
    case 'dat':
      const date = new Date(String(value));
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    case 'tim':
      return String(value).replace(/[^0-9:]/g, '');
    default:
      return String(value);
  }
};

/**
 * Replace named parameters in query with positional parameters
 * Converts :paramname to $1, $2, etc.
 */
export const prepareQuery = (
  query: string,
  params: Record<string, { type: string; value: unknown } | unknown>
): { text: string; values: unknown[] } => {
  const values: unknown[] = [];
  let paramIndex = 1;

  const text = query.replace(/(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
    const param = params[paramName];
    let value: unknown;

    if (param && typeof param === 'object' && 'type' in (param as object) && 'value' in (param as object)) {
      const typedParam = param as { type: string; value: unknown };
      value = sanitizeParam(typedParam.value, typedParam.type);
    } else {
      value = param;
    }

    values.push(value);
    return `$${paramIndex++}`;
  });

  return { text, values };
};

/**
 * Generate unique order/document number
 */
export const generateDocumentNo = (prefix: string): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}${month}${day}-${random}`;
};
