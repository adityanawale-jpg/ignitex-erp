import { Router } from 'express';
import { importFGMaster } from '../controllers/fgImport.controller';
import { validateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/import', validateToken, importFGMaster);

export default router;
