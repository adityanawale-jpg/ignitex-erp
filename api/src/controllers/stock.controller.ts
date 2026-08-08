import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

// ── GET /stock/balance ────────────────────────────────────────────
// On Hand Stock. Reads stock_balance directly rather than summing
// stock_ledger on the fly — that sum is exactly what postStockMovement()
// (stock.service.ts) keeps this table caching, in the same transaction as
// every ledger insert.
export const getStockBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const search = ((req.query.search as string) || '').trim();
    const subInv = ((req.query.sub_inv_code as string) || '').trim();
    // Zero-balance rows are the tail of every issued-out lot; hidden by
    // default so the screen reads as "what's actually on hand".
    const includeZero = req.query.include_zero === 'true';

    const AND: Prisma.stock_balanceWhereInput[] = [];
    if (subInv) AND.push({ sub_inv_code: subInv });
    if (!includeZero) AND.push({ quantity: { not: 0 } });
    if (search) {
      AND.push({
        OR: [
          { sku_code: { contains: search, mode: 'insensitive' } },
          { uid:      { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.stock_balanceWhereInput = AND.length ? { AND } : {};

    const [total, rows] = await Promise.all([
      prisma.stock_balance.count({ where }),
      prisma.stock_balance.findMany({
        where,
        orderBy: [{ sub_inv_code: 'asc' }, { sku_code: 'asc' }],
        skip: offset,
        take: limit,
      }),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, rows, 'Stock balance fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch stock balance', 500, (error as Error).message);
  }
};

// ── GET /stock/ledger ─────────────────────────────────────────────
// Movement history behind a balance — the drill-down from On Hand Stock, and
// the audit trail for "why does this position say what it says".
export const getStockLedger = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const skuCode = ((req.query.sku_code as string) || '').trim();
    const subInv  = ((req.query.sub_inv_code as string) || '').trim();
    const uid     = (req.query.uid as string) ?? undefined;

    const AND: Prisma.stock_ledgerWhereInput[] = [];
    if (skuCode) AND.push({ sku_code: skuCode });
    if (subInv)  AND.push({ sub_inv_code: subInv });
    if (uid !== undefined) AND.push({ uid: uid.trim() || null });
    const where: Prisma.stock_ledgerWhereInput = AND.length ? { AND } : {};

    const [total, rows] = await Promise.all([
      prisma.stock_ledger.count({ where }),
      prisma.stock_ledger.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, rows, 'Stock ledger fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch stock ledger', 500, (error as Error).message);
  }
};
