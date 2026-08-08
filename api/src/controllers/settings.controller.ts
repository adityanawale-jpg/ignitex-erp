import { Response } from 'express';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { clearQueryCache, getQueryCacheSize } from '../utils/queryConfig';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import fs from 'fs';
import path from 'path';

// ── GET /settings/erp ────────────────────────────────────────────────────────
export const getErpSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.erp_settings.findMany({ select: { key: true, value: true } });
    const settings: Record<string, string | null> = {}
    for (const r of rows) settings[r.key] = r.value
    sendSuccess(res, settings)
  } catch (error) {
    logger.error('getErpSettings error:', error)
    sendError(res, 'Failed to load ERP settings')
  }
}

// ── PUT /settings/erp ────────────────────────────────────────────────────────
export const updateErpSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { erp_name, erp_subtitle, footer_company, erp_logo, favicon, show_demo_credentials } = req.body as {
      erp_name?: string
      erp_subtitle?: string
      footer_company?: string
      erp_logo?: string    // base64 data URI
      favicon?: string     // base64 data URI
      show_demo_credentials?: boolean
    }

    const updates: { key: string; value: string | null }[] = []

    if (erp_name    !== undefined) updates.push({ key: 'erp_name',       value: erp_name.trim() || null })
    if (erp_subtitle !== undefined) updates.push({ key: 'erp_subtitle',   value: erp_subtitle.trim() || null })
    if (footer_company !== undefined) updates.push({ key: 'footer_company', value: footer_company.trim() || null })
    if (show_demo_credentials !== undefined) updates.push({ key: 'show_demo_credentials', value: show_demo_credentials ? 'true' : 'false' })

    // Handle logo image
    if (erp_logo !== undefined) {
      if (erp_logo === '') {
        updates.push({ key: 'erp_logo_url', value: null })
      } else {
        const logoUrl = await saveImage(erp_logo, 'logo')
        if (!logoUrl) { sendValidationError(res, 'Invalid logo image format'); return }
        updates.push({ key: 'erp_logo_url', value: logoUrl })
      }
    }

    // Handle favicon image
    if (favicon !== undefined) {
      if (favicon === '') {
        updates.push({ key: 'favicon_url', value: null })
      } else {
        const faviconUrl = await saveImage(favicon, 'favicon')
        if (!faviconUrl) { sendValidationError(res, 'Invalid favicon image format'); return }
        updates.push({ key: 'favicon_url', value: faviconUrl })
      }
    }

    for (const u of updates) {
      await prisma.erp_settings.upsert({
        where: { key: u.key },
        create: { key: u.key, value: u.value, updated_at: new Date() },
        update: { value: u.value, updated_at: new Date() },
      })
    }

    // Return full settings after update
    const rows = await prisma.erp_settings.findMany({ select: { key: true, value: true } })
    const settings: Record<string, string | null> = {}
    for (const r of rows) settings[r.key] = r.value

    sendSuccess(res, settings, 'ERP configuration saved')
  } catch (error) {
    logger.error('updateErpSettings error:', error)
    sendError(res, 'Failed to save ERP settings')
  }
}

// ── POST /settings/query-cache/flush ──────────────────────────────────────────
// project_config query templates (fetched via getQuery() in fgBom/finBom/
// fgImport controllers) are cached in-process indefinitely — an edit to
// project_config doesn't take effect until this is called or the process
// restarts. key is optional: omit it to clear the whole cache.
export const flushQueryCache = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key } = (req.body ?? {}) as { key?: string };
    const sizeBefore = getQueryCacheSize();
    clearQueryCache(key);

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.SYSTEM_CONFIG,
      description: key ? `Flushed query cache entry: ${key}` : `Flushed entire query cache (${sizeBefore} entries)`,
      ipAddress: req.ip,
    });

    sendSuccess(res, { cleared: key ?? 'all', size_before: sizeBefore }, 'Query cache flushed');
  } catch (error) {
    logger.error('flushQueryCache error:', error);
    sendError(res, 'Failed to flush query cache');
  }
};

// ── helper: decode base64 data URI → disk, return URL path ───────────────────
async function saveImage(dataUri: string, name: string): Promise<string | null> {
  const match = dataUri.match(/^data:(image\/(jpeg|jpg|png|gif|webp|x-icon|svg\+xml));base64,(.+)$/)
  if (!match) return null

  let ext = match[2]
  if (ext === 'jpeg') ext = 'jpg'
  if (ext === 'x-icon') ext = 'ico'
  if (ext === 'svg+xml') ext = 'svg'

  const b64 = match[3]
  if (b64.length > 3_000_000) return null   // ~2MB limit for branding assets

  const dir = path.join(__dirname, '../../uploads/branding')
  await fs.promises.mkdir(dir, { recursive: true })

  const filename = `${name}.${ext}`
  await fs.promises.writeFile(path.join(dir, filename), Buffer.from(b64, 'base64'))
  return `/uploads/branding/${filename}`
}
