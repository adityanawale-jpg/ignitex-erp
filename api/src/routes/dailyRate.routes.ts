import { Router } from 'express';
import {
  getDailyRates, getDailyRateStats, getLatestDailyRate, getDailyRateById,
  createDailyRate, updateDailyRate, toggleDailyRateStatus,
  getRateConfig, updateRateConfig, fetchRatesNow,
} from '../controllers/dailyRate.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'MM_DAILY_RATE';

// ── Literal paths ────────────────────────────────────────────
// Every one of these must stay above its '/:id' counterpart, or Express hands
// the request to the id route with id = 'stats' / 'config' / 'latest'.
router.get('/stats',      validateToken, requirePermission(MENU, 'view'),   getDailyRateStats);
router.get('/latest',     validateToken, requirePermission(MENU, 'view'),   getLatestDailyRate);
router.get('/config',     validateToken, requirePermission(MENU, 'view'),   getRateConfig);
// Auto update writes rate sheets, so it sits behind 'update', not 'view'.
router.put('/config',     validateToken, requirePermission(MENU, 'update'), updateRateConfig);
router.post('/fetch-now', validateToken, requirePermission(MENU, 'update'), fetchRatesNow);

// ── Rate sheets ──────────────────────────────────────────────
router.get('/',           validateToken, requirePermission(MENU, 'view'),   getDailyRates);
router.get('/:id',        validateToken, requirePermission(MENU, 'view'),   getDailyRateById);
router.post('/',          validateToken, requirePermission(MENU, 'create'), createDailyRate);
router.put('/:id',        validateToken, requirePermission(MENU, 'update'), updateDailyRate);
router.delete('/:id',     validateToken, requirePermission(MENU, 'delete'), toggleDailyRateStatus);

export default router;
