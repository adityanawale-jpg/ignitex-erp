-- Seed PAYMENT_TERM lookup values so Customer Master's Payment Terms field
-- (Credit Limit step) can be driven by a dropdown instead of free text,
-- matching the pattern already used for CUSTOMER_TYPE / GST_TREATMENT / etc.
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('PAYMENT_TERM', 'ADVANCE',        'Advance',           1, TRUE),
  ('PAYMENT_TERM', 'DUE_ON_RECEIPT', 'Due on Receipt',    2, TRUE),
  ('PAYMENT_TERM', 'NET_15',         'Net 15 Days',       3, TRUE),
  ('PAYMENT_TERM', 'NET_30',         'Net 30 Days',       4, TRUE),
  ('PAYMENT_TERM', 'NET_45',         'Net 45 Days',       5, TRUE),
  ('PAYMENT_TERM', 'NET_60',         'Net 60 Days',       6, TRUE),
  ('PAYMENT_TERM', 'COD',            'Cash on Delivery',  7, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;
