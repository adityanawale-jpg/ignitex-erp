import { Response } from 'express';
import { executeDynamicQuery, getConfigQuery } from '../repository/dynamic.repository';
import { executeQuery, executeQuerySingle } from '../database/connection';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

/**
 * Common API Request Interface
 */
interface CommonApiRequest {
  token: string;
  method: string;
  params?: Record<string, { type: string; value: unknown } | unknown>;
  body?: Record<string, unknown>;
  order?: string;
  limit?: number;
  offset?: number;
}

/**
 * POST /api/v1/common/get
 * Common dynamic GET/SELECT API
 * Supports optional server-side pagination when page / limit are present in the body.
 * Pagination params: page, limit, search, status
 * When page/limit are supplied the controller will automatically look for a companion
 * count query named  <method>_count  (e.g. fg_item_list_get_count) and run both in
 * parallel so the response meta contains { total, page, limit, total_pages }.
 */
export const commonGet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      method,
      params = {},
      page:   pageRaw,
      limit:  limitRaw,
      search,
      status,
    } = req.body as CommonApiRequest & {
      page?: number; limit?: number; search?: string; status?: string;
    };

    if (!method) {
      sendValidationError(res, 'Method is required');
      return;
    }

    logger.debug(`Common GET - method: ${method}`, { params });

    // ── Paginated mode ────────────────────────────────────────────
    if (pageRaw !== undefined || limitRaw !== undefined) {
      const page   = Math.max(1, Number(pageRaw) || 1);
      const limit  = Math.min(500, Math.max(1, Number(limitRaw) || 10));
      const offset = (page - 1) * limit;

      const queryParams = {
        ...params,
        search: search ?? null,
        status: status ?? 'active',
        limit,
        offset,
      };
      const countParams = {
        ...params,
        search: search ?? null,
        status: status ?? 'active',
      };

      const countKey = `${method}_count`;
      const [dataResult, countConfig] = await Promise.all([
        executeDynamicQuery(method, queryParams),
        getConfigQuery(countKey),
      ]);

      let total = dataResult.rowCount;
      if (countConfig) {
        const countRows = await executeDynamicQuery<{ total: number }>(countKey, countParams);
        total = Number(countRows.rows[0]?.total ?? dataResult.rowCount);
      }

      const total_pages = Math.ceil(total / limit);
      sendSuccess(res, dataResult.rows, 'Data fetched successfully', 200, { total, page, limit, total_pages });
      return;
    }

    // ── Standard (non-paginated) mode — backward compatible ───────
    const { rows, rowCount } = await executeDynamicQuery(method, params);
    sendSuccess(res, rows, 'Data fetched successfully', 200, { total: rowCount });
  } catch (error) {
    const err = error as Error;
    logger.error(`Common GET error: ${err.message}`, { body: req.body });

    if (err.message.includes('not found')) {
      sendError(res, `API method not configured: ${(req.body as CommonApiRequest).method}`, 404);
    } else {
      sendError(res, 'Failed to fetch data', 500, err.message);
    }
  }
};

/**
 * POST /api/v1/common/post
 * Common dynamic POST/INSERT API
 */
export const commonPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { method, params = {}, body = {} } = req.body as CommonApiRequest & { body: Record<string, unknown> };

    if (!method) {
      sendValidationError(res, 'Method is required');
      return;
    }

    logger.debug(`Common POST - method: ${method}`, { params, body });

    // Execute configured query. 201 only when a row actually came back —
    // a configured method that inserts nothing (e.g. ON CONFLICT DO NOTHING)
    // shouldn't report "created" for a record that wasn't.
    const { rows } = await executeDynamicQuery(method, { ...params, ...body });

    sendSuccess(res, rows, rows.length > 0 ? 'Record created successfully' : 'No record created', rows.length > 0 ? 201 : 200);
  } catch (error) {
    const err = error as Error;
    logger.error(`Common POST error: ${err.message}`);
    sendError(res, 'Failed to create record', 500, err.message);
  }
};

/**
 * PUT /api/v1/common/put
 * Common dynamic PUT/UPDATE API
 */
export const commonPut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { method, params = {}, body = {} } = req.body as CommonApiRequest & { body: Record<string, unknown> };

    if (!method) {
      sendValidationError(res, 'Method is required');
      return;
    }

    logger.debug(`Common PUT - method: ${method}`, { params, body });

    const { rows } = await executeDynamicQuery(method, { ...params, ...body });

    sendSuccess(res, rows, 'Record updated successfully');
  } catch (error) {
    const err = error as Error;
    logger.error(`Common PUT error: ${err.message}`);
    sendError(res, 'Failed to update record', 500, err.message);
  }
};

/**
 * DELETE /api/v1/common/delete
 * Common dynamic DELETE API (soft delete)
 */
export const commonDelete = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { method, params = {} } = req.body as CommonApiRequest;
    const id = req.params.id;

    if (!method) {
      sendValidationError(res, 'Method is required');
      return;
    }

    logger.debug(`Common DELETE - method: ${method}, id: ${id}`);

    const { rows } = await executeDynamicQuery(method, { ...params, id: id ?? params.id });

    sendSuccess(res, rows, 'Record deleted successfully');
  } catch (error) {
    const err = error as Error;
    logger.error(`Common DELETE error: ${err.message}`);
    sendError(res, 'Failed to delete record', 500, err.message);
  }
};

/**
 * POST /api/v1/common/execute
 * Universal execution endpoint for configured API methods
 */
export const executeMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { method, params = {} } = req.body as CommonApiRequest;

    if (!method) {
      sendValidationError(res, 'Method is required');
      return;
    }

    const { rows, rowCount } = await executeDynamicQuery(method, params);

    sendSuccess(res, rows, 'Executed successfully', 200, { total: rowCount });
  } catch (error) {
    const err = error as Error;
    logger.error(`Execute method error: ${err.message}`);
    sendError(res, `Execution failed: ${err.message}`, 500);
  }
};

/**
 * GET /api/v1/common/lookup/:type
 * Get lookup values by type
 */
export const getLookup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;

    // display_order alone is not a total order — types with tied (or unset)
    // display_order values would come back in arbitrary, run-to-run unstable
    // order. lookup_name breaks the tie, matching getLookupLOV in
    // lookup.controller so both endpoints order a given type identically.
    const rows = await executeQuery(
      'SELECT id, lookup_code, lookup_name, lookup_value, display_order FROM master_lookup WHERE lookup_type = $1 AND is_active = TRUE ORDER BY display_order NULLS LAST, lookup_name',
      [type]
    );

    sendSuccess(res, rows, 'Lookup data fetched');
  } catch (error) {
    const err = error as Error;
    sendError(res, 'Failed to fetch lookup data', 500, err.message);
  }
};

/**
 * GET /api/v1/common/dashboard-stats
 * Get dashboard statistics
 */
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await executeQuerySingle<{
      total_suppliers: number;
      total_customers: number;
      total_fg_items: number;
      total_designs: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM supplier_master WHERE is_active = TRUE) as total_suppliers,
        (SELECT COUNT(*) FROM customer_master WHERE is_active = TRUE) as total_customers,
        (SELECT COUNT(*) FROM item_master WHERE is_active = TRUE) as total_fg_items,
        (SELECT COUNT(*) FROM design_master WHERE is_active = TRUE) as total_designs`
    );

    // Metal rate strip. Omitted entirely when no rate sheet exists yet — the
    // dashboard merges this response over its placeholder data, so sending a
    // null would blank the strip rather than leave the placeholder showing.
    const metalRates = await getDashboardMetalRates();

    sendSuccess(res, {
      stats,
      monthlySales: [],
      recentOrders: [],
      ...(metalRates && { metalRates }),
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Dashboard stats error:', err.message);
    sendError(res, 'Failed to fetch dashboard data', 500, err.message);
  }
};

/**
 * Latest Daily Rate sheet, shaped for the dashboard's metal strip.
 * Returns null when the master is still empty.
 */
const getDashboardMetalRates = async (): Promise<Record<string, unknown> | null> => {
  try {
    const rows = await executeQuery<{
      metal_type:    string;
      purity:        string;
      rate_per_gram: string;
      change_pct:    string | null;
      rate_date:     string;
    }>(
      `SELECT l.metal_type, l.purity, l.rate_per_gram, l.change_pct,
              to_char(h.rate_date, 'YYYY-MM-DD') AS rate_date
       FROM   daily_rate_line l
       JOIN   daily_rate_hdr  h ON h.id = l.hdr_id
       WHERE  h.is_active = TRUE
         AND  h.rate_date = (SELECT MAX(rate_date) FROM daily_rate_hdr WHERE is_active = TRUE)
       ORDER  BY l.line_no`
    );

    if (!rows.length) return null;

    const find = (metal: string, purity: string) =>
      rows.find(r => r.metal_type === metal && r.purity === purity);

    // The strip's four fixed slots. A metal the master doesn't carry stays at
    // 0 rather than disappearing, so the strip keeps its shape.
    const slot = (metal: string, purity: string) => {
      const r = find(metal, purity);
      return {
        rate:   r ? Number(r.rate_per_gram) : 0,
        change: r && r.change_pct !== null ? Number(r.change_pct) : 0,
      };
    };

    const gold24 = slot('GO', '999');
    const gold22 = slot('GO', '916');
    const silver = slot('SI', '999');
    const plat   = slot('PL', '950');

    return {
      rate_date:        rows[0].rate_date,
      gold_24k:         gold24.rate,
      gold_24k_change:  gold24.change,
      gold_22k:         gold22.rate,
      gold_22k_change:  gold22.change,
      silver_999:       silver.rate,
      silver_change:    silver.change,
      platinum_950:     plat.rate,
      platinum_change:  plat.change,
    };
  } catch (error) {
    // The rate strip is decoration on an otherwise useful dashboard; a failure
    // here should not take the whole page's data down with it.
    logger.warn('Dashboard metal rates unavailable:', (error as Error).message);
    return null;
  }
};
