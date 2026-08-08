import { logger } from './logger';

export interface RetryOptions {
  retries: number;
  delaysMs: number[];
  label: string;
}

/**
 * Retries a transient operation (SMTP send, DB connection at startup) with
 * exponential backoff. Retries `options.retries` additional times beyond the
 * initial attempt, waiting `options.delaysMs[attempt]` between each — the
 * last entry in delaysMs is reused if there are more retries than delays.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === options.retries) break;
      const delay = options.delaysMs[attempt] ?? options.delaysMs[options.delaysMs.length - 1];
      logger.warn(
        `${options.label}: attempt ${attempt + 1}/${options.retries + 1} failed, retrying in ${delay}ms — ${(error as Error).message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
