-- Migration: Add password reset OTP fields to user_master
ALTER TABLE user_master
  ADD COLUMN IF NOT EXISTS reset_otp_hash      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_otp_expiry    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reset_otp_attempts  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reset_token         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_token_expiry  TIMESTAMP;
