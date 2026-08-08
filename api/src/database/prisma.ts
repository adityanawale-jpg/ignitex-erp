import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Shared Prisma Client singleton. This Prisma version's client generator
 * (provider = "prisma-client") requires an explicit driver adapter rather
 * than a plain connection URL. Built from the same discrete DB_* vars the
 * raw pg pool in connection.ts uses — NOT from DATABASE_URL, which (at
 * least in local dev) points at a different database than DB_HOST does.
 */
const adapter = new PrismaPg({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jewel_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
export const prisma = new PrismaClient({ adapter });

export default prisma;
