import { executeQuerySingle, executeQuery } from '../database/connection';
import { prepareQuery } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Dynamic Query Repository
 * Fetches query templates from project_config and executes them with parameters
 */

interface ConfigQuery {
  id: number;
  key_code: string;
  key_value: string;
  config_type: string;
}

/**
 * Get query from project_config table
 */
export const getConfigQuery = async (keyCode: string): Promise<ConfigQuery | null> => {
  return executeQuerySingle<ConfigQuery>(
    'SELECT id, key_code, key_value, config_type FROM project_config WHERE key_code = $1 AND is_active = TRUE',
    [keyCode]
  );
};

/**
 * Execute dynamic query by key_code
 */
export const executeDynamicQuery = async <T = Record<string, unknown>>(
  keyCode: string,
  params: Record<string, { type: string; value: unknown } | unknown> = {}
): Promise<{ rows: T[]; rowCount: number }> => {
  try {
    // Fetch query template from config
    const config = await getConfigQuery(keyCode);

    if (!config) {
      throw new Error(`Query configuration not found for key: ${keyCode}`);
    }

    logger.debug(`Executing dynamic query: ${keyCode}`, { params });

    // Prepare parameterized query (prevents SQL injection)
    const { text, values } = prepareQuery(config.key_value, params);

    logger.debug(`Prepared query: ${text}`, { values });

    // Execute query
    const rows = await executeQuery<T>(text, values);

    return { rows, rowCount: rows.length };
  } catch (error) {
    logger.error(`Dynamic query execution failed for key: ${keyCode}`, { error, params });
    throw error;
  }
};

/**
 * Execute dynamic single row query
 */
export const executeDynamicQuerySingle = async <T = Record<string, unknown>>(
  keyCode: string,
  params: Record<string, { type: string; value: unknown } | unknown> = {}
): Promise<T | null> => {
  const { rows } = await executeDynamicQuery<T>(keyCode, params);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Direct query execution (for internal use, not exposed via API)
 */
export const executeDirectQuery = async <T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> => {
  return executeQuery<T>(query, params);
};
