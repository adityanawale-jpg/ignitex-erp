import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { sendValidationError } from '../utils/response';

/**
 * Validates req.body against a Zod schema. On success, replaces req.body
 * with the parsed (and type-coerced/defaulted) result. On failure, responds
 * 422 with a readable summary of the first issue instead of reaching the DB.
 */
export const validate = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const first = result.error.issues[0];
      const path = first.path.join('.');
      const message = path ? `${path}: ${first.message}` : first.message;
      sendValidationError(res, message);
      return;
    }

    req.body = result.data;
    next();
  };
};
