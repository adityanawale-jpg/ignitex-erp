import { Router } from 'express';
import {
  getLookupMaster, getLookupStats, getLookupTypes, getLookupLOV,
  createLookup, updateLookup, toggleLookupStatus,
} from '../controllers/lookup.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_LOOKUP';

router.get('/',              validateToken, requirePermission(MENU, 'view'),   getLookupMaster);
router.get('/stats',        validateToken, requirePermission(MENU, 'view'),   getLookupStats);
// /types and /lov/:type are shared reference data consumed by dropdowns across
// nearly every other master page — gating these behind Lookup Master's own
// admin permission would break unrelated forms for users without that access.
router.get('/types',        validateToken, getLookupTypes);
router.get('/lov/:type',    validateToken, getLookupLOV);
router.post('/',             validateToken, requirePermission(MENU, 'create'), createLookup);
router.put('/:id',          validateToken, requirePermission(MENU, 'update'), updateLookup);
router.delete('/:id',       validateToken, requirePermission(MENU, 'delete'), toggleLookupStatus);

export default router;
