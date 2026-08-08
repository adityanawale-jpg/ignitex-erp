-- Customer Master → Address Information: Bill To / Ship To split.
--
-- adrs_type       — ADRESS_TYPE lookup (BILL_TO / SHIP_TO); Bill To by default,
--                   which is also what every pre-existing address row becomes.
-- same_as_bill_to — a Ship To row can mirror the customer's Bill To address.
-- ship_to_address — Ship To rows capture the address as one free-text block
--                   instead of the adrs_1 / adrs_2 / adrs_3 lines.

ALTER TABLE customer_address_info
  ADD COLUMN IF NOT EXISTS adrs_type       VARCHAR(50) NOT NULL DEFAULT 'BILL_TO',
  ADD COLUMN IF NOT EXISTS same_as_bill_to BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ship_to_address TEXT;

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('ADRESS_TYPE', 'BILL_TO', 'Bill To', 1, TRUE),
  ('ADRESS_TYPE', 'SHIP_TO', 'Ship To', 2, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;
