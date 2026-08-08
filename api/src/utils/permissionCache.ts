import { executeQuery } from '../database/connection';
import { cacheGetJson, cacheSetJson, cacheDel } from './redisClient';

// Shared cache for the two things derived from role_menu_mapping +
// user_menu_mapping: the sidebar menu tree (getUserMenus) and the flat
// per-menu-code permission bits (requirePermission). Both are invalidated
// together since they read the same two source tables.
const TTL_SECONDS = 5 * 60;

const menuTreeKey = (userId: number) => `menu:tree:${userId}`;
const permMapKey = (userId: number) => `menu:perm:${userId}`;

export const getCachedMenuTree = (userId: number) => cacheGetJson<unknown[]>(menuTreeKey(userId));
export const setCachedMenuTree = (userId: number, tree: unknown[]) => cacheSetJson(menuTreeKey(userId), tree, TTL_SECONDS);

export interface PermissionBits {
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_print: boolean;
  can_export: boolean;
}

export const getCachedPermissionMap = (userId: number) =>
  cacheGetJson<Record<string, PermissionBits>>(permMapKey(userId));
export const setCachedPermissionMap = (userId: number, map: Record<string, PermissionBits>) =>
  cacheSetJson(permMapKey(userId), map, TTL_SECONDS);

export const invalidateUserPermissionCache = (userId: number): Promise<void> =>
  cacheDel(menuTreeKey(userId), permMapKey(userId));

// role_menu_mapping changed for role_id: every user whose current/default
// role is that role has a stale baseline, so drop their cache entries too.
export const invalidateRolePermissionCache = async (roleId: number): Promise<void> => {
  const users = await executeQuery<{ user_id: number }>(
    'SELECT DISTINCT user_id FROM user_role WHERE role_id = $1',
    [roleId],
  );
  const keys = users.flatMap((u) => [menuTreeKey(u.user_id), permMapKey(u.user_id)]);
  await cacheDel(...keys);
};
