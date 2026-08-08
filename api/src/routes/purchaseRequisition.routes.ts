import { Router } from 'express';
import {
  getRequisitions, getRequisitionStats, getRequisitionItemLOV, getRequisitionById,
  createRequisition, updateRequisition, toggleRequisitionStatus,
} from '../controllers/purchaseRequisition.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'PM_REQUISITIONS';

router.get('/',              validateToken, requirePermission(MENU, 'view'),   getRequisitions);
router.get('/stats',         validateToken, requirePermission(MENU, 'view'),   getRequisitionStats);
// Must stay above '/:id' so 'lov' is never parsed as a requisition id
router.get('/lov/:itemtype', validateToken, requirePermission(MENU, 'view'),   getRequisitionItemLOV);
router.get('/:id',           validateToken, requirePermission(MENU, 'view'),   getRequisitionById);
router.post('/',             validateToken, requirePermission(MENU, 'create'), createRequisition);
router.put('/:id',           validateToken, requirePermission(MENU, 'update'), updateRequisition);
router.delete('/:id',        validateToken, requirePermission(MENU, 'delete'), toggleRequisitionStatus);

export default router;
