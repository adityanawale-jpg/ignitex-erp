import { Router } from 'express';
import { getStockBalance, getStockLedger } from '../controllers/stock.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
// Both endpoints are read-only views onto the same On Hand Stock screen —
// stock_ledger / stock_balance have no CRUD of their own, only postings from
// the modules that move stock (Metal Receipt today).
const MENU = 'IM_ON_HAND';

router.get('/balance', validateToken, requirePermission(MENU, 'view'), getStockBalance);
router.get('/ledger',  validateToken, requirePermission(MENU, 'view'), getStockLedger);

export default router;
