import { Router } from 'express';
import { importFindingMaster } from '../controllers/findingImport.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_FIN_ITEMS';

router.post('/import', validateToken, requirePermission(MENU, 'create'), importFindingMaster);

export default router;
