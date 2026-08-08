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

async function saveSupplierFiles(supplierId: number, files: FileInput[]): Promise<SavedFile[]> {
  const dir = path.join(__dirname, '../../uploads/suppliers', String(supplierId));
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

    return { name: file.name, url: `/uploads/suppliers/${supplierId}/${filename}`, type, size: file.size };
  }));
}

// ── Sort helpers ──────────────────────────────────────────────
const SORT_COLS: Record<string, string> = {
  vendor_code:          'vendor_code',
  vendor_company_name:  'vendor_company_name',
  bus_relationship:     'bus_relationship',
  country_code:         'country_code',
  pan_card:             'pan_card',
  organization_type:    'organization_type',
  vendor_type:          'vendor_type',
  created_at:           'created_at',
};

// ── GET /suppliers ────────────────────────────────────────────
export const getSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'vendor_company_name';
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

    let cfObj: Record<string, string> = {};
    try { if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string); } catch { /* ignore */ }

    const AND: Prisma.supplier_masterWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { vendor_code:         { contains: search, mode: 'insensitive' } },
          { vendor_company_name: { contains: search, mode: 'insensitive' } },
          { pan_card:            { contains: search, mode: 'insensitive' } },
          { vendor_type:         { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    for (const col of ['vendor_code', 'vendor_company_name', 'bus_relationship', 'country_code', 'pan_card', 'organization_type', 'vendor_type'] as const) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }

    const where: Prisma.supplier_masterWhereInput = AND.length ? { AND } : {};

    const [total, dataRows] = await Promise.all([
      prisma.supplier_master.count({ where }),
      prisma.supplier_master.findMany({
        where,
        select: {
          id: true, vendor_code: true, vendor_company_name: true, bus_relationship: true,
          country_code: true, pan_card: true, organization_type: true, vendor_type: true,
          is_msme_reg: true, is_active: true, deactivation_reason: true, deactivated_at: true,
          created_at: true, updated_at: true,
        },
        orderBy: { [sortCol]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    // A supplier can't be edited/deactivated while it still has an active
    // rate contract against it.
    const ids = dataRows.map(r => r.id);
    const usedRows = ids.length
      ? await prisma.$queryRaw<{ vendor_id: number }[]>(Prisma.sql`
          SELECT vendor_id FROM supplier_rate_contract WHERE is_active = TRUE AND vendor_id IN (${Prisma.join(ids)})
        `)
      : [];
    const usedSet = new Set(usedRows.map(r => r.vendor_id));
    const result = dataRows.map(r => ({ ...r, used_elsewhere: usedSet.has(r.id) }));

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, result, 'Suppliers fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch suppliers', 500, (error as Error).message);
  }
};

// ── GET /suppliers/stats ──────────────────────────────────────
export const getSupplierStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.supplier_master.count({ where: { is_active: true } }),
      prisma.supplier_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /suppliers/:id ────────────────────────────────────────
export const getSupplierById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const supplier = await prisma.supplier_master.findUnique({
      where: { id },
      include: {
        supplier_contact_info: { orderBy: { id: 'asc' } },
        supplier_address_info: { orderBy: { id: 'asc' } },
        supplier_bank_detail:  { orderBy: { id: 'asc' } },
      },
    });
    if (!supplier) { sendError(res, 'Supplier not found', 404); return; }

    const { supplier_contact_info, supplier_address_info, supplier_bank_detail, ...main } = supplier;
    sendSuccess(res, {
      ...main,
      contacts:  supplier_contact_info,
      addresses: supplier_address_info,
      banks:     supplier_bank_detail,
    }, 'Supplier fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch supplier', 500, (error as Error).message);
  }
};

// ── GET /suppliers/check-name ─────────────────────────────────
// Kept as raw queries (here and the 3 checks below): the original SQL
// does LOWER(TRIM())/UPPER(TRIM()) case+whitespace-insensitive matching,
// which Prisma's `contains`/`equals` filters can't express (no TRIM).
export const checkSupplierName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const name      = String(req.query.name || '').trim();
    const excludeId = parseInt(req.query.exclude_id as string, 10) || null;
    if (!name) { sendValidationError(res, 'Name is required'); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM supplier_master
        WHERE LOWER(TRIM(vendor_company_name)) = LOWER(TRIM(${name}))
        AND (${excludeId}::int IS NULL OR id != ${excludeId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists ?? false });
  } catch (error) {
    sendError(res, 'Failed to check supplier name', 500, (error as Error).message);
  }
};

// ── GET /suppliers/check-pan ──────────────────────────────────
export const checkSupplierPan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pan       = String(req.query.pan || '').trim().toUpperCase();
    const excludeId = parseInt(req.query.exclude_id as string, 10) || null;
    if (!pan) { sendValidationError(res, 'PAN is required'); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM supplier_master
        WHERE UPPER(TRIM(pan_card)) = UPPER(TRIM(${pan}))
        AND (${excludeId}::int IS NULL OR id != ${excludeId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists ?? false });
  } catch (error) {
    sendError(res, 'Failed to check PAN', 500, (error as Error).message);
  }
};

// ── GET /suppliers/check-gstin ────────────────────────────────
export const checkSupplierGstin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const gstin     = String(req.query.gstin || '').trim().toUpperCase();
    const excludeId = parseInt(req.query.exclude_id as string, 10) || null;
    if (!gstin) { sendValidationError(res, 'GSTIN is required'); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM supplier_master
        WHERE UPPER(TRIM(gstin_uin_number)) = UPPER(TRIM(${gstin}))
        AND (${excludeId}::int IS NULL OR id != ${excludeId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists ?? false });
  } catch (error) {
    sendError(res, 'Failed to check GSTIN', 500, (error as Error).message);
  }
};

// ── GET /suppliers/check-bank-account ────────────────────────
export const checkSupplierBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accountNumber = String(req.query.account_number || '').trim();
    const excludeSuppId = parseInt(req.query.exclude_supplier_id as string, 10) || null;
    if (!accountNumber) { sendValidationError(res, 'Account number is required'); return; }
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(
        SELECT 1 FROM supplier_bank_detail sbd
        JOIN supplier_master sm ON sm.id = sbd.supplier_id
        WHERE TRIM(sbd.bank_account_number) = TRIM(${accountNumber})
        AND (${excludeSuppId}::int IS NULL OR sbd.supplier_id != ${excludeSuppId})
      ) AS exists`
    );
    sendSuccess(res, { exists: rows[0]?.exists ?? false });
  } catch (error) {
    sendError(res, 'Failed to check bank account', 500, (error as Error).message);
  }
};

type ContactIn    = { cont_first_name?: string; cont_last_name?: string; cont_email?: string; cont_job_title?: string; cont_country_code?: string; cont_mobile?: string; cont_is_admin?: boolean; cont_is_supplier_portal?: boolean };
type AddressIn    = { adrs_name?: string; adrs_country_code?: string; adrs_1?: string; adrs_2?: string; adrs_3?: string; adrs_city_name?: string; adrs_state_code?: string; adrs_pincode?: string; adrs_email?: string; adrs_phone_number_country_code?: string; adrs_phone_number?: string; adrs_extension?: string };
type BankDetailIn = { bank_country_code?: string; bank_name?: string; bank_branch_name?: string; bank_account_number?: string; bank_account_holder?: string; bank_account_type?: string; bank_account_currency_code?: string };

// ── POST /suppliers ───────────────────────────────────────────
export const createSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Record<string, unknown>;
    if (!String(b.vendor_company_name || '').trim()) {
      sendValidationError(res, 'Vendor Company Name is required'); return;
    }

    const contacts    = (b.contacts    as ContactIn[]    | undefined) ?? [];
    const addresses   = (b.addresses   as AddressIn[]    | undefined) ?? [];
    const bankDetails = (b.bankDetails as BankDetailIn[] | undefined) ?? [];

    // vendor_code is populated by the trg_supplier_code BEFORE INSERT trigger.
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier_master.create({
        data: {
          vendor_company_name: String(b.vendor_company_name || '').trim(),
          bus_relationship: (b.bus_relationship as string) || null,
          country_code: (b.country_code as string) || null,
          pan_card: (b.pan_card as string) || null,
          organization_type: (b.organization_type as string) || null,
          vendor_type: (b.vendor_type as string) || null,
          is_msme_reg: b.is_msme_reg === true || b.is_msme_reg === 'true',
          vendor_url: (b.vendor_url as string) || null,
          gstin_uin_number: (b.gstin_uin_number as string) || null,
          place_of_supply: (b.place_of_supply as string) || null,
          msme_udyam_reg_number: (b.msme_udyam_reg_number as string) || null,
          gst_treatment: (b.gst_treatment as string) || null,
          is_active: true,
          created_by: req.user?.id ?? null,
        },
        select: { id: true, vendor_code: true },
      });

      if (contacts.length) {
        await tx.supplier_contact_info.createMany({
          data: contacts.map(c => ({
            supplier_id: supplier.id,
            cont_first_name: c.cont_first_name || null, cont_last_name: c.cont_last_name || null,
            cont_email: c.cont_email || null, cont_job_title: c.cont_job_title || null,
            cont_country_code: c.cont_country_code || null, cont_mobile: c.cont_mobile || null,
            cont_is_admin: c.cont_is_admin === true, cont_is_supplier_portal: c.cont_is_supplier_portal === true,
          })),
        });
      }

      if (addresses.length) {
        await tx.supplier_address_info.createMany({
          data: addresses.map(a => ({
            supplier_id: supplier.id,
            adrs_name: a.adrs_name || null, adrs_country_code: a.adrs_country_code || null,
            adrs_1: a.adrs_1 || null, adrs_2: a.adrs_2 || null, adrs_3: a.adrs_3 || null,
            adrs_city_name: a.adrs_city_name || null, adrs_state_code: a.adrs_state_code || null,
            adrs_pincode: a.adrs_pincode || null, adrs_email: a.adrs_email || null,
            adrs_phone_number_country_code: a.adrs_phone_number_country_code || null,
            adrs_phone_number: a.adrs_phone_number || null, adrs_extension: a.adrs_extension || null,
          })),
        });
      }

      if (bankDetails.length) {
        await tx.supplier_bank_detail.createMany({
          data: bankDetails.map(bk => ({
            supplier_id: supplier.id,
            bank_country_code: bk.bank_country_code || null, bank_name: bk.bank_name || null,
            bank_branch_name: bk.bank_branch_name || null, bank_account_number: bk.bank_account_number || null,
            bank_account_holder: bk.bank_account_holder || null, bank_account_type: bk.bank_account_type || null,
            bank_account_currency_code: bk.bank_account_currency_code || null,
          })),
        });
      }

      return supplier;
    });

    const files = (b.files as FileInput[] | undefined) ?? [];
    const existingDocs = (b.existing_docs as SavedFile[] | undefined) ?? [];
    if (files.length > 0) {
      const saved = await saveSupplierFiles(result.id, files);
      const allDocs = [...existingDocs, ...saved];
      await prisma.supplier_master.update({ where: { id: result.id }, data: { upload_doc: JSON.stringify(allDocs) } });
    }

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'CREATE', module: AUDIT_MODULE.SUPPLIER_MASTER, recordId: result.id,
      description: `Created supplier: ${result.vendor_code} — ${String(b.vendor_company_name || '')}`,
      newValues: b, ipAddress: req.ip,
    });

    sendSuccess(res, result, 'Supplier created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create supplier', 500, (error as Error).message);
  }
};

// ── PUT /suppliers/:id ────────────────────────────────────────
export const updateSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const b = req.body as Record<string, unknown>;
    if (!String(b.vendor_company_name || '').trim()) {
      sendValidationError(res, 'Vendor Company Name is required'); return;
    }

    const contacts    = (b.contacts    as ContactIn[]    | undefined) ?? [];
    const addresses   = (b.addresses   as AddressIn[]    | undefined) ?? [];
    const bankDetails = (b.bankDetails as BankDetailIn[] | undefined) ?? [];

    // updateMany (not update) — matches the original, which never checked
    // rows affected and so never 404'd on a non-existent id here either.
    await prisma.$transaction(async (tx) => {
      await tx.supplier_master.updateMany({
        where: { id },
        data: {
          vendor_company_name: String(b.vendor_company_name || '').trim(),
          bus_relationship: (b.bus_relationship as string) || null,
          country_code: (b.country_code as string) || null,
          pan_card: (b.pan_card as string) || null,
          organization_type: (b.organization_type as string) || null,
          vendor_type: (b.vendor_type as string) || null,
          is_msme_reg: b.is_msme_reg === true || b.is_msme_reg === 'true',
          vendor_url: (b.vendor_url as string) || null,
          gstin_uin_number: (b.gstin_uin_number as string) || null,
          place_of_supply: (b.place_of_supply as string) || null,
          msme_udyam_reg_number: (b.msme_udyam_reg_number as string) || null,
          gst_treatment: (b.gst_treatment as string) || null,
          updated_by: req.user?.id ?? null,
          updated_at: new Date(),
        },
      });

      await tx.supplier_contact_info.deleteMany({ where: { supplier_id: id } });
      await tx.supplier_address_info.deleteMany({ where: { supplier_id: id } });
      await tx.supplier_bank_detail.deleteMany({ where: { supplier_id: id } });

      if (contacts.length) {
        await tx.supplier_contact_info.createMany({
          data: contacts.map(c => ({
            supplier_id: id,
            cont_first_name: c.cont_first_name || null, cont_last_name: c.cont_last_name || null,
            cont_email: c.cont_email || null, cont_job_title: c.cont_job_title || null,
            cont_country_code: c.cont_country_code || null, cont_mobile: c.cont_mobile || null,
            cont_is_admin: c.cont_is_admin === true, cont_is_supplier_portal: c.cont_is_supplier_portal === true,
          })),
        });
      }

      if (addresses.length) {
        await tx.supplier_address_info.createMany({
          data: addresses.map(a => ({
            supplier_id: id,
            adrs_name: a.adrs_name || null, adrs_country_code: a.adrs_country_code || null,
            adrs_1: a.adrs_1 || null, adrs_2: a.adrs_2 || null, adrs_3: a.adrs_3 || null,
            adrs_city_name: a.adrs_city_name || null, adrs_state_code: a.adrs_state_code || null,
            adrs_pincode: a.adrs_pincode || null, adrs_email: a.adrs_email || null,
            adrs_phone_number_country_code: a.adrs_phone_number_country_code || null,
            adrs_phone_number: a.adrs_phone_number || null, adrs_extension: a.adrs_extension || null,
          })),
        });
      }

      if (bankDetails.length) {
        await tx.supplier_bank_detail.createMany({
          data: bankDetails.map(bk => ({
            supplier_id: id,
            bank_country_code: bk.bank_country_code || null, bank_name: bk.bank_name || null,
            bank_branch_name: bk.bank_branch_name || null, bank_account_number: bk.bank_account_number || null,
            bank_account_holder: bk.bank_account_holder || null, bank_account_type: bk.bank_account_type || null,
            bank_account_currency_code: bk.bank_account_currency_code || null,
          })),
        });
      }
    });

    const files = (b.files as FileInput[] | undefined) ?? [];
    const existingDocs = (b.existing_docs as SavedFile[] | undefined) ?? [];
    if (files.length > 0 || existingDocs.length >= 0) {
      const saved = files.length > 0 ? await saveSupplierFiles(id, files) : [];
      const allDocs = [...existingDocs, ...saved];
      await prisma.supplier_master.updateMany({ where: { id }, data: { upload_doc: allDocs.length > 0 ? JSON.stringify(allDocs) : null } });
    }

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.SUPPLIER_MASTER, recordId: id,
      description: `Updated supplier ID ${id}: ${String(b.vendor_company_name || '')}`,
      newValues: b, ipAddress: req.ip,
    });

    sendSuccess(res, { id }, 'Supplier updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update supplier', 500, (error as Error).message);
  }
};

// ── DELETE /suppliers/:id  (toggle status) ────────────────────
export const toggleSupplierStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; vendor_code: string; vendor_company_name: string }[]>(
      Prisma.sql`
        UPDATE supplier_master
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, vendor_code, vendor_company_name
      `
    );

    if (!rows.length) { sendError(res, 'Supplier not found', 404); return; }
    const { is_active, vendor_code, vendor_company_name } = rows[0];

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'DELETE', module: AUDIT_MODULE.SUPPLIER_MASTER, recordId: id,
      description: `${is_active ? 'Activated' : 'Deactivated'} supplier: ${vendor_code} — ${vendor_company_name}${!is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress: req.ip,
    });

    sendSuccess(res, { id, is_active }, is_active ? 'Supplier activated' : 'Supplier deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle supplier status', 500, (error as Error).message);
  }
};
