import { Router } from 'express';
import {
  getMinMaxPlanning, getMinMaxPlanningStats, createMinMaxPlanning,
  updateMinMaxPlanning, toggleMinMaxPlanningStatus, importMinMaxPlanning,
} from '../controllers/minMaxPlanning.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_MIN_MAX';

router.get('/',         validateToken, requirePermission(MENU, 'view'),   getMinMaxPlanning);
router.get('/stats',   validateToken, requirePermission(MENU, 'view'),   getMinMaxPlanningStats);
router.post('/',        validateToken, requirePermission(MENU, 'create'), createMinMaxPlanning);
router.post('/import', validateToken, requirePermission(MENU, 'create'), importMinMaxPlanning);
router.put('/:id',     validateToken, requirePermission(MENU, 'update'), updateMinMaxPlanning);
router.delete('/:id',  validateToken, requirePermission(MENU, 'delete'), toggleMinMaxPlanningStatus);

export default router;
