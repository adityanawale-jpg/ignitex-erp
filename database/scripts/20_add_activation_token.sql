-- Add activation token columns to user_master
ALTER TABLE user_master
  ADD COLUMN IF NOT EXISTS activation_token        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS activation_token_expiry TIMESTAMP;
