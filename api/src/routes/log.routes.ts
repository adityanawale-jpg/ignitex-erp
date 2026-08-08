import { Router } from 'express';
import { getLoginLogs, getErrorLogs, getAuditLogs } from '../controllers/log.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.get('/login',  validateToken, requirePermission('SA_LOGIN_LOGS', 'view'), getLoginLogs);
router.get('/errors', validateToken, requirePermission('SA_ERROR_LOGS', 'view'), getErrorLogs);
router.get('/audit',  validateToken, requirePermission('SA_AUDIT_LOGS', 'view'), getAuditLogs);

export default router;
