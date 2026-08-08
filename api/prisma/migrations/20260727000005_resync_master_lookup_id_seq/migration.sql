-- master_lookup_id_seq had fallen behind the table: last_value 861 against a
-- MAX(id) of 940, so every INSERT drew an id that already existed and failed
-- with "Unique constraint failed on the fields: (id)". Rows in that gap were
-- loaded with explicit ids (data load / restore) without advancing the sequence.
--
-- This broke every insert into master_lookup, not just the Sales Order
-- Warehouse/Subinventory add — Lookup Master's own create was failing too.
--
-- GREATEST keeps this safe to run anywhere: it only ever moves the sequence
-- forward, so an environment that is already correct is left untouched.
SELECT setval(
  'master_lookup_id_seq',
  GREATEST(
    (SELECT COALESCE(MAX(id), 1) FROM master_lookup),
    (SELECT last_value FROM master_lookup_id_seq)
  )
);
