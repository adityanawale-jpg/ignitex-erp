import { Response } from 'express';
import fs   from 'fs';
import path from 'path';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

// ── File helpers ──────────────────────────────────────────────
interface FileInput { name: string; dataUrl: string; size?: number }
interface SavedFile { name: string; url: string; type: string; size?: number }

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/gif': 'gif',  'image/webp': 'webp', 'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

async function saveCustomerFiles(customerId: number, files: FileInput[]): Promise<SavedFile[]> {
  const dir = path.join(__dirname, '../../uploads/customers', String(customerId));
  await fs.promises.mkdir(dir, { recursive: true });

  return Promise.all(files.map(async file => {
    const match = file.dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) throw new Error(`Invalid data URL for file: ${file.name}`);

    const mime = match[1].toLowerCase();
    const b64  = match[2];
    const ext  = MIME_EXT[mime] ?? 'bin';
    const type = mime.startsWith('image/') ? 'image' : ext;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${safe}`;

    await fs.promises.writeFile(path.join(dir, filename), Buffer.from(b64, 'base64'));

    return { name: file.name, url: `/uploads/customers/${customerId}/${filename}`, type, size: file.size };
  }));
}

// ── Sort helpers ──────────────────────────────────────────────
const SORT_COLS: Record<string, string> = {
  customer_code:         'customer_code',
  customer_company_name: 'customer_company_name',
  customer_name:         'customer_name',
  bus_relationship:      'bus_relationship',
  country_code:          'country_code',
  pan_card:              'pan_card',
  organization_type:     'organization_type',
  customer_type:         'customer_type',
  created_at:            'created_at',
};

// ── Duplicate checks — raw queries (see Supplier Master for why:
// LOWER(TRIM())/UPPER(TRIM()) matching isn't expressible via Prisma's
// contains/equals filters) ──────────────────────────────────────
export const checkCustomerName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const name      = ((req.query.name as string) || '').trim();
    const excludeId = req.query.exclude_id ? parseInt(req.query.exclude_id as string) : null;
    if (!name) { sendSuccess(res, { exists: false }); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM customer_master
        WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(${name}))
        AND (${excludeId}::int IS NULL OR id != ${excludeId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists === true });
  } catch (error) {
    sendError(res, 'Check failed', 500, (error as Error).message);
  }
};

export const checkCustomerCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company   = ((req.query.company as string) || '').trim();
    const excludeId = req.query.exclude_id ? parseInt(req.query.exclude_id as string) : null;
    if (!company) { sendSuccess(res, { exists: false }); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM customer_master
        WHERE LOWER(TRIM(customer_company_name)) = LOWER(TRIM(${company}))
        AND (${excludeId}::int IS NULL OR id != ${excludeId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists === true });
  } catch (error) {
    sendError(res, 'Check failed', 500, (error as Error).message);
  }
};

export const checkCustomerPan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pan       = ((req.query.pan as string) || '').trim().toUpperCase();
    const excludeId = req.query.exclude_id ? parseInt(req.query.exclude_id as string) : null;
    if (!pan) { sendSuccess(res, { exists: false }); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM customer_master
        WHERE UPPER(TRIM(pan_card)) = UPPER(TRIM(${pan}))
        AND (${excludeId}::int IS NULL OR id != ${excludeId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists === true });
  } catch (error) {
    sendError(res, 'Check failed', 500, (error as Error).message);
  }
};

export const checkCustomerGstin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const gstin     = ((req.query.gstin as string) || '').trim().toUpperCase();
    const excludeId = req.query.exclude_id ? parseInt(req.query.exclude_id as string) : null;
    if (!gstin) { sendSuccess(res, { exists: false }); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM customer_master
        WHERE UPPER(TRIM(gstin_uin_number)) = UPPER(TRIM(${gstin}))
        AND (${excludeId}::int IS NULL OR id != ${excludeId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists === true });
  } catch (error) {
    sendError(res, 'Check failed', 500, (error as Error).message);
  }
};

// ── GET /customers ────────────────────────────────────────────
export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'customer_company_name';
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

    let cfObj: Record<string, string> = {};
    try { if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string); } catch { /* ignore */ }

    const AND: Prisma.customer_masterWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { customer_code:         { contains: search, mode: 'insensitive' } },
          { customer_company_name: { contains: search, mode: 'insensitive' } },
          { customer_name:         { contains: search, mode: 'insensitive' } },
          { pan_card:              { contains: search, mode: 'insensitive' } },
          { customer_type:         { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    for (const col of ['customer_code', 'customer_company_name', 'bus_relationship', 'country_code', 'pan_card', 'organization_type', 'customer_type'] as const) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }

    const where: Prisma.customer_masterWhereInput = AND.length ? { AND } : {};

    const [total, dataRows] = await Promise.all([
      prisma.customer_master.count({ where }),
      prisma.customer_master.findMany({
        where,
        select: {
          id: true, customer_code: true, customer_company_name: true, customer_name: true,
          bus_relationship: true, country_code: true, pan_card: true, organization_type: true,
          customer_type: true, is_active: true, deactivation_reason: true, deactivated_at: true,
          created_at: true, updated_at: true,
        },
        orderBy: { [sortCol]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    // A customer can't be edited/deactivated while it still has an active
    // price list entry or a non-cancelled sales order against it.
    const ids = dataRows.map(r => r.id);
    const usedRows = ids.length
      ? await prisma.$queryRaw<{ customer_id: number }[]>(Prisma.sql`
          SELECT customer_id FROM customer_price_metal_hdr WHERE is_active = TRUE AND customer_id IN (${Prisma.join(ids)})
          UNION
          SELECT customer_id FROM customer_price_stone_hdr WHERE is_active = TRUE AND customer_id IN (${Prisma.join(ids)})
          UNION
          SELECT customer_id FROM sales_order_hdr WHERE order_status <> 'CANCELLED' AND customer_id IN (${Prisma.join(ids)})
        `)
      : [];
    const usedSet = new Set(usedRows.map(r => r.customer_id));
    const result = dataRows.map(r => ({ ...r, used_elsewhere: usedSet.has(r.id) }));

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, result, 'Customers fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch customers', 500, (error as Error).message);
  }
};

// ── GET /customers/stats ──────────────────────────────────────
export const getCustomerStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.customer_master.count({ where: { is_active: true } }),
      prisma.customer_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /customers/:id ────────────────────────────────────────
export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const customer = await prisma.customer_master.findUnique({
      where: { id },
      include: {
        customer_contact_info: { orderBy: { id: 'asc' } },
        customer_address_info: { orderBy: { id: 'asc' } },
      },
    });
    if (!customer) { sendError(res, 'Customer not found', 404); return; }

    const { customer_contact_info, customer_address_info, ...main } = customer;
    sendSuccess(res, {
      ...main,
      contacts:  customer_contact_info,
      addresses: customer_address_info,
    }, 'Customer fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch customer', 500, (error as Error).message);
  }
};

// ── POST /customers ───────────────────────────────────────────
export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Record<string, unknown>;
    if (!String(b.customer_name || '').trim()) {
      sendValidationError(res, 'Customer Name is required'); return;
    }
    if (!String(b.customer_company_name || '').trim()) {
      sendValidationError(res, 'Customer Company Name is required'); return;
    }
    if (!String(b.customer_display_name || '').trim()) {
      sendValidationError(res, 'Display Name is required'); return;
    }

    const contactsArr  = Array.isArray(b.contacts)  ? b.contacts  as Record<string, unknown>[] : [];
    const addressesArr = Array.isArray(b.addresses) ? b.addresses as Record<string, unknown>[] : [];

    // customer_code is populated by the trg_customer_code BEFORE INSERT trigger.
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer_master.create({
        data: {
          customer_name: String(b.customer_name || '').trim() || null,
          customer_company_name: String(b.customer_company_name || '').trim(),
          customer_display_name: String(b.customer_display_name || '').trim() || null,
          bus_relationship: (b.bus_relationship as string) || null,
          country_code: (b.country_code as string) || null,
          pan_card: (b.pan_card as string) || null,
          organization_type: (b.organization_type as string) || null,
          customer_type: (b.customer_type as string) || null,
          is_msme_reg: b.is_msme_reg === true || b.is_msme_reg === 'true',
          website_url: (b.website_url as string) || null,
          tax_payer_type: (b.tax_payer_type as string) || null,
          gstin_status: (b.gstin_status as string) || null,
          gstin_uin_number: (b.gstin_uin_number as string) || null,
          place_of_supply: (b.place_of_supply as string) || null,
          msme_udyam_reg_number: (b.msme_udyam_reg_number as string) || null,
          gst_treatment: (b.gst_treatment as string) || null,
          credit_limit_by_value: parseFloat(String(b.credit_limit_by_value || 0)) || 0,
          credit_limit_by_grams: parseFloat(String(b.credit_limit_by_grams || 0)) || 0,
          payment_terms: (b.payment_terms as string) || null,
          is_active: true,
          created_by: req.user?.id ?? null,
        },
        select: { id: true, customer_code: true },
      });

      if (contactsArr.length) {
        await tx.customer_contact_info.createMany({
          data: contactsArr.map(c => ({
            customer_id: customer.id,
            cont_first_name: (c.cont_first_name as string) || null, cont_last_name: (c.cont_last_name as string) || null,
            cont_email: (c.cont_email as string) || null, cont_job_title: (c.cont_job_title as string) || null,
            cont_country_code: (c.cont_country_code as string) || null, cont_mobile: (c.cont_mobile as string) || null,
            cont_is_admin: c.cont_is_admin === true || c.cont_is_admin === 'true',
          })),
        });
      }

      if (addressesArr.length) {
        await tx.customer_address_info.createMany({
          data: addressesArr.map(a => ({
            customer_id: customer.id,
            adrs_type: (a.adrs_type as string) || 'BILL_TO',
            // Bill To and Ship To share one structured shape — no free-text block.
            adrs_name: (a.adrs_name as string) || null, adrs_country_code: (a.adrs_country_code as string) || null,
            adrs_1: (a.adrs_1 as string) || null, adrs_2: (a.adrs_2 as string) || null, adrs_3: (a.adrs_3 as string) || null,
            adrs_city_name: (a.adrs_city_name as string) || null, adrs_state_code: (a.adrs_state_code as string) || null,
            adrs_pincode: (a.adrs_pincode as string) || null, adrs_email: (a.adrs_email as string) || null,
            adrs_phone_number_country_code: (a.adrs_phone_number_country_code as string) || null,
            adrs_phone_number: (a.adrs_phone_number as string) || null, adrs_extension: (a.adrs_extension as string) || null,
          })),
        });
      }

      return customer;
    });

    const files = (b.files as FileInput[] | undefined) ?? [];
    const existingDocs = (b.existing_docs as SavedFile[] | undefined) ?? [];
    if (files.length > 0) {
      const saved = await saveCustomerFiles(result.id, files);
      const allDocs = [...existingDocs, ...saved];
      await prisma.customer_master.update({ where: { id: result.id }, data: { upload_doc: JSON.stringify(allDocs) } });
    }

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'CREATE', module: AUDIT_MODULE.CUSTOMER_MASTER, recordId: result.id,
      description: `Created customer: ${result.customer_code} — ${String(b.customer_company_name || '')}`,
      newValues: b, ipAddress: req.ip,
    });

    sendSuccess(res, result, 'Customer created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create customer', 500, (error as Error).message);
  }
};

// ── PUT /customers/:id ────────────────────────────────────────
export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const b = req.body as Record<string, unknown>;
    if (!String(b.customer_name || '').trim()) {
      sendValidationError(res, 'Customer Name is required'); return;
    }
    if (!String(b.customer_company_name || '').trim()) {
      sendValidationError(res, 'Customer Company Name is required'); return;
    }
    if (!String(b.customer_display_name || '').trim()) {
      sendValidationError(res, 'Display Name is required'); return;
    }

    const contactsArr  = Array.isArray(b.contacts)  ? b.contacts  as Record<string, unknown>[] : [];
    const addressesArr = Array.isArray(b.addresses) ? b.addresses as Record<string, unknown>[] : [];

    // updateMany (not update) — matches the original, which never checked
    // rows affected and so never 404'd on a non-existent id here either
    // (same quirk as Supplier Master, preserved deliberately).
    await prisma.$transaction(async (tx) => {
      await tx.customer_master.updateMany({
        where: { id },
        data: {
          customer_name: String(b.customer_name || '').trim() || null,
          customer_company_name: String(b.customer_company_name || '').trim(),
          customer_display_name: String(b.customer_display_name || '').trim() || null,
          bus_relationship: (b.bus_relationship as string) || null,
          country_code: (b.country_code as string) || null,
          pan_card: (b.pan_card as string) || null,
          organization_type: (b.organization_type as string) || null,
          customer_type: (b.customer_type as string) || null,
          is_msme_reg: b.is_msme_reg === true || b.is_msme_reg === 'true',
          website_url: (b.website_url as string) || null,
          tax_payer_type: (b.tax_payer_type as string) || null,
          gstin_status: (b.gstin_status as string) || null,
          gstin_uin_number: (b.gstin_uin_number as string) || null,
          place_of_supply: (b.place_of_supply as string) || null,
          msme_udyam_reg_number: (b.msme_udyam_reg_number as string) || null,
          gst_treatment: (b.gst_treatment as string) || null,
          credit_limit_by_value: parseFloat(String(b.credit_limit_by_value || 0)) || 0,
          credit_limit_by_grams: parseFloat(String(b.credit_limit_by_grams || 0)) || 0,
          payment_terms: (b.payment_terms as string) || null,
          updated_by: req.user?.id ?? null,
          updated_at: new Date(),
        },
      });

      await tx.customer_contact_info.deleteMany({ where: { customer_id: id } });
      await tx.customer_address_info.deleteMany({ where: { customer_id: id } });

      if (contactsArr.length) {
        await tx.customer_contact_info.createMany({
          data: contactsArr.map(c => ({
            customer_id: id,
            cont_first_name: (c.cont_first_name as string) || null, cont_last_name: (c.cont_last_name as string) || null,
            cont_email: (c.cont_email as string) || null, cont_job_title: (c.cont_job_title as string) || null,
            cont_country_code: (c.cont_country_code as string) || null, cont_mobile: (c.cont_mobile as string) || null,
            cont_is_admin: c.cont_is_admin === true || c.cont_is_admin === 'true',
          })),
        });
      }

      if (addressesArr.length) {
        await tx.customer_address_info.createMany({
          data: addressesArr.map(a => ({
            customer_id: id,
            adrs_type: (a.adrs_type as string) || 'BILL_TO',
            adrs_name: (a.adrs_name as string) || null, adrs_country_code: (a.adrs_country_code as string) || null,
            adrs_1: (a.adrs_1 as string) || null, adrs_2: (a.adrs_2 as string) || null, adrs_3: (a.adrs_3 as string) || null,
            adrs_city_name: (a.adrs_city_name as string) || null, adrs_state_code: (a.adrs_state_code as string) || null,
            adrs_pincode: (a.adrs_pincode as string) || null, adrs_email: (a.adrs_email as string) || null,
            adrs_phone_number_country_code: (a.adrs_phone_number_country_code as string) || null,
            adrs_phone_number: (a.adrs_phone_number as string) || null, adrs_extension: (a.adrs_extension as string) || null,
          })),
        });
      }
    });

    const files = (b.files as FileInput[] | undefined) ?? [];
    const existingDocs = (b.existing_docs as SavedFile[] | undefined) ?? [];
    if (files.length > 0 || existingDocs.length >= 0) {
      const saved = files.length > 0 ? await saveCustomerFiles(id, files) : [];
      const allDocs = [...existingDocs, ...saved];
      await prisma.customer_master.updateMany({ where: { id }, data: { upload_doc: allDocs.length > 0 ? JSON.stringify(allDocs) : null } });
    }

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.CUSTOMER_MASTER, recordId: id,
      description: `Updated customer ID ${id}: ${String(b.customer_company_name || '')}`,
      newValues: b, ipAddress: req.ip,
    });

    sendSuccess(res, { id }, 'Customer updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update customer', 500, (error as Error).message);
  }
};

// ── DELETE /customers/:id  (toggle status) ────────────────────
export const toggleCustomerStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; customer_code: string; customer_company_name: string }[]>(
      Prisma.sql`
        UPDATE customer_master
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, customer_code, customer_company_name
      `
    );

    if (!rows.length) { sendError(res, 'Customer not found', 404); return; }
    const { is_active, customer_code, customer_company_name } = rows[0];

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'DELETE', module: AUDIT_MODULE.CUSTOMER_MASTER, recordId: id,
      description: `${is_active ? 'Activated' : 'Deactivated'} customer: ${customer_code} — ${customer_company_name}${!is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress: req.ip,
    });

    sendSuccess(res, { id, is_active }, is_active ? 'Customer activated' : 'Customer deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle customer status', 500, (error as Error).message);
  }
};
