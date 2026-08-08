import { Router } from 'express';
import {
  getFINBOMList, getFINBOMStats, getFINBOMByVariant, saveFINBOM,
  submitFINBOM, approveFINBOM, rejectFINBOM, rfcFINBOM, getFINBOMLOV,
} from '../controllers/finBom.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_SFG_BOM';

router.get('/',                    validateToken, requirePermission(MENU, 'view'),   getFINBOMList);
router.get('/stats',               validateToken, requirePermission(MENU, 'view'),   getFINBOMStats);
router.get('/lov/:type',           validateToken, requirePermission(MENU, 'view'),   getFINBOMLOV);
router.get('/variant/:variantId',  validateToken, requirePermission(MENU, 'view'),   getFINBOMByVariant);
router.post('/',                   validateToken, requirePermission(MENU, 'create'), saveFINBOM);
router.put('/:id',                 validateToken, requirePermission(MENU, 'update'), saveFINBOM);
router.post('/:id/submit',         validateToken, requirePermission(MENU, 'update'), submitFINBOM);
router.post('/:id/approve',        validateToken, requirePermission(MENU, 'update'), approveFINBOM);
router.post('/:id/reject',         validateToken, requirePermission(MENU, 'update'), rejectFINBOM);
router.post('/:id/rfc',            validateToken, requirePermission(MENU, 'update'), rfcFINBOM);

export default router;
