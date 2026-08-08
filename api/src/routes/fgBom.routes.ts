import { Router } from 'express';
import {
  getFGBOMList, getFGBOMStats, getFGBOMByVariant, saveFGBOM, submitFGBOM,
  approveFGBOM, rejectFGBOM, rfcFGBOM, getFGBOMLOV,
} from '../controllers/fgBom.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_FG_BOM';

router.get('/',                    validateToken, requirePermission(MENU, 'view'),   getFGBOMList);
router.get('/stats',               validateToken, requirePermission(MENU, 'view'),   getFGBOMStats);
router.get('/lov/:type',           validateToken, requirePermission(MENU, 'view'),   getFGBOMLOV);
router.get('/variant/:variantId',  validateToken, requirePermission(MENU, 'view'),   getFGBOMByVariant);
router.post('/',                   validateToken, requirePermission(MENU, 'create'), saveFGBOM);
router.put('/:id',                 validateToken, requirePermission(MENU, 'update'), saveFGBOM);
// submit/approve/reject/rfc are workflow-state transitions on an existing BOM,
// gated the same as other edits — the workflow engine's own wf_step role/user
// assignment (see workflow.controller.ts) provides finer-grained authorization
// on top of this for the newer /workflow/action path.
router.post('/:id/submit',         validateToken, requirePermission(MENU, 'update'), submitFGBOM);
router.post('/:id/approve',        validateToken, requirePermission(MENU, 'update'), approveFGBOM);
router.post('/:id/reject',         validateToken, requirePermission(MENU, 'update'), rejectFGBOM);
router.post('/:id/rfc',            validateToken, requirePermission(MENU, 'update'), rfcFGBOM);

export default router;
