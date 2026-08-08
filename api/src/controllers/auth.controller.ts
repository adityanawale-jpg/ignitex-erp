import { Request, Response } from 'express';
import { authenticateUser, logoutUser, getUserMenus, getUserNotifications, getUserById, sendPasswordResetOTP, verifyPasswordResetOTP, resetPasswordWithToken, hashPassword, comparePassword } from '../services/auth.service';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { prisma } from '../database/prisma';
import { Prisma } from '../generated/prisma/client';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as { username: string; password: string };

    if (!username || !password) {
      sendValidationError(res, 'Username and password are required');
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await authenticateUser(username, password, ipAddress, userAgent);

    if (!result.success) {
      sendError(res, result.message || 'Login failed', 401);
      return;
    }

    sendSuccess(res, { token: result.token, user: result.user }, 'Login successful');
  } catch (error) {
    logger.error('Login controller error:', error);
    sendError(res, 'Login failed. Please try again.');
  }
};

/**
 * POST /api/v1/auth/logout
 * Invalidate JWT token
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await logoutUser(req.user.id);
    }
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error:', error);
    sendError(res, 'Logout failed');
  }
};

/**
 * GET /api/v1/auth/profile
 * Get current user profile with menus
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const [fullUser, notifications] = await Promise.all([
      getUserById(req.user.id),
      getUserNotifications(req.user.id),
    ]);

    const menus = await getUserMenus(fullUser?.role_id ?? undefined, req.user.id);

    sendSuccess(res, {
      user: fullUser ?? req.user,
      menus,
      notifications,
    });
  } catch (error) {
    logger.error('Profile error:', error);
    sendError(res, 'Failed to fetch profile');
  }
};

/**
 * POST /api/v1/auth/forgot-password
 * Send OTP to employee's registered email
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employee_id } = req.body as { employee_id: string };

    if (!employee_id || employee_id.trim().length < 2) {
      sendValidationError(res, 'Employee ID is required');
      return;
    }

    const result = await sendPasswordResetOTP(employee_id.trim().toUpperCase());
    sendSuccess(res, { masked_email: result.maskedEmail }, result.message);
  } catch (error) {
    logger.error('Forgot password error:', error);
    sendError(res, 'Failed to send OTP. Please try again.');
  }
};

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and return a short-lived reset token
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employee_id, otp } = req.body as { employee_id: string; otp: string };

    if (!employee_id || !otp) {
      sendValidationError(res, 'Employee ID and OTP are required');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      sendValidationError(res, 'OTP must be a 6-digit number');
      return;
    }

    const result = await verifyPasswordResetOTP(employee_id.trim().toUpperCase(), otp);

    if (!result.success) {
      sendError(res, result.message, 400);
      return;
    }

    sendSuccess(res, { reset_token: result.resetToken }, result.message);
  } catch (error) {
    logger.error('Verify OTP error:', error);
    sendError(res, 'OTP verification failed. Please try again.');
  }
};

/**
 * POST /api/v1/auth/reset-password
 * Set a new password using the reset token
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reset_token, new_password } = req.body as { reset_token: string; new_password: string };

    if (!reset_token || !new_password) {
      sendValidationError(res, 'Reset token and new password are required');
      return;
    }

    if (new_password.length < 6) {
      sendValidationError(res, 'Password must be at least 6 characters');
      return;
    }

    const result = await resetPasswordWithToken(reset_token, new_password);

    if (!result.success) {
      sendError(res, result.message, 400);
      return;
    }

    sendSuccess(res, null, result.message);
  } catch (error) {
    logger.error('Reset password error:', error);
    sendError(res, 'Password reset failed. Please try again.');
  }
};

/**
 * POST /api/v1/auth/activate
 * Verify the activation token sent in the welcome email (public route)
 */
export const activateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      sendValidationError(res, 'Activation token is required');
      return;
    }

    // Expiry is checked with the database's own NOW() rather than a JS Date
    // comparison: activation_token_expiry is a TIMESTAMP WITHOUT TIME ZONE
    // column, and this DB session's timezone is Asia/Kolkata — a naive
    // timestamp written by a plain `pg` query and read back through Prisma
    // (which treats naive timestamps as UTC) can be off by the IST offset.
    // Comparing entirely inside Postgres sidesteps that mismatch.
    const rows = await prisma.$queryRaw<{
      user_id: number; first_name: string; last_name: string | null; employee_id: string; is_expired: boolean;
    }[]>(Prisma.sql`
      SELECT user_id, first_name, last_name, employee_id,
             (activation_token_expiry IS NULL OR activation_token_expiry < NOW()) AS is_expired
      FROM user_master WHERE activation_token = ${token}
    `);

    if (rows.length === 0) {
      sendError(res, 'Invalid or already used activation link.', 400);
      return;
    }

    const user = rows[0];
    if (user.is_expired) {
      sendError(res, 'This activation link has expired. Please contact your administrator.', 400);
      return;
    }

    // Consume the token
    await prisma.user_master.update({
      where: { user_id: user.user_id },
      data: { activation_token: null, activation_token_expiry: null, updated_at: new Date() },
    });

    logger.info(`Account activated for user_id=${user.user_id} (${user.employee_id})`);

    sendSuccess(res, {
      employee_id: user.employee_id,
      full_name:   `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`,
    }, 'Account activated successfully. You can now log in.');
  } catch (error) {
    logger.error('Activate account error:', error);
    sendError(res, 'Account activation failed. Please try again.');
  }
};

/**
 * GET /api/v1/auth/menus
 * Get user menus
 */
export const getMenus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const menus = await getUserMenus();
    sendSuccess(res, menus, 'Menus fetched successfully');
  } catch (error) {
    logger.error('Menus error:', error);
    sendError(res, 'Failed to fetch menus');
  }
};

/**
 * PUT /api/v1/auth/profile
 * Update own profile (name, mobile) and optionally change password
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized', 401); return; }

    const { first_name, last_name, mobile_number, current_password, new_password } = req.body as {
      first_name: string; last_name?: string; mobile_number?: string;
      current_password?: string; new_password?: string;
    };

    if (!first_name?.trim()) {
      sendValidationError(res, 'First name is required'); return;
    }

    if (new_password) {
      if (!current_password) { sendValidationError(res, 'Current password is required to set a new one'); return; }
      if (new_password.length < 6) { sendValidationError(res, 'New password must be at least 6 characters'); return; }

      const row = await prisma.user_master.findUnique({ where: { user_id: userId }, select: { password_hash: true } });
      if (!row) { sendError(res, 'User not found', 404); return; }

      const valid = await comparePassword(current_password, row.password_hash);
      if (!valid) { sendError(res, 'Current password is incorrect', 400); return; }

      const newHash = await hashPassword(new_password);
      await prisma.user_master.update({
        where: { user_id: userId },
        data: {
          first_name: first_name.trim(), last_name: last_name?.trim() || null,
          mobile_number: mobile_number?.trim() || null, password_hash: newHash, updated_at: new Date(),
        },
      });
    } else {
      await prisma.user_master.update({
        where: { user_id: userId },
        data: { first_name: first_name.trim(), last_name: last_name?.trim() || null, mobile_number: mobile_number?.trim() || null, updated_at: new Date() },
      });
    }

    const updatedUser = await getUserById(userId);
    sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');
  } catch (error) {
    logger.error('Update profile error:', error);
    sendError(res, 'Failed to update profile');
  }
};

/**
 * PUT /api/v1/auth/profile/photo
 * Upload / replace profile photo (base64 data URI in request body)
 */
export const uploadProfilePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  const uploadsDir = path.join(__dirname, '../../uploads/avatars');
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized', 401); return; }

    const { photo } = req.body as { photo?: string };
    if (!photo) { sendValidationError(res, 'photo field is required'); return; }

    // Validate & strip data URI
    const match = photo.match(/^data:(image\/(jpeg|jpg|png|gif|webp));base64,(.+)$/);
    if (!match) { sendValidationError(res, 'Invalid image format. Supported: JPEG, PNG, GIF, WebP'); return; }

    const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
    const b64 = match[3];

    // Validate size (base64 ~4/3 * raw bytes → 5MB raw ≈ 6.67MB base64)
    if (b64.length > 7_000_000) { sendValidationError(res, 'Image must be under 5 MB'); return; }

    logger.info(`[photo-upload] userId=${userId} dir=${uploadsDir} size=${b64.length}`);

    // Ensure directory exists
    try {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    } catch (mkdirErr) {
      logger.error(`[photo-upload] Cannot create directory: ${uploadsDir}`, mkdirErr);
      sendError(res, `Upload directory error: ${(mkdirErr as NodeJS.ErrnoException).message}`);
      return;
    }

    // Write file (overwrites previous photo for this user)
    const filename = `${userId}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    try {
      await fs.promises.writeFile(filePath, Buffer.from(b64, 'base64'));
    } catch (writeErr) {
      logger.error(`[photo-upload] Cannot write file: ${filePath}`, writeErr);
      sendError(res, `File write error: ${(writeErr as NodeJS.ErrnoException).message}`);
      return;
    }

    logger.info(`[photo-upload] File saved: ${filePath}`);

    const photoUrl = `/uploads/avatars/${filename}?v=${Date.now()}`;

    await prisma.user_master.update({ where: { user_id: userId }, data: { profile_image: photoUrl, updated_at: new Date() } });

    sendSuccess(res, { photo_url: photoUrl }, 'Profile photo updated');
  } catch (error) {
    logger.error(`[photo-upload] Unexpected error. dir=${uploadsDir}`, error);
    sendError(res, `Failed to upload photo: ${(error as Error).message}`);
  }
};

/**
 * DELETE /api/v1/auth/profile/photo
 * Remove profile photo — clears DB field and deletes file from disk
 */
export const deleteProfilePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized', 401); return; }

    const row = await prisma.user_master.findUnique({ where: { user_id: userId }, select: { profile_image: true } });
    const existing = row?.profile_image;

    if (existing) {
      // Strip query-string (?v=...) and resolve disk path
      const filePath = path.join(__dirname, '../../', existing.split('?')[0]);
      try { await fs.promises.unlink(filePath); } catch { /* ignore if already gone */ }
    }

    await prisma.user_master.update({ where: { user_id: userId }, data: { profile_image: null, updated_at: new Date() } });

    sendSuccess(res, {}, 'Profile photo removed');
  } catch (error) {
    logger.error('[photo-delete] Error:', error);
    sendError(res, 'Failed to remove photo');
  }
};
