import { Router } from 'express';
import {
  login, logout, getProfile, getMenus, forgotPassword, verifyOTP,
  resetPassword, updateProfile, uploadProfilePhoto, deleteProfilePhoto, activateAccount,
} from '../controllers/auth.controller';
import { validateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  loginSchema,
  forgotPasswordSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  activateAccountSchema,
} from '../validators/auth.validators';

const router = Router();

// ── Public (no auth required) ─────────────────────────────────
router.post('/login',           validate(loginSchema),           login);
router.post('/forgot-password', validate(forgotPasswordSchema),  forgotPassword);
router.post('/verify-otp',      validate(verifyOTPSchema),       verifyOTP);
router.post('/reset-password',  validate(resetPasswordSchema),   resetPassword);
router.post('/activate',        validate(activateAccountSchema), activateAccount);

// ── Protected ──────────────────────────────────────────────────
router.post('/logout', validateToken, logout);
router.get('/profile', validateToken, getProfile);
router.put('/profile', validateToken, updateProfile);
router.put('/profile/photo', validateToken, uploadProfilePhoto);
router.delete('/profile/photo', validateToken, deleteProfilePhoto);
router.get('/menus', validateToken, getMenus);

export default router;
