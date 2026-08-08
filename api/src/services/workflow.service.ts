// The workflow engine's write path, extracted from workflow.controller.ts so it
// can be driven from two places: the generic POST /workflow/action endpoint the
// WorkflowPanel calls, and the order controllers' own submit endpoints — which
// must go through the engine rather than setting their status column directly,
// or the document and its wf_request would drift apart.
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { BOM_STATUS, WF_STATUS, WF_ACTION } from '../constants/bomWorkflow';
import { ORDER_STATUS, ORDER_RECORD_TYPE } from '../constants/orderWorkflow';
import { postStockMovement } from './stock.service';

export type Row = Record<string, unknown>;

// Thrown for the one rule that is a 403 rather than a generic 400/500.
export class SelfApprovalError extends Error {}

// ── Module-specific post-action hooks ───────────────────────────
// Each hook runs inside the same DB transaction as the workflow action,
// so either both succeed or both roll back.
// Returns extra data to include in the action response (e.g. RFC new BOM id).
export async function runModuleHook(
  tx: Prisma.TransactionClient,
  recordType: string,
  recordId: number,
  act: string,
  userId: number,
  remarks: string | null,
): Promise<Row> {
  if (recordType === 'FG_BOM') {
    if (act === WF_ACTION.SUBMIT) {
      await tx.bom_fg.update({
        where: { id: recordId },
        data: { bom_status: BOM_STATUS.PENDING_APPROVAL, submitted_by: userId, submitted_at: new Date(), updated_by: userId, updated_at: new Date() },
      });

    } else if (act === WF_ACTION.APPROVE) {
      await tx.bom_fg.update({
        where: { id: recordId },
        data: { bom_status: BOM_STATUS.ACTIVE, approved_by: userId, approved_at: new Date(), updated_by: userId, updated_at: new Date() },
      });

    } else if (act === WF_ACTION.REJECT) {
      await tx.bom_fg.update({
        where: { id: recordId },
        data: { bom_status: BOM_STATUS.REJECTED, rejected_by: userId, rejected_at: new Date(), rejection_reason: remarks, updated_by: userId, updated_at: new Date() },
      });

    } else if (act === WF_ACTION.RFC) {
      // Create a new DRAFT version by copying the current BOM
      const header = await tx.bom_fg.findUnique({
        where: { id: recordId },
        select: {
          variant_id: true, gross_weight: true, net_weight: true, stone_cts: true, stone_gms: true,
          min_weight: true, max_weight: true, effective_from: true, effective_to: true, remarks: true,
        },
      });
      if (!header) throw new Error('BOM not found for RFC');

      const bomCount = await tx.bom_fg.count({ where: { variant_id: header.variant_id } });
      const nextVer = `${bomCount + 1}.0`;

      const newBom = await tx.bom_fg.create({
        data: {
          variant_id: header.variant_id, bom_version: nextVer, bom_status: BOM_STATUS.DRAFT,
          gross_weight: header.gross_weight, net_weight: header.net_weight,
          stone_cts: header.stone_cts, stone_gms: header.stone_gms,
          min_weight: header.min_weight, max_weight: header.max_weight,
          effective_from: header.effective_from, effective_to: header.effective_to,
          remarks: header.remarks, created_by: userId, updated_by: userId,
        },
        select: { id: true, bom_version: true },
      });

      const detailRows = await tx.bom_fg_detail.findMany({
        where: { bom_id: recordId, is_active: true },
        select: {
          bom_type: true, seq_no: true, item_id: true, item_code: true, item_name: true,
          item_quantity: true, uom1_code: true, uom2_code: true, item_weight: true,
          purity_code: true, pure_weight: true, weight_gms: true,
        },
      });
      if (detailRows.length) {
        await tx.bom_fg_detail.createMany({ data: detailRows.map(d => ({ bom_id: newBom.id, ...d })) });
      }

      // Also reset the wf_request for this new BOM so it starts as DRAFT
      // (it will get its own wf_request when the maker submits it)
      return { rfc_new_bom_id: newBom.id, rfc_new_version: newBom.bom_version };
    }
  }

  if (recordType === 'FINDING_BOM') {
    if (act === WF_ACTION.SUBMIT) {
      await tx.bom_fin.update({
        where: { id: recordId },
        data: { bom_status: BOM_STATUS.PENDING_APPROVAL, submitted_by: userId, submitted_at: new Date(), updated_by: userId, updated_at: new Date() },
      });

    } else if (act === WF_ACTION.APPROVE) {
      await tx.bom_fin.update({
        where: { id: recordId },
        data: { bom_status: BOM_STATUS.ACTIVE, approved_by: userId, approved_at: new Date(), updated_by: userId, updated_at: new Date() },
      });

    } else if (act === WF_ACTION.REJECT) {
      await tx.bom_fin.update({
        where: { id: recordId },
        data: { bom_status: BOM_STATUS.REJECTED, rejected_by: userId, rejected_at: new Date(), rejection_reason: remarks, updated_by: userId, updated_at: new Date() },
      });

    } else if (act === WF_ACTION.RFC) {
      const header = await tx.bom_fin.findUnique({
        where: { id: recordId },
        select: {
          variant_id: true, gross_weight: true, net_weight: true, component_weight: true, stone_cts: true, stone_gms: true,
          min_weight: true, max_weight: true, effective_from: true, effective_to: true, remarks: true,
        },
      });
      if (!header) throw new Error('Finding BOM not found for RFC');

      const bomCount = await tx.bom_fin.count({ where: { variant_id: header.variant_id } });
      const nextVer = `${bomCount + 1}.0`;

      const newBom = await tx.bom_fin.create({
        data: {
          variant_id: header.variant_id, bom_version: nextVer, bom_status: BOM_STATUS.DRAFT,
          gross_weight: header.gross_weight, net_weight: header.net_weight, component_weight: header.component_weight,
          stone_cts: header.stone_cts, stone_gms: header.stone_gms,
          min_weight: header.min_weight, max_weight: header.max_weight,
          effective_from: header.effective_from, effective_to: header.effective_to,
          remarks: header.remarks, created_by: userId, updated_by: userId,
        },
        select: { id: true, bom_version: true },
      });

      const detailRows = await tx.bom_fin_detail.findMany({
        where: { bom_id: recordId, is_active: true },
        select: {
          bom_type: true, item_type: true, seq_no: true, item_id: true, item_code: true, item_name: true,
          item_quantity: true, uom1_code: true, purity_code: true, gross_weight: true, net_weight: true,
          component_weight: true, stone_cts: true, stone_gms: true, remarks: true,
        },
      });
      if (detailRows.length) {
        await tx.bom_fin_detail.createMany({ data: detailRows.map(d => ({ bom_id: newBom.id, ...d })) });
      }

      return { rfc_new_bom_id: newBom.id, rfc_new_version: newBom.bom_version };
    }
  }

  // ── Sales Order / Purchase Order ──────────────────────────────
  // Unlike a BOM, an order is never versioned: RFC re-opens the same document
  // as a draft for the maker to correct, rather than cloning it.
  const orderStatusFor = (action: string): string | null => {
    if (action === WF_ACTION.SUBMIT)  return ORDER_STATUS.PENDING_APPROVAL;
    if (action === WF_ACTION.APPROVE) return ORDER_STATUS.APPROVED;
    if (action === WF_ACTION.REJECT)  return ORDER_STATUS.REJECTED;
    if (action === WF_ACTION.RFC)     return ORDER_STATUS.DRAFT;
    return null;
  };

  if (recordType === ORDER_RECORD_TYPE.SALES_ORDER) {
    const status = orderStatusFor(act);
    if (status) {
      await tx.sales_order_hdr.update({
        where: { id: recordId },
        data: { order_status: status, updated_by: userId, updated_at: new Date() },
      });
      await tx.sales_order_lines.updateMany({
        where: { order_id: recordId },
        data: { item_status: status, updated_at: new Date() },
      });
    }
  }

  if (recordType === ORDER_RECORD_TYPE.PURCHASE_ORDER) {
    const status = orderStatusFor(act);
    if (status) {
      await tx.purchase_order_hdr.update({
        where: { id: recordId },
        data: { po_status: status, updated_by: userId, updated_at: new Date() },
      });
      await tx.purchase_order_lines.updateMany({
        where: { po_id: recordId },
        data: { line_status: status, updated_at: new Date() },
      });
    }
  }

  // A metal receipt is a single flat row, so there are no lines to carry the
  // status down to — otherwise it behaves exactly like the two orders above.
  if (recordType === ORDER_RECORD_TYPE.METAL_RECEIPT) {
    const status = orderStatusFor(act);
    if (status) {
      const updated = await tx.metal_receipt.update({
        where: { id: recordId },
        data: { receipt_status: status, updated_by: userId, updated_at: new Date() },
        select: {
          sku_code: true, item_id: true, uid: true, purity: true,
          received_weight: true, pure_weight: true,
          inward_inv_org: true, inward_sub_inv: true,
        },
      });

      // Metal only actually lands somewhere once approved, and only if the
      // maker picked a destination — a receipt approved with no sub-inventory
      // is left un-posted rather than guessing one.
      if (act === WF_ACTION.APPROVE && updated.inward_sub_inv) {
        await postStockMovement(tx, {
          txnType:      'RECEIPT',
          sourceModule: ORDER_RECORD_TYPE.METAL_RECEIPT,
          sourceId:     recordId,
          invOrgCode:   updated.inward_inv_org,
          subInvCode:   updated.inward_sub_inv,
          itemType:     'METAL',
          itemId:       updated.item_id,
          skuCode:      updated.sku_code,
          uid:          updated.uid,
          purity:       updated.purity,
          quantity:     updated.received_weight,
          pureQuantity: updated.pure_weight,
          createdBy:    userId,
        });
      }
    }
  }

  return {};
}

// ── The workflow action itself ───────────────────────────────────
// Throws on any rule violation; the caller maps that to an HTTP response.
export async function runWorkflowAction(params: {
  recordType: string;
  recordId: number;
  action: string;
  userId: number;
  remarks?: string | null;
}): Promise<Row & { request_id: number; new_step: number; new_status: string }> {
  const recordType = params.recordType.toUpperCase();
  const act = params.action.toUpperCase();
  const { recordId, userId } = params;
  const remarks = params.remarks || null;

  // Get workflow config for module (including self_approval flag)
  // orderBy matches getWorkflowPanel — if a module ever ends up with more than one
  // active config, the panel and the engine must read the same row, or the panel
  // offers actions (and the Auto-Approve label) the engine won't honour.
  const cfg = await prisma.wf_config.findFirst({
    where: { module_code: recordType, is_active: true },
    orderBy: { id: 'asc' },
    select: { id: true, self_approval: true },
  });
  if (!cfg) throw new Error('No workflow configured for this module');
  const configId = cfg.id;
  const selfApproval = cfg.self_approval;

  // Get all steps
  const stepRows = await prisma.wf_step.findMany({ where: { config_id: configId, is_active: true }, orderBy: { step_no: 'asc' } });

  // Get or create wf_request
  let existingRequest = await prisma.wf_request.findUnique({
    where: { record_type_record_id: { record_type: recordType, record_id: recordId } },
  });

  // Hard guard: prevent self-approval
  if ((act === WF_ACTION.APPROVE || act === WF_ACTION.REJECT || act === WF_ACTION.RFC) && existingRequest) {
    const lastSubmit = await prisma.wf_history.findFirst({
      where: { request_id: existingRequest.id, action: WF_ACTION.SUBMIT },
      orderBy: { action_at: 'desc' },
      select: { action_by: true },
    });
    if (lastSubmit && lastSubmit.action_by === userId) {
      throw new SelfApprovalError('Self-approval not allowed: you cannot approve a record you submitted');
    }
  }

  return prisma.$transaction(async (tx) => {
    let requestId: number;

    if (!existingRequest) {
      // Create new request (first SUBMIT on a fresh record)
      if (act !== WF_ACTION.SUBMIT) {
        throw new Error('No workflow request found — must SUBMIT first');
      }
      const created = await tx.wf_request.create({
        data: { config_id: configId, record_type: recordType, record_id: recordId, current_step: 1, wf_status: WF_STATUS.DRAFT, created_by: userId, updated_by: userId },
      });
      requestId = created.id;
      existingRequest = created;
    } else {
      requestId = existingRequest.id;
    }

    let curStep = existingRequest.current_step;

    // If the maker is re-submitting a BOM that was rejected back to DRAFT via the
    // legacy reject endpoint, the wf_request may still have current_step > 1 while
    // the BOM status is already 'DRAFT'. Auto-reset to step 1 so SUBMIT succeeds.
    if (act === WF_ACTION.SUBMIT && recordType === 'FG_BOM' && curStep !== 1) {
      const bomCheck = await tx.bom_fg.findUnique({ where: { id: recordId }, select: { bom_status: true } });
      if (bomCheck?.bom_status === BOM_STATUS.DRAFT) {
        await tx.wf_request.update({ where: { id: requestId }, data: { current_step: 1, wf_status: WF_STATUS.DRAFT, updated_at: new Date() } });
        curStep = 1;
      }
    }
    if (act === WF_ACTION.SUBMIT && recordType === 'FINDING_BOM' && curStep !== 1) {
      const bomCheck = await tx.bom_fin.findUnique({ where: { id: recordId }, select: { bom_status: true } });
      if (bomCheck?.bom_status === BOM_STATUS.DRAFT) {
        await tx.wf_request.update({ where: { id: requestId }, data: { current_step: 1, wf_status: WF_STATUS.DRAFT, updated_at: new Date() } });
        curStep = 1;
      }
    }
    // Orders re-enter the workflow the same way after an RFC or a rejection: the
    // document is back with the maker, so the request rewinds to step 1.
    if (act === WF_ACTION.SUBMIT && curStep !== 1) {
      const status = await currentOrderStatus(tx, recordType, recordId);
      if (status === ORDER_STATUS.DRAFT || status === ORDER_STATUS.REJECTED) {
        await tx.wf_request.update({ where: { id: requestId }, data: { current_step: 1, wf_status: WF_STATUS.DRAFT, updated_at: new Date() } });
        curStep = 1;
      }
    }

    const curStepDef = stepRows.find(s => s.step_no === curStep);
    if (!curStepDef) throw new Error(`Workflow step ${curStep} not found`);

    // Validate action is allowed at this step
    if (act === WF_ACTION.SUBMIT  && !curStepDef.can_submit)  throw new Error('SUBMIT not allowed at this step');
    if (act === WF_ACTION.APPROVE && !curStepDef.can_approve) throw new Error('APPROVE not allowed at this step');
    if (act === WF_ACTION.REJECT  && !curStepDef.can_reject)  throw new Error('REJECT not allowed at this step');
    if (act === WF_ACTION.RFC     && !curStepDef.can_rfc)     throw new Error('RFC not allowed at this step');

    let newStep: number;
    let newStatus: string;

    if (act === WF_ACTION.SUBMIT) {
      // Move to next step
      const nextStepDef = stepRows.find(s => s.step_no === curStep + 1);
      newStep   = nextStepDef ? nextStepDef.step_no : curStep;
      newStatus = nextStepDef ? WF_STATUS.PENDING : WF_STATUS.APPROVED;
    } else if (act === WF_ACTION.APPROVE) {
      // Check if there are more steps after current
      const nextStepDef = stepRows.find(s => s.step_no === curStep + 1);
      if (nextStepDef) {
        newStep   = nextStepDef.step_no;
        newStatus = WF_STATUS.PENDING;
      } else {
        newStep   = curStep;
        newStatus = WF_STATUS.APPROVED;
      }
    } else if (act === WF_ACTION.REJECT) {
      newStep   = curStep;
      newStatus = WF_STATUS.REJECTED;
    } else if (act === WF_ACTION.RFC) {
      newStep   = curStepDef.rfc_to_step ?? 1;
      newStatus = WF_STATUS.RFC;
    } else {
      throw new Error(`Unknown action: ${act}`);
    }

    // Update wf_request
    await tx.wf_request.update({
      where: { id: requestId },
      data: { current_step: newStep, wf_status: newStatus, updated_by: userId, updated_at: new Date() },
    });

    // Write history
    await tx.wf_history.create({
      data: { request_id: requestId, step_no: curStep, step_name: curStepDef.step_name, action: act, action_by: userId, remarks },
    });

    // Sync source record status (module-specific, same transaction)
    const hookData = await runModuleHook(tx, recordType, recordId, act, userId, remarks);

    // A SUBMIT can finish the workflow outright, two ways: self-approval is on, or
    // the submit step is the last active step so no approver is left to act. Either
    // way the request ends up APPROVED and the document must be advanced with it —
    // the SUBMIT hook only ever sets PENDING_APPROVAL, so without this the record
    // sits in the Pending queue forever with no step able to approve it.
    if (act === WF_ACTION.SUBMIT && (selfApproval || newStatus === WF_STATUS.APPROVED)) {
      const approveStepDef = stepRows.find(s => s.step_no === newStep) ?? curStepDef;
      const autoRemark = selfApproval
        ? 'Auto-approved (Self Approval enabled)'
        : 'Auto-approved (no approval step configured)';
      // Write APPROVE history
      await tx.wf_history.create({
        data: {
          request_id: requestId, step_no: approveStepDef.step_no, step_name: approveStepDef.step_name,
          action: WF_ACTION.APPROVE, action_by: userId, remarks: autoRemark,
        },
      });
      // Update request to APPROVED (already APPROVED when SUBMIT was the last step)
      if (newStatus !== WF_STATUS.APPROVED) {
        await tx.wf_request.update({ where: { id: requestId }, data: { wf_status: WF_STATUS.APPROVED, updated_by: userId, updated_at: new Date() } });
        newStatus = WF_STATUS.APPROVED;
      }
      // Run APPROVE module hook (sets bom_status → ACTIVE)
      await runModuleHook(tx, recordType, recordId, WF_ACTION.APPROVE, userId, autoRemark);
    }

    // RFC: transfer this wf_request to the new BOM so the entire history
    // chain (Submit → RFC → Submit → Approve) stays in one request row.
    // Without this, the new BOM's first Submit creates a separate wf_request
    // and history from the original cycle is lost.
    if (hookData.rfc_new_bom_id) {
      await tx.wf_request.update({
        where: { id: requestId },
        data: { record_id: hookData.rfc_new_bom_id as number, wf_status: WF_STATUS.DRAFT, current_step: newStep, updated_at: new Date() },
      });
    }

    return { request_id: requestId, new_step: newStep, new_status: newStatus, ...hookData };
  });
}

// The order document's own status, or null when the record type isn't an order.
async function currentOrderStatus(
  tx: Prisma.TransactionClient,
  recordType: string,
  recordId: number,
): Promise<string | null> {
  if (recordType === ORDER_RECORD_TYPE.SALES_ORDER) {
    const row = await tx.sales_order_hdr.findUnique({ where: { id: recordId }, select: { order_status: true } });
    return row?.order_status ?? null;
  }
  if (recordType === ORDER_RECORD_TYPE.PURCHASE_ORDER) {
    const row = await tx.purchase_order_hdr.findUnique({ where: { id: recordId }, select: { po_status: true } });
    return row?.po_status ?? null;
  }
  if (recordType === ORDER_RECORD_TYPE.METAL_RECEIPT) {
    const row = await tx.metal_receipt.findUnique({ where: { id: recordId }, select: { receipt_status: true } });
    return row?.receipt_status ?? null;
  }
  return null;
}
