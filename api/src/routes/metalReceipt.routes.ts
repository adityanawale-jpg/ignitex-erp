import { Router } from 'express';
import {
  getMetalReceipts, getMetalReceiptStats, getReceiptCustomerLOV, getReceiptItemLOV,
  getReceiptInventoryStructure, getMetalReceiptById,
  createMetalReceipt, updateMetalReceipt, submitMetalReceipt, cancelMetalReceipt,
} from '../controllers/metalReceipt.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'IM_METAL_RECEIPT';

router.get('/',      validateToken, requirePermission(MENU, 'view'), getMetalReceipts);
router.get('/stats', validateToken, requirePermission(MENU, 'view'), getMetalReceiptStats);

// Every literal path below must stay above '/:id', or 'lov' would be parsed as
// a receipt id.
router.get('/lov/customers',        validateToken, requirePermission(MENU, 'view'), getReceiptCustomerLOV);
router.get('/lov/items',            validateToken, requirePermission(MENU, 'view'), getReceiptItemLOV);
router.get('/inventory-structure',  validateToken, requirePermission(MENU, 'view'), getReceiptInventoryStructure);

router.get('/:id',         validateToken, requirePermission(MENU, 'view'),   getMetalReceiptById);
router.post('/',           validateToken, requirePermission(MENU, 'create'), createMetalReceipt);
router.put('/:id',         validateToken, requirePermission(MENU, 'update'), updateMetalReceipt);
router.post('/:id/submit', validateToken, requirePermission(MENU, 'update'), submitMetalReceipt);
router.delete('/:id',      validateToken, requirePermission(MENU, 'delete'), cancelMetalReceipt);

export default router;
