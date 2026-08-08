import { Router } from 'express';
import {
  getSalesOrders, getSalesOrderStats, getSalesOrderById, getSalesOrderItemLOV,
  getSalesOrderInventoryStructure, getSalesOrderItemPrice,
  createSalesOrder, updateSalesOrder, submitSalesOrder, cancelSalesOrder,
} from '../controllers/salesOrder.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'ORD_SALES';

router.get('/',            validateToken, requirePermission(MENU, 'view'),   getSalesOrders);
router.get('/stats',       validateToken, requirePermission(MENU, 'view'),   getSalesOrderStats);
// Must stay above '/:id' so 'lov' is never parsed as an order id
router.get('/lov/:source', validateToken, requirePermission(MENU, 'view'),   getSalesOrderItemLOV);
// Also above '/:id' — Inventory Org / Subinventory options for a Business Unit
router.get('/inventory-structure/:bu', validateToken, requirePermission(MENU, 'view'), getSalesOrderInventoryStructure);
// Also above '/:id' — Customer Price Master rate + BOM net weight for one line
router.get('/item-price', validateToken, requirePermission(MENU, 'view'), getSalesOrderItemPrice);
router.get('/:id',         validateToken, requirePermission(MENU, 'view'),   getSalesOrderById);
router.post('/',           validateToken, requirePermission(MENU, 'create'), createSalesOrder);
router.put('/:id',         validateToken, requirePermission(MENU, 'update'), updateSalesOrder);
router.post('/:id/submit', validateToken, requirePermission(MENU, 'update'), submitSalesOrder);
router.delete('/:id',      validateToken, requirePermission(MENU, 'delete'), cancelSalesOrder);

export default router;
