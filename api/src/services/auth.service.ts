import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeTransaction } from '../database/connection';
import { executeDynamicQuerySingle } from '../repository/dynamic.repository';
import { generateToken } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from './email.service';
import { getCachedMenuTree, setCachedMenuTree } from '../utils/permissionCache';

interface UserRecord {
  user_id: number;
  employee_id: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  emp_email: string;
  mobile_number: string;
  profile_image: string | null;
  user_status: boolean;
  not_started: boolean;
  expired: boolean;
  has_any_role: boolean;
  has_active_role: boolean;
  role_name?: string;
}

type PublicUser = Omit<UserRecord, 'password_hash' | 'not_started' | 'expired' | 'has_any_role' | 'has_active_role'>;

interface LoginResult {
  success: boolean;
  token?: string;
  user?: PublicUser;
  message?: string;
}

export const authenticateUser = async (
  username: string,
  password: string,
  ipAddress: string,
  userAgent: string
): Promise<LoginResult> => {
  try {
    const user = await executeDynamicQuerySingle<UserRecord>('login_get', {
      userid: { type: 'str', value: username },
    });

    if (!user) {
      await logLoginAttempt(null, username, ipAddress, userAgent, 'failed', 'User not found');
      return { success: false, message: 'Invalid employee ID or password' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      await logLoginAttempt(user.user_id, username, ipAddress, userAgent, 'failed', 'Wrong password');
      return { success: false, message: 'Invalid employee ID or password' };
    }

    if (user.not_started) {
      await logLoginAttempt(user.user_id, username, ipAddress, userAgent, 'failed', 'Account not yet active');
      return { success: false, message: 'Your account is not yet active. Please contact administrator.' };
    }

    if (user.expired) {
      await logLoginAttempt(user.user_id, username, ipAddress, userAgent, 'failed', 'Account expired');
      return { success: false, message: 'Your account has expired. Please contact administrator.' };
    }

    // Block if the user has roles assigned but every one of them is inactive
    // (a user with zero roles at all is not blocked here — same as before)
    if (user.has_any_role && !user.has_active_role) {
      await logLoginAttempt(user.user_id, username, ipAddress, userAgent, 'failed', 'All assigned roles are inactive');
      return { success: false, message: 'Your role has been deactivated. Please contact administrator.' };
    }

    const tokenPayload = {
      id: user.user_id,
      employee_id: user.employee_id,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    const token = generateToken(tokenPayload);
    const tokenExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    // jwt_token update and the login_history record must land together —
    // a partial write here would either issue a token the DB doesn't
    // recognize (next request fails with "Token has been invalidated") or
    // silently drop the audit trail entry.
    await executeTransaction(async (client) => {
      await client.query(
        `UPDATE user_master
         SET jwt_token = $1, jwt_token_update = $2, last_login_at = NOW(), login_ip = $3, updated_at = NOW()
         WHERE user_id = $4`,
        [token, tokenExpiry, ipAddress, user.user_id]
      );
      await client.query(
        `INSERT INTO login_history (user_id, employee_id, ip_address, user_agent, status, remarks)
         VALUES ($1, $2, $3, $4, 'success', 'Login successful')`,
        [user.user_id, username, ipAddress, userAgent?.substring(0, 500)]
      );
    });

    logger.info(`User logged in: ${username} from IP: ${ipAddress}`);

    const { password_hash, not_started, expired, has_any_role, has_active_role, ...userWithoutPassword } = user;

    return {
      success: true,
      token,
      user: { ...userWithoutPassword, role_name: user.role_name || '' },
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    throw error;
  }
};

export const getUserById = async (userId: number) => {
  const rows = await executeQuery<{
    id: number; employee_id: string; first_name: string; last_name: string;
    emp_email: string; mobile_number: string; profile_image: string | null;
    designation: string | null; department_id: string | null;
    role_name: string | null; role_id: number | null;
  }>(
    `SELECT
       u.user_id      AS id,
       u.employee_id,
       u.first_name,
       u.last_name,
       u.emp_email,
       u.mobile_number,
       u.profile_image,
       u.designation,
       u.department_id,
       (SELECT rm.role_name
        FROM user_role ur
        JOIN role_master rm ON rm.id = ur.role_id
        WHERE ur.user_id = u.user_id
        ORDER BY ur.is_default DESC, rm.role_name
        LIMIT 1) AS role_name,
       (SELECT ur.role_id
        FROM user_role ur
        WHERE ur.user_id = u.user_id
        ORDER BY ur.is_default DESC
        LIMIT 1) AS role_id
     FROM user_master u
     WHERE u.user_id = $1 AND u.user_status = TRUE`,
    [userId]
  );
  return rows[0] || null;
};

export const logoutUser = async (userId: number): Promise<void> => {
  await executeQuery(
    'UPDATE user_master SET jwt_token = NULL, jwt_token_update = NULL WHERE user_id = $1',
    [userId]
  );
  logger.info(`User logged out: ID ${userId}`);
};

export const getUserMenus = async (roleId?: number, userId?: number): Promise<unknown[]> => {
  if (roleId && userId) {
    const cached = await getCachedMenuTree(userId);
    if (cached) return cached;
  }

  let menus;

  if (roleId) {
    menus = await executeQuery<{
      id: number;
      parent_id: number | null;
      menu_code: string;
      menu_name: string;
      menu_url: string | null;
      menu_icon: string | null;
      menu_order: number;
      menu_level: number;
      can_view: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
      can_print: boolean;
      can_export: boolean;
    }>(
      `WITH RECURSIVE visible AS (
         SELECT m.id
         FROM menu_master m
         LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = $1
         LEFT JOIN user_menu_mapping umm ON m.id = umm.menu_id AND umm.user_id = $2
         WHERE m.is_active = TRUE
           AND COALESCE(umm.can_view, rm.can_view, TRUE) = TRUE
       ),
       ancestors AS (
         SELECT m.id, m.parent_id
         FROM menu_master m
         WHERE m.id IN (SELECT id FROM visible)
         UNION ALL
         SELECT m.id, m.parent_id
         FROM menu_master m
         INNER JOIN ancestors a ON m.id = a.parent_id
         WHERE m.is_active = TRUE
       )
       SELECT DISTINCT
         m.id, m.parent_id, m.menu_code, m.menu_name, m.menu_url, m.menu_icon, m.menu_order, m.menu_level,
         COALESCE(umm.can_view,   rm.can_view)   AS can_view,
         COALESCE(umm.can_create, rm.can_create) AS can_create,
         COALESCE(umm.can_update, rm.can_update) AS can_update,
         COALESCE(umm.can_delete, rm.can_delete) AS can_delete,
         COALESCE(umm.can_print,  rm.can_print)  AS can_print,
         COALESCE(umm.can_export, rm.can_export) AS can_export
       FROM menu_master m
       INNER JOIN ancestors a ON m.id = a.id
       LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = $1
       LEFT JOIN user_menu_mapping umm ON m.id = umm.menu_id AND umm.user_id = $2
       ORDER BY m.menu_level, m.menu_order`,
      [roleId, userId ?? null]
    );
  } else {
    menus = await executeQuery<{
      id: number;
      parent_id: number | null;
      menu_code: string;
      menu_name: string;
      menu_url: string | null;
      menu_icon: string | null;
      menu_order: number;
      menu_level: number;
    }>(
      `SELECT id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level
       FROM menu_master WHERE is_active = TRUE ORDER BY menu_level, menu_order`
    );
  }

  const tree = buildMenuTree(menus);
  if (roleId && userId) await setCachedMenuTree(userId, tree);
  return tree;
};

const buildMenuTree = (menus: { id: number; parent_id: number | null; [key: string]: unknown }[]): unknown[] => {
  const menuMap = new Map<number, unknown & { children: unknown[] }>();
  const rootMenus: unknown[] = [];

  menus.forEach((menu) => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  menus.forEach((menu) => {
    const menuNode = menuMap.get(menu.id)!;
    if (menu.parent_id === null) {
      rootMenus.push(menuNode);
    } else {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        (parent as { children: unknown[] }).children.push(menuNode);
      }
    }
  });

  return rootMenus;
};

const logLoginAttempt = async (
  userId: number | null,
  employeeId: string,
  ipAddress: string,
  userAgent: string,
  status: string,
  remarks: string
): Promise<void> => {
  try {
    await executeQuery(
      `INSERT INTO login_history (user_id, employee_id, ip_address, user_agent, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, employeeId, ipAddress, userAgent?.substring(0, 500), status, remarks]
    );
  } catch (error) {
    logger.error('Failed to log login attempt:', error);
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  return bcrypt.hash(password, rounds);
};

export const comparePassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};

// ── Password Reset ────────────────────────────────────────────────────────────

interface ResetOTPResult {
  success: boolean;
  message: string;
  maskedEmail?: string;
}

interface VerifyOTPResult {
  success: boolean;
  message: string;
  resetToken?: string;
}

interface ResetPasswordResult {
  success: boolean;
  message: string;
}

const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
};

export const sendPasswordResetOTP = async (employeeId: string): Promise<ResetOTPResult> => {
  try {
    const rows = await executeQuery<{ user_id: number; emp_email: string; user_status: boolean }>(
      `SELECT user_id, emp_email, user_status FROM user_master WHERE employee_id = $1`,
      [employeeId]
    );

    if (rows.length === 0 || !rows[0].emp_email) {
      // Deliberately vague to prevent user enumeration
      return {
        success: true,
        message: 'If the Employee ID exists, an OTP has been sent to the registered email.',
        maskedEmail: undefined,
      };
    }

    const user = rows[0];

    if (!user.user_status) {
      return { success: false, message: 'Your account is inactive. Please contact administrator.' };
    }

    const otp = generateOTP();
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const otpHash = await bcrypt.hash(otp, rounds);
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '15');
    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await executeQuery(
      `UPDATE user_master
       SET reset_otp_hash = $1, reset_otp_expiry = $2, reset_otp_attempts = 0,
           reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW()
       WHERE user_id = $3`,
      [otpHash, expiry, user.user_id]
    );

    await sendPasswordResetEmail(user.emp_email, employeeId, otp, expiryMinutes);

    return {
      success: true,
      message: `OTP sent to registered email. Valid for ${expiryMinutes} minutes.`,
      maskedEmail: maskEmail(user.emp_email),
    };
  } catch (error) {
    logger.error('sendPasswordResetOTP error:', error);
    throw error;
  }
};

export const verifyPasswordResetOTP = async (
  employeeId: string,
  otp: string
): Promise<VerifyOTPResult> => {
  try {
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');

    const rows = await executeQuery<{
      user_id: number;
      reset_otp_hash: string | null;
      reset_otp_expiry: Date | null;
      reset_otp_attempts: number;
    }>(
      `SELECT user_id, reset_otp_hash, reset_otp_expiry, reset_otp_attempts
       FROM user_master WHERE employee_id = $1`,
      [employeeId]
    );

    if (rows.length === 0 || !rows[0].reset_otp_hash) {
      return { success: false, message: 'No OTP request found. Please request a new OTP.' };
    }

    const user = rows[0];

    if (user.reset_otp_attempts >= maxAttempts) {
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    if (!user.reset_otp_expiry || new Date() > new Date(user.reset_otp_expiry)) {
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    const otpMatch = await bcrypt.compare(otp, user.reset_otp_hash as string);

    if (!otpMatch) {
      await executeQuery(
        `UPDATE user_master SET reset_otp_attempts = reset_otp_attempts + 1 WHERE user_id = $1`,
        [user.user_id]
      );
      const remaining = maxAttempts - user.reset_otp_attempts - 1;
      return {
        success: false,
        message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      };
    }

    // OTP correct — issue a short-lived reset token
    const resetToken = uuidv4();
    const tokenExpiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '10');
    const tokenExpiry = new Date(Date.now() + tokenExpiryMinutes * 60 * 1000);

    await executeQuery(
      `UPDATE user_master
       SET reset_otp_hash = NULL, reset_otp_expiry = NULL, reset_otp_attempts = 0,
           reset_token = $1, reset_token_expiry = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [resetToken, tokenExpiry, user.user_id]
    );

    return { success: true, message: 'OTP verified successfully.', resetToken };
  } catch (error) {
    logger.error('verifyPasswordResetOTP error:', error);
    throw error;
  }
};

export const resetPasswordWithToken = async (
  resetToken: string,
  newPassword: string
): Promise<ResetPasswordResult> => {
  try {
    const rows = await executeQuery<{
      user_id: number;
      reset_token_expiry: Date | null;
    }>(
      `SELECT user_id, reset_token_expiry FROM user_master
       WHERE reset_token = $1 AND user_status = TRUE`,
      [resetToken]
    );

    if (rows.length === 0) {
      return { success: false, message: 'Invalid or expired reset link. Please start over.' };
    }

    const user = rows[0];

    if (!user.reset_token_expiry || new Date() > new Date(user.reset_token_expiry)) {
      return { success: false, message: 'Reset link has expired. Please request a new OTP.' };
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    await executeQuery(
      `UPDATE user_master
       SET password_hash = $1,
           reset_token = NULL, reset_token_expiry = NULL,
           reset_otp_hash = NULL, reset_otp_expiry = NULL, reset_otp_attempts = 0,
           jwt_token = NULL, jwt_token_update = NULL,
           updated_at = NOW()
       WHERE user_id = $2`,
      [passwordHash, user.user_id]
    );

    logger.info(`Password reset completed for user_id: ${user.user_id}`);
    return { success: true, message: 'Password reset successfully. Please log in.' };
  } catch (error) {
    logger.error('resetPasswordWithToken error:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId: number): Promise<unknown[]> => {
  const [expiryRows] = await Promise.all([
    executeQuery<{ days_left: number }>(
      `SELECT (expiry_date::date - CURRENT_DATE) AS days_left
       FROM user_master
       WHERE user_id = $1
         AND expiry_date IS NOT NULL
         AND (expiry_date::date - CURRENT_DATE) <= 10`,
      [userId]
    ),
  ]);

  if (expiryRows.length > 0) {
    const daysLeft = expiryRows[0].days_left;
    let message: string;
    if (daysLeft < 0) {
      message = `Your account expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago. Please contact administrator.`;
    } else if (daysLeft === 0) {
      message = 'Your account expires today. Please contact administrator.';
    } else {
      message = `Your account will expire in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Please contact administrator.`;
    }

    const expiryNotif = {
      id: -1,
      user_id: userId,
      title: 'Account Expiring Soon',
      message,
      notification_type: 'warning',
      is_read: false,
      action_url: null,
      created_at: new Date().toISOString(),
    };

    return [expiryNotif];
  }

  return [];
};
