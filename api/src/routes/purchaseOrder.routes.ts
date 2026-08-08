import { Router } from 'express';
import {
  getPurchaseOrders, getPurchaseOrderStats, getPOSupplierLOV, getPOSupplierDefaults,
  getPOItemLOV, getPORequisitionLOV, getPendingRequisitions, getPOItemRate, getPurchaseOrderById,
  createPurchaseOrder, updatePurchaseOrder, submitPurchaseOrder, cancelPurchaseOrder,
} from '../controllers/purchaseOrder.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'PM_ORDERS';

router.get('/',      validateToken, requirePermission(MENU, 'view'), getPurchaseOrders);
router.get('/stats', validateToken, requirePermission(MENU, 'view'), getPurchaseOrderStats);

// Every literal path below must stay above '/:id', or 'lov' and 'suppliers'
// would be parsed as purchase order ids.
router.get('/lov/suppliers',           validateToken, requirePermission(MENU, 'view'), getPOSupplierLOV);
router.get('/lov/requisitions',        validateToken, requirePermission(MENU, 'view'), getPORequisitionLOV);
router.get('/lov/items/:itemtype',     validateToken, requirePermission(MENU, 'view'), getPOItemLOV);
router.get('/requisitions/pending',    validateToken, requirePermission(MENU, 'view'), getPendingRequisitions);
router.get('/suppliers/:id/defaults',  validateToken, requirePermission(MENU, 'view'), getPOSupplierDefaults);
router.get('/item-rate',               validateToken, requirePermission(MENU, 'view'), getPOItemRate);

router.get('/:id',           validateToken, requirePermission(MENU, 'view'),   getPurchaseOrderById);
router.post('/',             validateToken, requirePermission(MENU, 'create'), createPurchaseOrder);
router.put('/:id',           validateToken, requirePermission(MENU, 'update'), updatePurchaseOrder);
router.post('/:id/submit',   validateToken, requirePermission(MENU, 'update'), submitPurchaseOrder);
router.delete('/:id',        validateToken, requirePermission(MENU, 'delete'), cancelPurchaseOrder);

export default router;
