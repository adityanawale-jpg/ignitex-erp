import { Router } from 'express';
import {
  getCustomerPriceMetals, getCustomerPriceMetalStats, getCustomerPriceMetalById,
  createCustomerPriceMetal, updateCustomerPriceMetal, toggleCustomerPriceMetalStatus,
  importCustomerPriceMetal,
  getCustomerPriceStones, getCustomerPriceStoneStats, getCustomerPriceStoneById,
  createCustomerPriceStone, updateCustomerPriceStone, toggleCustomerPriceStoneStatus,
  importCustomerPriceStone,
} from '../controllers/customerPriceMaster.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_CUST_PRICE';

// ── Metal tab ────────────────────────────────────────────────
router.get('/metal',         validateToken, requirePermission(MENU, 'view'),   getCustomerPriceMetals);
// Must stay above '/metal/:id' so 'stats' is never parsed as an id
router.get('/metal/stats',   validateToken, requirePermission(MENU, 'view'),   getCustomerPriceMetalStats);
router.get('/metal/:id',     validateToken, requirePermission(MENU, 'view'),   getCustomerPriceMetalById);
router.post('/metal',        validateToken, requirePermission(MENU, 'create'), createCustomerPriceMetal);
router.post('/metal/import', validateToken, requirePermission(MENU, 'create'), importCustomerPriceMetal);
router.put('/metal/:id',     validateToken, requirePermission(MENU, 'update'), updateCustomerPriceMetal);
router.delete('/metal/:id',  validateToken, requirePermission(MENU, 'delete'), toggleCustomerPriceMetalStatus);

// ── Stone tab ────────────────────────────────────────────────
router.get('/stone',         validateToken, requirePermission(MENU, 'view'),   getCustomerPriceStones);
// Must stay above '/stone/:id' so 'stats' is never parsed as an id
router.get('/stone/stats',   validateToken, requirePermission(MENU, 'view'),   getCustomerPriceStoneStats);
router.get('/stone/:id',     validateToken, requirePermission(MENU, 'view'),   getCustomerPriceStoneById);
router.post('/stone',        validateToken, requirePermission(MENU, 'create'), createCustomerPriceStone);
router.post('/stone/import', validateToken, requirePermission(MENU, 'create'), importCustomerPriceStone);
router.put('/stone/:id',     validateToken, requirePermission(MENU, 'update'), updateCustomerPriceStone);
router.delete('/stone/:id',  validateToken, requirePermission(MENU, 'delete'), toggleCustomerPriceStoneStatus);

export default router;
