import { Router } from 'express';
import {
  getInventoryStructures, getInventoryStructureStats, createInventoryStructure,
  updateInventoryStructure, toggleInventoryStructureStatus,
} from '../controllers/inventoryStructure.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_INV_STRUCTURE';

router.get('/',        validateToken, requirePermission(MENU, 'view'),   getInventoryStructures);
router.get('/stats',   validateToken, requirePermission(MENU, 'view'),   getInventoryStructureStats);
router.post('/',       validateToken, requirePermission(MENU, 'create'), createInventoryStructure);
router.put('/:id',     validateToken, requirePermission(MENU, 'update'), updateInventoryStructure);
router.delete('/:id',  validateToken, requirePermission(MENU, 'delete'), toggleInventoryStructureStatus);

export default router;
