import { Router } from 'express';
import {
  getStoneItems, getStoneItemStats, createStoneItem, updateStoneItem, toggleStoneItemStatus,
} from '../controllers/stoneItem.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_STONE_ITEMS';

router.get('/',       validateToken, requirePermission(MENU, 'view'),   getStoneItems);
router.get('/stats', validateToken, requirePermission(MENU, 'view'),   getStoneItemStats);
router.post('/',      validateToken, requirePermission(MENU, 'create'), createStoneItem);
router.put('/:id',   validateToken, requirePermission(MENU, 'update'), updateStoneItem);
router.delete('/:id',validateToken, requirePermission(MENU, 'delete'), toggleStoneItemStatus);

export default router;
