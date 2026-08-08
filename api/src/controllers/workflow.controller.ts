import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { BOM_STATUS, WF_STATUS, WF_ACTION } from '../constants/bomWorkflow';
import { ORDER_STATUS, ORDER_RECORD_TYPE } from '../constants/orderWorkflow';
import { runWorkflowAction, SelfApprovalError, type Row } from '../services/workflow.service';


const stepWithNames = <T extends {
  role_master: { role_name: string } | null;
  user_master: { first_name: string; last_name: string | null } | null;
}>(steps: T[]) => steps.map(({ role_master, user_master, ...rest }) => ({
  ...rest,
  role_name: role_master?.role_name ?? null,
  user_name: user_master ? `${user_master.first_name ?? ''} ${user_master.last_name ?? ''}`.trim() : '',
}));

// ── GET /workflow/configs ────────────────────────────────────────
// Returns all configs (with step count) — for the config admin page list
export const getWorkflowConfigs = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.wf_config.findMany({
      include: { wf_step: { where: { is_active: true }, select: { id: true } } },
      orderBy: [{ module_code: 'asc' }, { wf_name: 'asc' }],
    });
    const result = rows.map(({ wf_step, ...rest }) => ({ ...rest, step_count: wf_step.length }));
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, 'Failed to fetch workflow configs', 500, String(err));
  }
};

// ── GET /workflow/configs/:id ────────────────────────────────────
// Returns single config with all its steps (including role/user names)
export const getWorkflowConfigById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const cfg = await prisma.wf_config.findUnique({ where: { id } });
    if (!cfg) { sendNotFound(res, 'Workflow config not found'); return; }

    const steps = await prisma.wf_step.findMany({
      where: { config_id: id, is_active: true },
      include: {
        role_master: { select: { role_name: true } },
        user_master: { select: { first_name: true, last_name: true } },
      },
      orderBy: { step_no: 'asc' },
    });

    sendSuccess(res, { ...cfg, steps: stepWithNames(steps) });
  } catch (err) {
    sendError(res, 'Failed to fetch workflow config', 500, String(err));
  }
};

// ── POST /workflow/configs ───────────────────────────────────────
export const createWorkflowConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  try {
    const { wf_code, wf_name, module_code, description } = req.body;
    if (!wf_code || !wf_name || !module_code) {
      sendValidationError(res, 'wf_code, wf_name and module_code are required'); return;
    }
    const created = await prisma.wf_config.create({
      data: {
        wf_code: wf_code.toUpperCase(), wf_name, module_code: module_code.toUpperCase(),
        description: description || null, created_by: userId, updated_by: userId,
      },
    });
    sendSuccess(res, created, 'Workflow created', 201);
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      sendError(res, 'Workflow code already exists', 409, String(err));
    } else {
      sendError(res, 'Failed to create workflow', 500, String(err));
    }
  }
};

// ── PUT /workflow/configs/:id ────────────────────────────────────
export const updateWorkflowConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  try {
    const id = parseInt(req.params.id);
    const { wf_name, description, is_active, self_approval } = req.body;

    // Mirrors the original UPDATE ... SET x = COALESCE($n, x) semantics:
    // a field is only changed when the caller actually sent a non-null value.
    const data: Prisma.wf_configUpdateInput = { updated_by: userId, updated_at: new Date() };
    if (wf_name) data.wf_name = wf_name;
    if (description !== undefined && description !== null) data.description = description;
    if (is_active !== undefined && is_active !== null) data.is_active = is_active;
    if (self_approval !== undefined && self_approval !== null) data.self_approval = self_approval;

    let updated;
    try {
      updated = await prisma.wf_config.update({ where: { id }, data });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') { sendNotFound(res, 'Workflow not found'); return; }
      throw err;
    }
    sendSuccess(res, updated, 'Workflow updated');
  } catch (err) {
    sendError(res, 'Failed to update workflow', 500, String(err));
  }
};

// ── POST /workflow/configs/:id/steps ────────────────────────────
// Replaces all steps for a config (upsert by step_no)
export const saveWorkflowSteps = async (req: AuthRequest, res: Response): Promise<void> => {
  const configId = parseInt(req.params.id);
  try {
    const cfg = await prisma.wf_config.findUnique({ where: { id: configId }, select: { id: true } });
    if (!cfg) { sendNotFound(res, 'Workflow config not found'); return; }

    type StepInput = { step_no: number; step_name: string; role_id?: number | null; user_id?: number | null;
                       can_submit?: boolean; can_approve?: boolean; can_reject?: boolean; can_rfc?: boolean; rfc_to_step?: number };
    const steps: StepInput[] = req.body.steps ?? [];
    if (!steps.length) { sendValidationError(res, 'At least one step is required'); return; }

    await prisma.$transaction(async (tx) => {
      // soft-delete existing
      await tx.wf_step.updateMany({ where: { config_id: configId }, data: { is_active: false } });
      for (const s of steps) {
        const shared = {
          step_name: s.step_name, role_id: s.role_id ?? null, user_id: s.user_id ?? null,
          can_submit: !!s.can_submit, can_approve: !!s.can_approve, can_reject: !!s.can_reject, can_rfc: !!s.can_rfc,
          rfc_to_step: s.rfc_to_step ?? 1, is_active: true,
        };
        await tx.wf_step.upsert({
          where: { config_id_step_no: { config_id: configId, step_no: s.step_no } },
          create: { config_id: configId, step_no: s.step_no, ...shared },
          update: shared,
        });
      }
    });

    sendSuccess(res, { config_id: configId, steps_saved: steps.length }, 'Steps saved');
  } catch (err) {
    sendError(res, 'Failed to save steps', 500, String(err));
  }
};

// ── GET /workflow/panel/:recordType/:recordId ────────────────────
// Returns full panel data: config, request, history, and user's available actions
export const getWorkflowPanel = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId     = req.user?.id as number;
  const recordType = req.params.recordType.toUpperCase();
  const recordId   = parseInt(req.params.recordId);

  try {
    // 1. Find the workflow config for this module
    const cfg = await prisma.wf_config.findFirst({
      where: { module_code: recordType, is_active: true },
      orderBy: { id: 'asc' },
      select: { id: true, wf_code: true, wf_name: true, self_approval: true },
    });

    if (!cfg) {
      // no workflow configured — return empty panel
      sendSuccess(res, { configured: false });
      return;
    }
    const configId = cfg.id;

    // 2. Get all steps (with role/user names)
    const steps = await prisma.wf_step.findMany({
      where: { config_id: configId, is_active: true },
      include: {
        role_master: { select: { role_name: true } },
        user_master: { select: { first_name: true, last_name: true } },
      },
      orderBy: { step_no: 'asc' },
    });
    const stepRows = stepWithNames(steps);

    // 3. Get active wf_request for this record
    const request = await prisma.wf_request.findUnique({
      where: { record_type_record_id: { record_type: recordType, record_id: recordId } },
    });

    // 4. Get workflow history (with actor names — wf_history.action_by has no real FK,
    // so names are resolved with a separate lookup rather than a join)
    let history: (Row & { action_by_name: string })[] = [];
    if (request) {
      const historyRows = await prisma.wf_history.findMany({
        where: { request_id: request.id },
        orderBy: { action_at: 'asc' },
      });
      const actorIds = [...new Set(historyRows.map(h => h.action_by))];
      const actors = actorIds.length
        ? await prisma.user_master.findMany({ where: { user_id: { in: actorIds } }, select: { user_id: true, first_name: true, last_name: true } })
        : [];
      const actorNames = new Map(actors.map(a => [a.user_id, `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()]));
      history = historyRows.map(h => ({ ...h, action_by_name: actorNames.get(h.action_by) ?? '' }));
    }

    // 5. Determine what the current user can do
    let currentStep = request ? request.current_step : 1;
    let wfStatus    = request ? request.wf_status : WF_STATUS.DRAFT;

    // For FG_BOM: the actual bom_fg.bom_status is the source of truth.
    // Legacy endpoints can leave wf_request.wf_status stale (e.g. PENDING while BOM is ACTIVE).
    // Override wfStatus from the real record to prevent spurious action buttons.
    if (recordType === 'FG_BOM') {
      const bom = await prisma.bom_fg.findUnique({ where: { id: recordId }, select: { bom_status: true } });
      const realStatus = bom?.bom_status ?? '';
      if      (realStatus === BOM_STATUS.ACTIVE)           wfStatus = WF_STATUS.APPROVED;
      else if (realStatus === BOM_STATUS.PENDING_APPROVAL) wfStatus = WF_STATUS.PENDING;
      else if (realStatus === BOM_STATUS.DRAFT)            wfStatus = WF_STATUS.DRAFT;
      else if (realStatus === BOM_STATUS.REJECTED)         wfStatus = WF_STATUS.REJECTED;
    }
    if (recordType === 'FINDING_BOM') {
      const bom = await prisma.bom_fin.findUnique({ where: { id: recordId }, select: { bom_status: true } });
      const realStatus = bom?.bom_status ?? '';
      if      (realStatus === BOM_STATUS.ACTIVE)           wfStatus = WF_STATUS.APPROVED;
      else if (realStatus === BOM_STATUS.PENDING_APPROVAL) wfStatus = WF_STATUS.PENDING;
      else if (realStatus === BOM_STATUS.DRAFT)            wfStatus = WF_STATUS.DRAFT;
      else if (realStatus === BOM_STATUS.REJECTED)         wfStatus = WF_STATUS.REJECTED;
    }
    // Same idea for the transaction documents: their own status column is the
    // source of truth, so a cancelled or already-approved document can never
    // offer buttons. CANCELLED maps to no workflow status at all, which leaves
    // the list empty.
    if (recordType === ORDER_RECORD_TYPE.SALES_ORDER
     || recordType === ORDER_RECORD_TYPE.PURCHASE_ORDER
     || recordType === ORDER_RECORD_TYPE.METAL_RECEIPT) {
      const realStatus =
        recordType === ORDER_RECORD_TYPE.SALES_ORDER
          ? (await prisma.sales_order_hdr.findUnique({ where: { id: recordId }, select: { order_status: true } }))?.order_status ?? ''
        : recordType === ORDER_RECORD_TYPE.PURCHASE_ORDER
          ? (await prisma.purchase_order_hdr.findUnique({ where: { id: recordId }, select: { po_status: true } }))?.po_status ?? ''
          : (await prisma.metal_receipt.findUnique({ where: { id: recordId }, select: { receipt_status: true } }))?.receipt_status ?? '';
      if      (realStatus === ORDER_STATUS.DRAFT)            wfStatus = WF_STATUS.DRAFT;
      else if (realStatus === ORDER_STATUS.PENDING_APPROVAL) wfStatus = WF_STATUS.PENDING;
      else if (realStatus === ORDER_STATUS.APPROVED)         wfStatus = WF_STATUS.APPROVED;
      else if (realStatus === ORDER_STATUS.REJECTED)         wfStatus = WF_STATUS.REJECTED;
      else if (realStatus === ORDER_STATUS.CANCELLED)        wfStatus = ORDER_STATUS.CANCELLED;

      // A draft or rejected order is back in the maker's hands, so the request
      // rewinds to step 1 — which is what runWorkflowAction does on the next
      // SUBMIT. Reflecting it here is what puts the Submit button back.
      if (realStatus === ORDER_STATUS.DRAFT || realStatus === ORDER_STATUS.REJECTED) {
        currentStep = 1;
        wfStatus    = WF_STATUS.DRAFT;
      }
    }

    // Get current user's role IDs
    const userRoles = await prisma.user_role.findMany({ where: { user_id: userId }, select: { role_id: true } });
    const userRoleIds = userRoles.map(r => r.role_id);

    // Find the step object for current step
    const currStepDef = stepRows.find(s => s.step_no === currentStep);

    const isAssignedToStep = (step: typeof stepRows[number] | undefined): boolean => {
      if (!step) return false;
      // Step 1 (initiator) has no assignee — anyone with access can do it
      if (step.step_no === 1 && !step.role_id && !step.user_id) return true;
      if (step.user_id && step.user_id === userId) return true;
      if (step.role_id && userRoleIds.includes(step.role_id)) return true;
      return false;
    };

    const userCanAct = isAssignedToStep(currStepDef);

    // Find who did the most recent SUBMIT to prevent self-approval
    const lastSubmitEntry = history.slice().reverse().find(h => h.action === WF_ACTION.SUBMIT);
    const lastSubmittedBy = lastSubmitEntry ? (lastSubmitEntry.action_by as number) : null;
    const isSelfApproval  = lastSubmittedBy !== null && lastSubmittedBy === userId;

    const availableActions: string[] = [];
    if (wfStatus === WF_STATUS.DRAFT && currStepDef?.can_submit && userCanAct)
      availableActions.push(WF_ACTION.SUBMIT);
    if (wfStatus === WF_STATUS.PENDING && userCanAct && !isSelfApproval) {
      if (currStepDef?.can_approve) availableActions.push(WF_ACTION.APPROVE);
      if (currStepDef?.can_reject)  availableActions.push(WF_ACTION.REJECT);
      if (currStepDef?.can_rfc)     availableActions.push(WF_ACTION.RFC);
    }

    sendSuccess(res, {
      configured: true,
      config:  { ...cfg, steps: stepRows },
      request,
      history,
      current_step:      currentStep,
      wf_status:         wfStatus,
      available_actions: availableActions,
    });
  } catch (err) {
    sendError(res, 'Failed to load workflow panel', 500, String(err));
  }
};

// ── POST /workflow/action ────────────────────────────────────────
// Execute: SUBMIT | APPROVE | REJECT | RFC
export const executeWorkflowAction = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId     = req.user?.id as number;
  const { record_type, record_id, action, remarks } = req.body as {
    record_type: string; record_id: number; action: string; remarks?: string;
  };

  if (!record_type || !record_id || !action) {
    sendValidationError(res, 'record_type, record_id and action are required'); return;
  }
  const recordType = record_type.toUpperCase();
  const act        = action.toUpperCase();

  try {
    const result = await runWorkflowAction({ recordType, recordId: record_id, action: act, userId, remarks });

    logAudit({
      userId, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: recordType, recordId: record_id,
      description: `Workflow action ${act} on ${recordType} #${record_id} → status: ${result.new_status}`,
      ipAddress: req.ip,
    });

    sendSuccess(res, result, `Action ${act} executed`);
  } catch (err: unknown) {
    if (err instanceof SelfApprovalError) { sendError(res, err.message, 403); return; }
    const msg = String(err);
    sendError(res, msg.replace('Error: ', '') || 'Failed to execute workflow action', 500, msg);
  }
};

// ── GET /workflow/access/:moduleCode ────────────────────────────
// Returns whether the current user can submit or approve in the module's workflow.
// Drives list-view tab visibility — independent of menu permissions.
export const getWorkflowAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId     = req.user?.id as number;
  const moduleCode = req.params.moduleCode.toUpperCase();

  try {
    const cfg = await prisma.wf_config.findFirst({ where: { module_code: moduleCode, is_active: true }, select: { id: true } });

    if (!cfg) {
      // No workflow configured — treat everyone as a maker
      sendSuccess(res, { can_submit: true, can_approve: false });
      return;
    }

    const [steps, userRoles] = await Promise.all([
      prisma.wf_step.findMany({ where: { config_id: cfg.id, is_active: true }, orderBy: { step_no: 'asc' } }),
      prisma.user_role.findMany({ where: { user_id: userId }, select: { role_id: true } }),
    ]);

    const userRoleIds = userRoles.map(r => r.role_id);

    const isAssigned = (step: typeof steps[number]): boolean => {
      if (!step.role_id && !step.user_id) return true; // open step — anyone can act
      if (step.user_id && step.user_id === userId) return true;
      if (step.role_id && userRoleIds.includes(step.role_id)) return true;
      return false;
    };

    const can_submit  = steps.some(s => s.can_submit  && isAssigned(s));
    const can_approve = steps.some(s => (s.can_approve || s.can_reject || s.can_rfc) && isAssigned(s));

    sendSuccess(res, { can_submit, can_approve });
  } catch (err) {
    sendError(res, 'Failed to fetch workflow access', 500, String(err));
  }
};

// ── GET /workflow/roles  (for step config dropdowns) ────────────
export const getWorkflowRoles = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.role_master.findMany({
      where: { is_active: true },
      select: { id: true, role_code: true, role_name: true },
      orderBy: { role_name: 'asc' },
    });
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, 'Failed to fetch roles', 500, String(err));
  }
};

// ── GET /workflow/users  (for step config dropdowns) ────────────
export const getWorkflowUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.user_master.findMany({
      where: { user_status: true },
      select: { user_id: true, first_name: true, last_name: true, emp_email: true },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    });
    const result = rows.map(r => ({ id: r.user_id, full_name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(), emp_email: r.emp_email }));
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, 'Failed to fetch users', 500, String(err));
  }
};
