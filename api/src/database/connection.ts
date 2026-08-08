import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Connection Pool Configuration
 */
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jewel_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Test database connectivity
 */
export const testConnection = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connected successfully');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(',')[0]}`);
  } finally {
    client.release();
  }
};

/**
 * Execute a parameterized query
 */
export const executeQuery = async <T = Record<string, unknown>>(
  query: string,
  params?: unknown[]
): Promise<T[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
};

/**
 * Execute a single row query
 */
export const executeQuerySingle = async <T = Record<string, unknown>>(
  query: string,
  params?: unknown[]
): Promise<T | null> => {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Execute query with transaction support
 */
export const executeTransaction = async <T>(
  callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
