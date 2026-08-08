import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import { BOM_STATUS } from '../constants/bomWorkflow';
import { getQuery } from '../utils/queryConfig';

// ── Sort column whitelist (controller logic, not SQL) ────────────
const SORT_COLS: Record<string, string> = {
  sku_code:        'iv.sku_code',
  karat_color:     'iv.karat_color',
  weight_band:     'iv.weight_band',
  size:            'iv.size',
  collection_name: 'im.collection_name',
  design_code:     'im.design_code',
  design_no:       'im.design_no',
  product_name:    'im.product_name',
  bom_status:      `COALESCE(bf.bom_status,'${BOM_STATUS.NO_BOM}')`,
  bom_version:     'bf.bom_version',
  bom_updated_at:  'bf.updated_at',
};

// ── Dynamic WHERE builder (runtime filter logic — cannot be stored in config) ─
function buildWhere(status: string, search: string, cfObj: Record<string, string>) {
  const params: unknown[] = [];
  let idx = 1;
  const p = (v: unknown) => { params.push(v); return `$${idx++}`; };

  const conds: string[] = [`iv.is_active = TRUE`, `im.is_active = TRUE`];

  if (status === BOM_STATUS.DRAFT) {
    conds.push(`(bf.bom_status = '${BOM_STATUS.DRAFT}' OR bf.id IS NULL)`);
  } else if (status === BOM_STATUS.PENDING_APPROVAL) {
    conds.push(`bf.bom_status = '${BOM_STATUS.PENDING_APPROVAL}'`);
  } else if (status === BOM_STATUS.ACTIVE) {
    conds.push(`bf.bom_status = '${BOM_STATUS.ACTIVE}'`);
  }

  if (search) {
    const sp = p(`%${search}%`);
    conds.push(
      `(iv.sku_code ILIKE ${sp} OR im.design_code ILIKE ${sp} ` +
      `OR COALESCE(im.collection_name,'') ILIKE ${sp} OR COALESCE(im.product_name,'') ILIKE ${sp})`,
    );
  }

  const CF_COLS: Record<string, string> = {
    sku_code: 'iv.sku_code', karat_color: 'iv.karat_color',
    weight_band: 'iv.weight_band', size: 'iv.size',
    collection_name: 'im.collection_name', design_code: 'im.design_code',
    product_name: 'im.product_name',
  };
  for (const [key, col] of Object.entries(CF_COLS)) {
    if (cfObj[key]) conds.push(`COALESCE(${col},'') ILIKE ${p(`%${cfObj[key]}%`)}`);
  }
  if (cfObj['bom_status']) {
    conds.push(`COALESCE(bf.bom_status,'${BOM_STATUS.NO_BOM}') = ${p(cfObj['bom_status'])}`);
  }

  return { where: `WHERE ${conds.join(' AND ')}`, params };
}

// ── GET /fg-bom  (paginated list) ────────────────────────────────
export const getFGBOMList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status  as string) || BOM_STATUS.DRAFT;
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'iv.sku_code';
    const sortDir = req.query.sort_dir === 'desc' ? 'DESC' : 'ASC';

    let cfObj: Record<string, string> = {};
    try { if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string); } catch { /* */ }

    const { where, params: wp } = buildWhere(status, search, cfObj);

    const [selectBase, countBase] = await Promise.all([
      getQuery('fg_bom_list_select'),
      getQuery('fg_bom_list_count'),
    ]);

    const countSql = `${countBase} ${where}`;
    const dataSql  = `${selectBase} ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${wp.length + 1} OFFSET $${wp.length + 2}`;

    const [countRes, dataRes] = await Promise.all([
      prisma.$queryRawUnsafe<Record<string, string>[]>(countSql, ...wp),
      prisma.$queryRawUnsafe(dataSql, ...wp, limit, offset),
    ]);

    const total = parseInt(countRes[0]?.total ?? '0');
    sendSuccess(res, dataRes, 'FG BOM list fetched', 200, {
      total, page, limit, total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    sendError(res, 'Failed to fetch FG BOM list', 500, String(err));
  }
};

// ── GET /fg-bom/stats ────────────────────────────────────────────
export const getFGBOMStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sql  = await getQuery('fg_bom_stats');
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
    sendSuccess(res, rows[0] ?? { draft: 0, pending_approval: 0, active: 0 });
  } catch (err) {
    sendError(res, 'Failed to fetch stats', 500, String(err));
  }
};

// ── GET /fg-bom/variant/:variantId ───────────────────────────────
export const getFGBOMByVariant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const variantId = parseInt(req.params.variantId);
    if (isNaN(variantId)) { sendValidationError(res, 'Invalid variant ID'); return; }

    const [headerSql, bomSql, detailSql] = await Promise.all([
      getQuery('fg_bom_variant_header'),
      getQuery('fg_bom_by_variant'),
      getQuery('fg_bom_detail_get'),
    ]);

    const [headerRes, bomRes] = await Promise.all([
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(headerSql, variantId),
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(bomSql, variantId),
    ]);

    if (!headerRes.length) { sendNotFound(res, 'Variant not found'); return; }

    const header = headerRes[0];
    const bom    = bomRes[0] ?? null;

    let lines: unknown[] = [];

    if (bom) {
      lines = await prisma.$queryRawUnsafe(detailSql, bom.id as number);
    }

    sendSuccess(res, { ...header, bom, lines });
  } catch (err) {
    sendError(res, 'Failed to fetch BOM', 500, String(err));
  }
};

// ── POST /fg-bom  &  PUT /fg-bom/:id ────────────────────────────
export const saveFGBOM = async (req: AuthRequest, res: Response): Promise<void> => {
  const isUpdate = !!req.params?.id;
  const bomId    = isUpdate ? parseInt(req.params.id) : null;
  const userId   = req.user?.id;

  try {
    const {
      variant_id, min_weight, max_weight, effective_from, effective_to, remarks,
      gross_weight, net_weight, stone_cts, stone_gms, component_weight,
      lines = [],
    } = req.body;

    if (!variant_id) { sendValidationError(res, 'variant_id is required'); return; }

    // Pre-fetch all SQL needed inside the transaction
    const [
      variantCheckSql, statusCheckSql, versionSql,
      createSql, updateSql, detailDeleteSql, detailInsertSql,
    ] = await Promise.all([
      getQuery('fg_bom_variant_check'),
      getQuery('fg_bom_status_check'),
      getQuery('fg_bom_version_new'),
      getQuery('fg_bom_create'),
      getQuery('fg_bom_update'),
      getQuery('fg_bom_detail_delete'),
      getQuery('fg_bom_detail_insert'),
    ]);

    const vRes = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(variantCheckSql, variant_id);
    if (!vRes.length) { sendNotFound(res, 'Variant not found'); return; }

    if (isUpdate && bomId) {
      const bRes = await prisma.$queryRawUnsafe<{ bom_status: string }[]>(statusCheckSql, bomId);
      if (!bRes.length) { sendNotFound(res, 'BOM not found'); return; }
      if (bRes[0].bom_status !== BOM_STATUS.DRAFT) {
        sendValidationError(res, 'Only DRAFT BOMs can be edited'); return;
      }
    }

    type LineRow = { item_type?: string; bom_type?: string; item_id: number; item_code?: string; item_name?: string;
                     item_quantity?: number; uom1_code?: string; purity_code?: string;
                     gross_weight?: number; net_weight?: number;
                     stone_cts?: number; stone_gms?: number;
                     component_weight?: number; remarks?: string };

    const result = await prisma.$transaction(async (tx) => {
      let savedId = bomId;

      if (isUpdate && bomId) {
        await tx.$queryRawUnsafe(updateSql,
          min_weight || null, max_weight || null, effective_from || null, effective_to || null,
          remarks || null, gross_weight || 0, net_weight || 0, stone_cts || 0, stone_gms || 0,
          component_weight || 0, userId, bomId,
        );
      } else {
        const verRes = await tx.$queryRawUnsafe<{ nv: number }[]>(versionSql, variant_id);
        const version = `${verRes[0].nv}.0`;

        const ins = await tx.$queryRawUnsafe<{ id: number }[]>(createSql,
          variant_id, version,
          min_weight || null, max_weight || null,
          gross_weight || 0, net_weight || 0, stone_cts || 0, stone_gms || 0,
          component_weight || 0,
          effective_from || null, effective_to || null, remarks || null, userId,
        );
        savedId = ins[0].id;
      }

      await tx.$queryRawUnsafe(detailDeleteSql, savedId);

      for (const [i, ln] of (lines as LineRow[]).entries()) {
        const itemType = ln.item_type || ln.bom_type || null;
        await tx.$queryRawUnsafe(detailInsertSql,
          savedId,                      // $1  bom_id
          itemType,                     // $2  bom_type (same as item_type)
          itemType,                     // $3  item_type
          i + 1,                        // $4  seq_no
          ln.item_id,                   // $5  item_id
          ln.item_code   || null,       // $6  item_code
          ln.item_name   || null,       // $7  item_name
          ln.item_quantity || 1,        // $8  item_quantity
          ln.uom1_code   || null,       // $9  uom1_code
          null,                         // $10 item_weight (legacy, unused in new design)
          null,                         // $11 uom2_code (legacy)
          ln.purity_code || null,       // $12 purity_code
          null,                         // $13 pure_weight (legacy)
          null,                         // $14 weight_gms (legacy)
          ln.gross_weight    || null,   // $15 gross_weight
          ln.net_weight      || null,   // $16 net_weight
          ln.stone_cts       || null,   // $17 stone_cts
          ln.stone_gms       || null,   // $18 stone_gms
          ln.component_weight || null,  // $19 component_weight
          ln.remarks     || null,       // $20 remarks
          userId,                       // $21 created_by
        );
      }

      // Recompute the header's weight/carat totals from the detail rows
      // just written, rather than trusting whatever the client sent above —
      // the DB is the single source of truth for these totals (finding Y).
      await tx.$executeRawUnsafe('SELECT fn_bom_fg_recalc_header($1)', savedId);

      return { id: savedId };
    });

    logAudit({
      userId, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: isUpdate ? 'UPDATE' : 'CREATE',
      module: AUDIT_MODULE.FG_BOM, recordId: result.id ?? undefined,
      description: `${isUpdate ? 'Updated' : 'Created'} FG BOM for variant ${variant_id}`,
      ipAddress: req.ip,
    });

    sendSuccess(res, { id: result.id }, isUpdate ? 'BOM updated' : 'BOM created', isUpdate ? 200 : 201);
  } catch (err) {
    sendError(res, 'Failed to save BOM', 500, String(err));
  }
};

// ── POST /fg-bom/:id/submit ──────────────────────────────────────
export const submitFGBOM = async (req: AuthRequest, res: Response): Promise<void> => {
  const bomId  = parseInt(req.params.id);
  const userId = req.user?.id;
  try {
    const [statusCheckSql, submitSql] = await Promise.all([
      getQuery('fg_bom_status_check'),
      getQuery('fg_bom_submit'),
    ]);

    const rows = await prisma.$queryRawUnsafe<{ bom_status: string }[]>(statusCheckSql, bomId);
    if (!rows.length) { sendNotFound(res, 'BOM not found'); return; }
    if (rows[0].bom_status !== BOM_STATUS.DRAFT) {
      sendValidationError(res, 'Only DRAFT BOMs can be submitted'); return;
    }

    await prisma.$queryRawUnsafe(submitSql, userId, bomId);

    logAudit({ userId, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.FG_BOM, recordId: bomId,
      description: `Submitted FG BOM ${bomId} for approval`, ipAddress: req.ip });
    sendSuccess(res, { id: bomId, bom_status: BOM_STATUS.PENDING_APPROVAL }, 'BOM submitted for approval');
  } catch (err) {
    sendError(res, 'Failed to submit BOM', 500, String(err));
  }
};

// ── POST /fg-bom/:id/approve ─────────────────────────────────────
export const approveFGBOM = async (req: AuthRequest, res: Response): Promise<void> => {
  const bomId  = parseInt(req.params.id);
  const userId = req.user?.id;
  try {
    const [statusCheckSql, approveSql, wfSyncSql] = await Promise.all([
      getQuery('fg_bom_status_check'),
      getQuery('fg_bom_approve'),
      getQuery('fg_bom_approve_wf_sync'),
    ]);

    const rows = await prisma.$queryRawUnsafe<{ bom_status: string }[]>(statusCheckSql, bomId);
    if (!rows.length) { sendNotFound(res, 'BOM not found'); return; }
    if (rows[0].bom_status !== BOM_STATUS.PENDING_APPROVAL) {
      sendValidationError(res, 'Only PENDING_APPROVAL BOMs can be approved'); return;
    }

    await prisma.$queryRawUnsafe(approveSql, userId, bomId);
    await prisma.$queryRawUnsafe(wfSyncSql, bomId);

    logAudit({ userId, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.FG_BOM, recordId: bomId,
      description: `Approved FG BOM ${bomId}`, ipAddress: req.ip });
    sendSuccess(res, { id: bomId, bom_status: BOM_STATUS.ACTIVE }, 'BOM approved successfully');
  } catch (err) {
    sendError(res, 'Failed to approve BOM', 500, String(err));
  }
};

// ── POST /fg-bom/:id/reject ──────────────────────────────────────
export const rejectFGBOM = async (req: AuthRequest, res: Response): Promise<void> => {
  const bomId  = parseInt(req.params.id);
  const userId = req.user?.id;
  try {
    const [statusCheckSql, rejectSql, wfSyncSql] = await Promise.all([
      getQuery('fg_bom_status_check'),
      getQuery('fg_bom_reject'),
      getQuery('fg_bom_reject_wf_sync'),
    ]);

    const rows = await prisma.$queryRawUnsafe<{ bom_status: string }[]>(statusCheckSql, bomId);
    if (!rows.length) { sendNotFound(res, 'BOM not found'); return; }
    if (rows[0].bom_status !== BOM_STATUS.PENDING_APPROVAL) {
      sendValidationError(res, 'Only PENDING_APPROVAL BOMs can be rejected'); return;
    }

    const reason = ((req.body.rejection_reason as string) || '').trim();
    await prisma.$queryRawUnsafe(rejectSql, userId, reason || null, bomId);
    await prisma.$queryRawUnsafe(wfSyncSql, bomId);

    logAudit({ userId, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.FG_BOM, recordId: bomId,
      description: `Rejected FG BOM ${bomId}. Reason: ${reason}`, ipAddress: req.ip });
    sendSuccess(res, { id: bomId, bom_status: BOM_STATUS.DRAFT }, 'BOM rejected — returned to Draft');
  } catch (err) {
    sendError(res, 'Failed to reject BOM', 500, String(err));
  }
};

// ── POST /fg-bom/:id/rfc ─────────────────────────────────────────
export const rfcFGBOM = async (req: AuthRequest, res: Response): Promise<void> => {
  const bomId  = parseInt(req.params.id);
  const userId = req.user?.id;
  try {
    const [activeGetSql, versionSql, rfcCreateSql, rfcDetailCopySql] = await Promise.all([
      getQuery('fg_bom_active_get'),
      getQuery('fg_bom_version_rfc'),
      getQuery('fg_bom_rfc_create'),
      getQuery('fg_bom_rfc_detail_copy'),
    ]);

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(activeGetSql, bomId);
    if (!rows.length) { sendNotFound(res, 'BOM not found'); return; }
    const bom = rows[0];
    if (bom.bom_status !== BOM_STATUS.ACTIVE) {
      sendValidationError(res, 'Only ACTIVE BOMs can raise an RFC'); return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const verRes = await tx.$queryRawUnsafe<{ nv: unknown }[]>(versionSql, bom.variant_id);
      const nextVersion = `${parseInt(String(verRes[0].nv)) + 1}.0`;

      const ins = await tx.$queryRawUnsafe<{ id: number }[]>(rfcCreateSql,
        bom.variant_id, nextVersion,
        bom.min_weight ?? null, bom.max_weight ?? null,
        bom.gross_weight ?? 0, bom.net_weight ?? 0,
        bom.stone_cts ?? 0, bom.stone_gms ?? 0,
        bom.component_weight ?? 0,
        bom.effective_from ?? null, bom.effective_to ?? null,
        bom.remarks ?? null, userId,
      );
      const newBomId = ins[0].id;

      await tx.$queryRawUnsafe(rfcDetailCopySql, newBomId, userId, bomId);

      return { id: newBomId, bom_version: nextVersion };
    });

    logAudit({
      userId, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'CREATE', module: AUDIT_MODULE.FG_BOM, recordId: result.id,
      description: `RFC raised from BOM ${bomId} — new draft v${result.bom_version} created`,
      ipAddress: req.ip,
    });

    sendSuccess(res, result, `RFC created — new Draft BOM v${result.bom_version}`, 201);
  } catch (err) {
    sendError(res, 'Failed to create RFC', 500, String(err));
  }
};

// ── GET /fg-bom/lov/:type ────────────────────────────────────────
export const getFGBOMLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type       = req.params.type as string;
    const search     = ((req.query.search as string) || '').trim();
    const karatColor = ((req.query.karat_color as string) || '').trim();
    const groupSales = ((req.query.group_sales as string) || '').trim();
    // '%' alone means "show all" — treat it the same as empty search
    const sp = (search && search !== '%') ? `%${search}%` : '%%';

    // findings: search ACTIVE Finding BOMs — returns weights from bom_fin header
    if (type === 'findings') {
      const rows = await prisma.$queryRaw(Prisma.sql`
        SELECT iv.id,
               iv.sku_code AS code,
               CONCAT_WS(' — ', iv.sku_code,
                 COALESCE(im.product_name, im.collection_name, im.manufacturing_name)) AS name,
               iv.karat_color, iv.weight_band, im.collection_name,
               COALESCE(iv.group_sales, im.group_sales) AS group_sales,
               bf.gross_weight, bf.net_weight, bf.stone_cts, bf.stone_gms
        FROM   bom_fin bf
        JOIN   fin_item_variant iv ON iv.id = bf.variant_id
        JOIN   fin_item_master  im ON im.id = iv.item_id
        WHERE  bf.bom_status = ${BOM_STATUS.ACTIVE}
          AND  bf.is_active  = TRUE
          AND  iv.is_active  = TRUE
          AND  im.is_active  = TRUE
          AND (iv.sku_code                          ILIKE ${sp}
            OR COALESCE(im.product_name,       '') ILIKE ${sp}
            OR COALESCE(im.manufacturing_name, '') ILIKE ${sp})
          -- Group Sales is captured per variant in Finding Master; the master-level
          -- column is a fallback. Unclassified SKUs stay visible rather than being
          -- silently filtered out (a NULL = 'RETAIL' comparison is never true).
          AND (${groupSales} = ''
            OR COALESCE(iv.group_sales, im.group_sales) IS NULL
            OR COALESCE(iv.group_sales, im.group_sales) = ${groupSales})
        ORDER  BY iv.sku_code LIMIT 60
      `);
      sendSuccess(res, rows);
      return;
    }

    // fg: search FG Master variants — same shape/filters as 'findings', but the
    // BOM is optional (a customer price may be set for an FG SKU with no BOM yet),
    // so weights come from a LEFT JOIN on the ACTIVE bom_fg header when present.
    if (type === 'fg') {
      const rows = await prisma.$queryRaw(Prisma.sql`
        SELECT iv.id,
               iv.sku_code AS code,
               CONCAT_WS(' — ', iv.sku_code,
                 COALESCE(im.product_name, im.collection_name, im.manufacturing_name)) AS name,
               iv.karat_color, iv.weight_band, im.collection_name,
               COALESCE(iv.group_sales, im.group_sales) AS group_sales,
               bf.gross_weight, bf.net_weight, bf.stone_cts, bf.stone_gms
        FROM   fg_item_variant iv
        JOIN   fg_item_master  im ON im.id = iv.item_id
        LEFT   JOIN LATERAL (
                 SELECT b.gross_weight, b.net_weight, b.stone_cts, b.stone_gms
                 FROM   bom_fg b
                 WHERE  b.variant_id = iv.id
                   AND  b.bom_status = ${BOM_STATUS.ACTIVE}
                   AND  b.is_active  = TRUE
                 ORDER  BY b.id DESC
                 LIMIT  1
               ) bf ON TRUE
        WHERE  iv.is_active = TRUE
          AND  im.is_active = TRUE
          AND (iv.sku_code                          ILIKE ${sp}
            OR COALESCE(im.product_name,       '') ILIKE ${sp}
            OR COALESCE(im.manufacturing_name, '') ILIKE ${sp})
          -- Same as 'findings': FG Master captures Group Sales on the variant card,
          -- so filtering im.group_sales alone matched nothing.
          AND (${groupSales} = ''
            OR COALESCE(iv.group_sales, im.group_sales) IS NULL
            OR COALESCE(iv.group_sales, im.group_sales) = ${groupSales})
        ORDER  BY iv.sku_code LIMIT 60
      `);
      sendSuccess(res, rows);
      return;
    }

    // stones: always inline — includes std_cts for BOM auto-fill without cache dependency
    if (type === 'stones') {
      const rows = await prisma.$queryRaw(Prisma.sql`
        SELECT id,
               stn_code AS code,
               TRIM(CONCAT_WS(' ', stn_type, stn_shape,
                 COALESCE(stn_quality,''), COALESCE(stn_size,''))) AS name,
               stn_type, stn_shape, stn_quality, stn_color, stn_size, std_cts
        FROM   stone_item_master
        WHERE  is_active = TRUE AND stn_code ILIKE ${sp}
        ORDER  BY stn_code LIMIT 60
      `);
      sendSuccess(res, rows);
      return;
    }

    const keyMap: Record<string, string> = {
      components: 'fg_bom_lov_components',
      metals:     'fg_bom_lov_metals',
      // BOM-line fallback for item types with no dedicated LOV — plain FG SKU search
      variants:   'fg_bom_lov_variants',
    };

    const key = keyMap[type];
    if (!key) { sendError(res, `Unknown LOV type: ${type}`, 400); return; }

    const sql  = await getQuery(key);
    const rows = await prisma.$queryRawUnsafe(sql, sp);
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, 'Failed to fetch LOV', 500, String(err));
  }
};
