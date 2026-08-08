-- ============================================================
-- clear_form_data.sql
--
-- NOT A MIGRATION. This is a hand-run maintenance script — it changes
-- data, never schema, and is meant to be run deliberately, by a person,
-- against an environment you want emptied. It is deliberately outside
-- api/prisma/migrations/ (the authoritative schema history) and carries
-- no number prefix, so no tooling picks it up and it never runs as part
-- of a deploy. Re-runnable: running it twice just deletes nothing the
-- second time. Same footing as uat_reset_and_reseed.sql in this folder.
--
-- DESTRUCTIVE: wipes every row entered through these forms:
--   Finding Master          fin_item_master + media + variants + variant clients
--   FG Master               fg_item_master  + media + variants + variant clients
--   FG BOM                  bom_fg     + bom_fg_detail
--   Finding BOM             bom_fin    + bom_fin_detail
--   Components Master       component_master
--   Supplier Master         supplier_master + address / bank / contact
--   Customer Master         customer_master + address / contact
--   Min Max Planning        min_max_planning_master
--   Supplier Rate Master    supplier_rate_contract
--   Customer Rate Master    customer_price_metal_hdr/line + stone_hdr/line
--   Sales Order             sales_order_hdr  + sales_order_lines
--   Purchase Requisition    purchase_requisition
--   Purchase Order          purchase_order_hdr + purchase_order_lines
--   plus the approval requests (wf_request / wf_history) raised for the
--   FG BOM, Finding BOM, Sales Order and Purchase Order records above.
--   (A requisition has no submit/approve lifecycle, so it has none.)
--
-- KEPT (not touched): users, roles, menus, permissions, master_lookup,
--   project_config, erp_settings, workflow CONFIGURATION (wf_config /
--   wf_step), design_master, metal_master, stone_item_master,
--   alloy_master, dept/machine/operation masters, inventory_structure,
--   daily_rate_*, audit_log, login_history.
--   design_master has an OPTIONAL block at the bottom — read section 5.
--
-- NOT handled here: files already uploaded to api/uploads (item photos,
--   videos, CAD / drawing / tech documents). The DB rows pointing at them
--   go, the files on disk stay — delete them separately if you want the
--   disk reclaimed.
--
-- HOW TO RUN
--   Plain SQL, no psql backslash commands — runs the same in psql,
--   pgAdmin and DBeaver. Execute the file AS A WHOLE (pgAdmin: open and
--   Execute; DBeaver: Execute script, Alt+X — not Execute statement),
--   so the BEGIN ... COMMIT actually wraps the deletes.
--   Dry run first — see the before/after counts, then throw the changes away:
--       change the final COMMIT to ROLLBACK, run, inspect, change it back.
--   psql:
--       psql -v ON_ERROR_STOP=1 -h <host> -U <user> -d <db> -f clear_form_data.sql
--   CHECK YOUR CONNECTION FIRST. This script does not care which
--   environment it lands in; step 0 prints the database name so you can
--   confirm before the transaction commits.
-- ============================================================

-- ── Step 0: which database am I about to wipe? ───────────────────
SELECT current_database() AS database, current_user AS connected_as, now() AS run_at;

BEGIN;

-- ── Step 1: count everything in scope, before ────────────────────
CREATE OR REPLACE TEMP VIEW clear_scope_counts AS
             SELECT 'fin_item_master'           AS table_name, COUNT(*) AS row_count FROM fin_item_master
  UNION ALL  SELECT 'fin_item_media',                COUNT(*) FROM fin_item_media
  UNION ALL  SELECT 'fin_item_variant',              COUNT(*) FROM fin_item_variant
  UNION ALL  SELECT 'fin_item_variant_client',       COUNT(*) FROM fin_item_variant_client
  UNION ALL  SELECT 'fg_item_master',                COUNT(*) FROM fg_item_master
  UNION ALL  SELECT 'fg_item_media',                 COUNT(*) FROM fg_item_media
  UNION ALL  SELECT 'fg_item_variant',               COUNT(*) FROM fg_item_variant
  UNION ALL  SELECT 'fg_item_variant_client',        COUNT(*) FROM fg_item_variant_client
  UNION ALL  SELECT 'bom_fg',                        COUNT(*) FROM bom_fg
  UNION ALL  SELECT 'bom_fg_detail',                 COUNT(*) FROM bom_fg_detail
  UNION ALL  SELECT 'bom_fin',                       COUNT(*) FROM bom_fin
  UNION ALL  SELECT 'bom_fin_detail',                COUNT(*) FROM bom_fin_detail
  UNION ALL  SELECT 'component_master',              COUNT(*) FROM component_master
  UNION ALL  SELECT 'supplier_master',               COUNT(*) FROM supplier_master
  UNION ALL  SELECT 'supplier_address_info',         COUNT(*) FROM supplier_address_info
  UNION ALL  SELECT 'supplier_bank_detail',          COUNT(*) FROM supplier_bank_detail
  UNION ALL  SELECT 'supplier_contact_info',         COUNT(*) FROM supplier_contact_info
  UNION ALL  SELECT 'customer_master',               COUNT(*) FROM customer_master
  UNION ALL  SELECT 'customer_address_info',         COUNT(*) FROM customer_address_info
  UNION ALL  SELECT 'customer_contact_info',         COUNT(*) FROM customer_contact_info
  UNION ALL  SELECT 'min_max_planning_master',       COUNT(*) FROM min_max_planning_master
  UNION ALL  SELECT 'supplier_rate_contract',        COUNT(*) FROM supplier_rate_contract
  UNION ALL  SELECT 'customer_price_metal_hdr',      COUNT(*) FROM customer_price_metal_hdr
  UNION ALL  SELECT 'customer_price_metal_line',     COUNT(*) FROM customer_price_metal_line
  UNION ALL  SELECT 'customer_price_stone_hdr',      COUNT(*) FROM customer_price_stone_hdr
  UNION ALL  SELECT 'customer_price_stone_line',     COUNT(*) FROM customer_price_stone_line
  UNION ALL  SELECT 'sales_order_hdr',               COUNT(*) FROM sales_order_hdr
  UNION ALL  SELECT 'sales_order_lines',             COUNT(*) FROM sales_order_lines
  UNION ALL  SELECT 'purchase_requisition',          COUNT(*) FROM purchase_requisition
  UNION ALL  SELECT 'purchase_order_hdr',            COUNT(*) FROM purchase_order_hdr
  UNION ALL  SELECT 'purchase_order_lines',          COUNT(*) FROM purchase_order_lines
  UNION ALL  SELECT 'wf_request (in-scope types)',   COUNT(*) FROM wf_request
               WHERE record_type IN ('FG_BOM', 'FINDING_BOM', 'SALES_ORDER', 'PURCHASE_ORDER');

SELECT 'BEFORE' AS phase, * FROM clear_scope_counts ORDER BY table_name;

-- ── Step 2: approval requests for the records being cleared ──────
-- wf_history is ON DELETE CASCADE from wf_request, so it goes with it.
-- wf_config / wf_step (the workflow SETUP) are deliberately untouched.
DELETE FROM wf_request
 WHERE record_type IN ('FG_BOM', 'FINDING_BOM', 'SALES_ORDER', 'PURCHASE_ORDER');

-- ── Step 3: the data, children before parents ────────────────────
-- DELETE rather than TRUNCATE so the order is explicit and so the
-- optional blocks in step 5 can be switched on without reshuffling a
-- single TRUNCATE list. Identity counters are reset in step 4.

-- Sales Order
DELETE FROM sales_order_lines;
DELETE FROM sales_order_hdr;

-- Purchase Order
DELETE FROM purchase_order_lines;
DELETE FROM purchase_order_hdr;

-- Purchase Requisition
-- After the POs: a requisition is what a PO line is raised from, and the
-- link is the req_number text carried on the line, not a foreign key —
-- so nothing enforces this order, but it keeps the buy-side wipe reading
-- the way the cycle runs.
DELETE FROM purchase_requisition;

-- Customer Rate Master
DELETE FROM customer_price_metal_line;
DELETE FROM customer_price_metal_hdr;
DELETE FROM customer_price_stone_line;
DELETE FROM customer_price_stone_hdr;

-- Supplier Rate Master
DELETE FROM supplier_rate_contract;

-- Min Max Planning
DELETE FROM min_max_planning_master;

-- FG BOM  /  Finding BOM   (before the variants they point at)
DELETE FROM bom_fg_detail;
DELETE FROM bom_fg;
DELETE FROM bom_fin_detail;
DELETE FROM bom_fin;

-- FG Master
DELETE FROM fg_item_variant_client;
DELETE FROM fg_item_variant;
DELETE FROM fg_item_media;
DELETE FROM fg_item_master;

-- Finding Master
DELETE FROM fin_item_variant_client;
DELETE FROM fin_item_variant;
DELETE FROM fin_item_media;
DELETE FROM fin_item_master;

-- Components Master
DELETE FROM component_master;

-- Customer Master   (after sales orders + customer rate master)
DELETE FROM customer_address_info;
DELETE FROM customer_contact_info;
DELETE FROM customer_master;

-- Supplier Master   (after purchase orders + supplier rate master)
DELETE FROM supplier_address_info;
DELETE FROM supplier_bank_detail;
DELETE FROM supplier_contact_info;
DELETE FROM supplier_master;

-- ── Step 4: restart the counters ─────────────────────────────────
-- 4a. Primary-key identity sequences. Resolved through
--     pg_get_serial_sequence rather than spelled out, because some of
--     these tables were renamed after creation (fg_item_master still
--     carries an item_master_pkey, fg_item_variant an item_variant_pkey)
--     and their sequences may not follow the <table>_id_seq convention.
--     Driven off pg_class so a table that is not present is simply not
--     matched, instead of raising. One row back per counter reset.
SELECT s.table_name, s.seq AS sequence_reset, setval(s.seq, 1, false) AS next_value
FROM (
  SELECT c.relname AS table_name,
         pg_get_serial_sequence('public.' || c.relname, 'id') AS seq
  FROM   pg_class c
  JOIN   pg_namespace n ON n.oid = c.relnamespace
  WHERE  n.nspname   = 'public'
    AND  c.relkind IN ('r', 'p')
    AND  c.relname = ANY (ARRAY[
           'fin_item_master', 'fin_item_media', 'fin_item_variant', 'fin_item_variant_client',
           'fg_item_master',  'fg_item_media',  'fg_item_variant',  'fg_item_variant_client',
           'bom_fg', 'bom_fg_detail', 'bom_fin', 'bom_fin_detail',
           'component_master',
           'supplier_master', 'supplier_address_info', 'supplier_bank_detail', 'supplier_contact_info',
           'customer_master', 'customer_address_info', 'customer_contact_info',
           'min_max_planning_master', 'supplier_rate_contract',
           'customer_price_metal_hdr', 'customer_price_metal_line',
           'customer_price_stone_hdr', 'customer_price_stone_line',
           'sales_order_hdr', 'sales_order_lines',
           'purchase_requisition',
           'purchase_order_hdr', 'purchase_order_lines'
         ])
) s
WHERE s.seq IS NOT NULL
ORDER BY s.table_name;

-- 4b. Business-code sequences, so the next record starts at 1 again:
--       customer_code_seq        -> customer_master.customer_code   CUST-000001
--       supplier_vendor_code_seq -> supplier_master.vendor_code     SUP-000001
--       seq_component_code       -> component_master.component_code TYPE-NAME-DESC-001
--       sales_order_no_seq       -> sales_order_hdr.order_no        SO-000001
--       purchase_requisition_no_seq
--                                -> purchase_requisition.requisition_number
--                                                                  PR-000001
--       purchase_order_no_seq    -> purchase_order_hdr.po_number    PO-000001
--     setval(..., 1, false) => the next nextval() returns 1. Same
--     pg_class approach as 4a: a sequence that is not there is not
--     matched, so it cannot abort the run.
SELECT c.relname AS sequence_reset, setval(c.oid::regclass, 1, false) AS next_value
FROM   pg_class c
JOIN   pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public'
  AND  c.relkind = 'S'
  AND  c.relname = ANY (ARRAY[
         'customer_code_seq', 'supplier_vendor_code_seq', 'seq_component_code',
         'sales_order_no_seq', 'purchase_requisition_no_seq', 'purchase_order_no_seq'
       ])
ORDER BY c.relname;

-- ── Step 5: OPTIONAL extra — off by default ──────────────────────
-- Design Master was not in the list of forms to clear. Uncomment the
-- whole block, sequence resets included, only if you want it gone too.
--
--     FG Master and Finding Master both hang off design_master, and rows
--     get created there by the FG / Finding create + import flows. With
--     both item masters emptied, whatever is left in design_master is
--     orphaned. Leave it commented if the design library is maintained
--     on its own and you want the design codes kept.
--     design_images cascades from design_master; the block deletes it
--     explicitly so the intent is visible.
--
-- DELETE FROM design_images;
-- DELETE FROM design_master;
-- SELECT setval(pg_get_serial_sequence('public.design_images', 'id'), 1, false);
-- SELECT setval(pg_get_serial_sequence('public.design_master', 'id'), 1, false);

-- ── Step 6: count everything in scope, after ─────────────────────
-- Every row_count here should be 0. Some clients only show the LAST
-- result grid of a script — if you cannot see this one, scroll the
-- result tabs, or run steps 1 and 6 on their own.
SELECT 'AFTER' AS phase, * FROM clear_scope_counts ORDER BY table_name;

-- Change to ROLLBACK for a dry run.
COMMIT;

SELECT 'Done. Restart the API (query config + lookup caches hold stale rows) before using the forms again.' AS next_step;
