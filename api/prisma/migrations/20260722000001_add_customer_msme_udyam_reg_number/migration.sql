-- Add MSME / Udyam Registration Number to customer_master, matching the
-- column already present on supplier_master, so the "MSME Registration =
-- Yes" conditional-mandatory field can be captured for customers too.
ALTER TABLE customer_master
  ADD COLUMN IF NOT EXISTS msme_udyam_reg_number VARCHAR(50);
