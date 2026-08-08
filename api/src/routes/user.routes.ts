import { Router } from 'express';
import {
  getUsers, getUserStats, getManagers, getRoles, getUserRoles, createUser,
  updateUser, updateUserRoles, deleteUser, savePermissionsBulk,
  getUserMenuPermissions, saveUserMenuPermissionsBulk,
} from '../controllers/user.controller';
import { validateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();
const USER_MENU = 'SA_USER_MASTER';
const ROLES_MENU = 'SA_ROLES_RESP';
const USER_ROLE_MENU = 'SA_USER_ROLE';
const USER_PERM_MENU = 'SA_USER_PERM';

router.get('/',                       validateToken, requirePermission(USER_MENU, 'view'),   getUsers);
router.get('/stats',                 validateToken, requirePermission(USER_MENU, 'view'),   getUserStats);
router.get('/managers',              validateToken, requirePermission(USER_MENU, 'view'),   getManagers);
// Reference list (role names only) shared by the user-role assignment form
// and the role-permissions grid — left ungated like other cross-module LOVs.
router.get('/roles',                 validateToken, getRoles);
router.put('/permissions/bulk',      validateToken, requirePermission(ROLES_MENU, 'update'), savePermissionsBulk);
router.get('/:id/roles',             validateToken, requirePermission(USER_ROLE_MENU, 'view'),   getUserRoles);
router.put('/:id/roles',             validateToken, requirePermission(USER_ROLE_MENU, 'update'), updateUserRoles);
router.get('/:id/menu-permissions',      validateToken, requirePermission(USER_PERM_MENU, 'view'),   getUserMenuPermissions);
router.put('/:id/menu-permissions/bulk', validateToken, requirePermission(USER_PERM_MENU, 'update'), saveUserMenuPermissionsBulk);
router.post('/',                      validateToken, requirePermission(USER_MENU, 'create'), createUser);
router.put('/:id',                   validateToken, requirePermission(USER_MENU, 'update'), updateUser);
router.delete('/:id',               validateToken, requirePermission(USER_MENU, 'delete'), deleteUser);

export default router;
