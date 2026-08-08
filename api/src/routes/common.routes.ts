import { Router } from 'express';
import {
  commonGet, commonPost, commonPut, commonDelete, executeMethod,
  getLookup, getDashboardStats,
} from '../controllers/common.controller';
import { validateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  commonGetSchema,
  commonPostSchema,
  commonPutSchema,
  commonDeleteSchema,
  executeMethodSchema,
} from '../validators/common.validators';

const router = Router();

// ── Common dynamic API routes ──────────────────────────────────
router.post('/get', validateToken, validate(commonGetSchema), commonGet);
router.post('/post', validateToken, validate(commonPostSchema), commonPost);
router.put('/put', validateToken, validate(commonPutSchema), commonPut);
router.delete('/delete/:id?', validateToken, validate(commonDeleteSchema), commonDelete);
router.post('/execute', validateToken, validate(executeMethodSchema), executeMethod);

// ── Utility routes ──────────────────────────────────────────────
router.get('/lookup/:type', validateToken, getLookup);
router.get('/dashboard-stats', validateToken, getDashboardStats);

export default router;
