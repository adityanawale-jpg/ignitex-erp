import { Router } from 'express';
import {
  getDepts, getDeptStats, getDeptLOV, createDept, updateDept, toggleDeptStatus,
  getMachines, getMachineStats, getMachineLOV, createMachine, updateMachine, toggleMachineStatus, importMachines,
  getOperations, getOperationStats, getOperationLOV, createOperation, updateOperation, toggleOperationStatus, importOperations,
  getAlloys, getAlloyStats, createAlloy, updateAlloy, toggleAlloyStatus, importAlloys,
} from '../controllers/productionMasters.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

// Bundles 4 domains (departments/machines/operations/alloys) with no shared
// path prefix, mirroring how productionMasters.controller.ts already bundles
// them — mounted at root in routes/index.ts rather than under one prefix.
const router = Router();
const DEPT_MENU = 'MM_DEPT_MASTER';
const MACHINE_MENU = 'MM_MACHINE_MASTER';
const OPERATION_MENU = 'MM_OPERATION_MASTER';
const ALLOY_MENU = 'MM_ALLOY_MASTER';

// ── Department Master ─────────────────────────────────────────
router.get('/departments',        validateToken, requirePermission(DEPT_MENU, 'view'),   getDepts);
router.get('/departments/stats',  validateToken, requirePermission(DEPT_MENU, 'view'),   getDeptStats);
// /lov is shared dropdown data consumed by Machine Master's own form — kept
// ungated so users without Department Master access can still populate it.
router.get('/departments/lov',    validateToken, getDeptLOV);
router.post('/departments',       validateToken, requirePermission(DEPT_MENU, 'create'), createDept);
router.put('/departments/:id',    validateToken, requirePermission(DEPT_MENU, 'update'), updateDept);
router.delete('/departments/:id', validateToken, requirePermission(DEPT_MENU, 'delete'), toggleDeptStatus);

// ── Machine Master ────────────────────────────────────────────
router.get('/machines',          validateToken, requirePermission(MACHINE_MENU, 'view'),   getMachines);
router.get('/machines/stats',    validateToken, requirePermission(MACHINE_MENU, 'view'),   getMachineStats);
router.get('/machines/lov',      validateToken, getMachineLOV);
router.post('/machines',         validateToken, requirePermission(MACHINE_MENU, 'create'), createMachine);
router.post('/machines/import',  validateToken, requirePermission(MACHINE_MENU, 'create'), importMachines);
router.put('/machines/:id',      validateToken, requirePermission(MACHINE_MENU, 'update'), updateMachine);
router.delete('/machines/:id',   validateToken, requirePermission(MACHINE_MENU, 'delete'), toggleMachineStatus);

// ── Operation Master ──────────────────────────────────────────
router.get('/operations',          validateToken, requirePermission(OPERATION_MENU, 'view'),   getOperations);
router.get('/operations/stats',    validateToken, requirePermission(OPERATION_MENU, 'view'),   getOperationStats);
router.get('/operations/lov',      validateToken, getOperationLOV);
router.post('/operations',         validateToken, requirePermission(OPERATION_MENU, 'create'), createOperation);
router.post('/operations/import',  validateToken, requirePermission(OPERATION_MENU, 'create'), importOperations);
router.put('/operations/:id',      validateToken, requirePermission(OPERATION_MENU, 'update'), updateOperation);
router.delete('/operations/:id',   validateToken, requirePermission(OPERATION_MENU, 'delete'), toggleOperationStatus);

// ── Alloy Master ───────────────────────────────────────────────
router.get('/alloys',          validateToken, requirePermission(ALLOY_MENU, 'view'),   getAlloys);
router.get('/alloys/stats',    validateToken, requirePermission(ALLOY_MENU, 'view'),   getAlloyStats);
router.post('/alloys',         validateToken, requirePermission(ALLOY_MENU, 'create'), createAlloy);
router.post('/alloys/import',  validateToken, requirePermission(ALLOY_MENU, 'create'), importAlloys);
router.put('/alloys/:id',      validateToken, requirePermission(ALLOY_MENU, 'update'), updateAlloy);
router.delete('/alloys/:id',   validateToken, requirePermission(ALLOY_MENU, 'delete'), toggleAlloyStatus);

export default router;
