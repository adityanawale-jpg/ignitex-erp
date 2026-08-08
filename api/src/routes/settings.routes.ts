import { Router } from 'express';
import { getErpSettings, updateErpSettings, flushQueryCache } from '../controllers/settings.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'SA_ERP_CONFIG';

// GET is public so the login page can load branding
router.get('/erp', getErpSettings);
router.put('/erp', validateToken, requirePermission(MENU, 'update'), updateErpSettings);
router.post('/query-cache/flush', validateToken, requirePermission(MENU, 'update'), flushQueryCache);

export default router;
