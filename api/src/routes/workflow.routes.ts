import { Router } from 'express';
import {
  getWorkflowConfigs, getWorkflowConfigById, createWorkflowConfig, updateWorkflowConfig,
  saveWorkflowSteps, getWorkflowPanel, getWorkflowAccess, executeWorkflowAction,
  getWorkflowRoles, getWorkflowUsers,
} from '../controllers/workflow.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const MENU = 'SA_WF_CONFIG';

router.get('/configs',                     validateToken, requirePermission(MENU, 'view'),   getWorkflowConfigs);
router.get('/configs/:id',                 validateToken, requirePermission(MENU, 'view'),   getWorkflowConfigById);
router.post('/configs',                    validateToken, requirePermission(MENU, 'create'), createWorkflowConfig);
router.put('/configs/:id',                 validateToken, requirePermission(MENU, 'update'), updateWorkflowConfig);
router.post('/configs/:id/steps',          validateToken, requirePermission(MENU, 'update'), saveWorkflowSteps);
router.get('/roles',                       validateToken, requirePermission(MENU, 'view'),   getWorkflowRoles);
router.get('/users',                       validateToken, requirePermission(MENU, 'view'),   getWorkflowUsers);
// panel/access/action are used from within every workflow-enabled module's own
// page (FG BOM, Finding BOM, ...), not just workflow-config administration, and
// action execution is already gated by the workflow engine's own per-step
// role/user assignment (see workflow.controller.ts) — left ungated here.
router.get('/panel/:recordType/:recordId', validateToken, getWorkflowPanel);
router.get('/access/:moduleCode',          validateToken, getWorkflowAccess);
router.post('/action',                     validateToken, executeWorkflowAction);

export default router;
