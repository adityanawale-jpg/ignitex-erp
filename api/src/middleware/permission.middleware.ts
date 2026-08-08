import { Response, NextFunction } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendForbidden, sendUnauthorized, sendError } from '../utils/response';
import { AuthRequest } from './auth.middleware';
import { getCachedPermissionMap, setCachedPermissionMap, PermissionBits } from '../utils/permissionCache';

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'print' | 'export';

interface PermissionRow extends PermissionBits {
  menu_code: string;
}

// One query for every active menu's effective permission bits for this user,
// cached as a whole (see permissionCache.ts) — this runs on every protected
// request, so per-menu-code queries would mean one DB round trip per call.
const loadPermissionMap = async (userId: number): Promise<Record<string, PermissionBits>> => {
  const cached = await getCachedPermissionMap(userId);
  if (cached) return cached;

  const rows = await prisma.$queryRaw<PermissionRow[]>(Prisma.sql`
    SELECT
      m.menu_code,
      COALESCE(umm.can_view,   rm.can_view,   FALSE) AS can_view,
      COALESCE(umm.can_create, rm.can_create, FALSE) AS can_create,
      COALESCE(umm.can_update, rm.can_update, FALSE) AS can_update,
      COALESCE(umm.can_delete, rm.can_delete, FALSE) AS can_delete,
      COALESCE(umm.can_print,  rm.can_print,  FALSE) AS can_print,
      COALESCE(umm.can_export, rm.can_export, FALSE) AS can_export
    FROM menu_master m
    LEFT JOIN role_menu_mapping rm
      ON rm.menu_id = m.id
      AND rm.role_id = (
        SELECT ur.role_id FROM user_role ur
        WHERE ur.user_id = ${userId}
        ORDER BY ur.is_default DESC LIMIT 1
      )
    LEFT JOIN user_menu_mapping umm
      ON umm.menu_id = m.id AND umm.user_id = ${userId}
    WHERE m.is_active = TRUE
  `);

  const map: Record<string, PermissionBits> = {};
  for (const row of rows) {
    const { menu_code, ...bits } = row;
    map[menu_code] = bits;
  }
  await setCachedPermissionMap(userId, map);
  return map;
};

/**
 * Server-side counterpart to the menu permission grid the frontend already
 * renders (menu_master + role_menu_mapping + user_menu_mapping tri-state
 * override). Resolves in a single query: the user's per-menu override wins
 * if set (true/false), otherwise falls back to their default role's
 * baseline, otherwise denies. Mirrors the exact COALESCE logic
 * getUserMenuPermissions() already uses to build the permissions grid —
 * this just evaluates it for one menu_code instead of all of them.
 */
export const requirePermission = (menuCode: string, action: PermissionAction) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) { sendUnauthorized(res, 'Authentication required'); return; }

      const map = await loadPermissionMap(userId);
      const bits = map[menuCode];

      // Fail closed: unknown/inactive menu_code or no matching row at all.
      if (!bits) { sendForbidden(res, 'This feature is not available.'); return; }

      const allowed = bits[`can_${action}`];
      if (!allowed) { sendForbidden(res, 'You do not have permission to perform this action.'); return; }

      next();
    } catch (error) {
      sendError(res, 'Permission check failed', 500, (error as Error).message);
    }
  };
};
