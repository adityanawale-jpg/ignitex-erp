import { Router } from 'express';
import {
  getComponents, getComponentStats, createComponent, updateComponent, toggleComponentStatus,
} from '../controllers/componentMaster.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_COMP_ITEMS';

router.get('/',        validateToken, requirePermission(MENU, 'view'),   getComponents);
router.get('/stats',  validateToken, requirePermission(MENU, 'view'),   getComponentStats);
router.post('/',       validateToken, requirePermission(MENU, 'create'), createComponent);
router.put('/:id',    validateToken, requirePermission(MENU, 'update'), updateComponent);
router.delete('/:id', validateToken, requirePermission(MENU, 'delete'), toggleComponentStatus);

export default router;
