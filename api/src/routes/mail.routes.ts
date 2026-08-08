import { Router } from 'express';
import { sendTestMail } from '../controllers/mail.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.post('/test', validateToken, requirePermission('OTH_MAIL_CONF', 'update'), sendTestMail);

export default router;
