import { Router } from 'express';
import {
  getMetalItems, getMetalItemStats, createMetalItem, updateMetalItem, toggleMetalItemStatus,
} from '../controllers/metalMaster.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_METAL_MASTER';

router.get('/',        validateToken, requirePermission(MENU, 'view'),   getMetalItems);
router.get('/stats',  validateToken, requirePermission(MENU, 'view'),   getMetalItemStats);
router.post('/',       validateToken, requirePermission(MENU, 'create'), createMetalItem);
router.put('/:id',    validateToken, requirePermission(MENU, 'update'), updateMetalItem);
router.delete('/:id', validateToken, requirePermission(MENU, 'delete'), toggleMetalItemStatus);

export default router;
