import { z } from 'zod';

// `method` is a lookup key into project_config, not a table/column name,
// so we only bound its length/charset — the actual SQL template it maps to
// is server-trusted (see api/src/repository/dynamic.repository.ts).
const methodField = z.string().trim().min(1, 'Method is required').max(150);

export const commonGetSchema = z.object({
  method: methodField,
  params: z.record(z.string(), z.unknown()).optional(),
  page: z.union([z.number(), z.string()]).optional(),
  limit: z.union([z.number(), z.string()]).optional(),
  search: z.string().max(500).optional(),
  status: z.string().max(50).optional(),
}).passthrough();

export const commonPostSchema = z.object({
  method: methodField,
  params: z.record(z.string(), z.unknown()).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const commonPutSchema = commonPostSchema;

export const commonDeleteSchema = z.object({
  method: methodField,
  params: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const executeMethodSchema = commonDeleteSchema;
