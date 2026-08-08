import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(200),
}).passthrough();

export const forgotPasswordSchema = z.object({
  employee_id: z.string().trim().min(2, 'Employee ID is required').max(20),
}).passthrough();

export const verifyOTPSchema = z.object({
  employee_id: z.string().trim().min(2, 'Employee ID is required').max(20),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
}).passthrough();

export const resetPasswordSchema = z.object({
  reset_token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters').max(200),
}).passthrough();

export const activateAccountSchema = z.object({
  token: z.string().min(1, 'Activation token is required'),
}).passthrough();
