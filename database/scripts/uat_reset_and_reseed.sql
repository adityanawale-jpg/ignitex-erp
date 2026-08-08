-- ============================================================
-- uat_reset_and_reseed.sql
--
-- DESTRUCTIVE: wipes ALL data in the UAT database (every table
-- except _prisma_migrations), then reloads ONLY default/system
-- data (users EMP001-EMP005, roles, permissions, menus, lookups,
-- config) from CSVs exported from Dev.
--
-- PREREQUISITES:
--   1. A full UAT backup exists (see backup command in step 0 below).
--   2. These 9 CSV files are present in /tmp/uat_seed/ on the UAT
--      server (exported from Dev):
--        role_master.csv, user_master.csv, menu_master.csv,
--        role_menu_mapping.csv, user_role.csv, user_menu_mapping.csv,
--        master_lookup.csv, project_config.csv, erp_settings.csv
--
-- RUN THIS ON THE UAT SERVER ONLY. Double-check your psql session
-- is connected to the UAT database (ignitex_uat), NOT Dev, before
-- running. Run interactively with psql -f, not through any pooler
-- that might silently retry statements.
-- ============================================================

-- ── Step 1: Wipe every table in the public schema except Prisma's
--            own migration-history table ──────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename <> '_prisma_migrations')
  LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;

-- ── Step 2: Load default/system data from the Dev exports ─────────
\copy role_master FROM '/tmp/uat_seed/role_master.csv' CSV HEADER
\copy menu_master FROM '/tmp/uat_seed/menu_master.csv' CSV HEADER

-- user_master has 3 self-referencing FKs (manager_id, created_by,
-- updated_by). Since we only export EMP001-EMP005, some of those
-- columns may point at a Dev user outside that set (e.g. whoever
-- last edited the record) and the FK would reject the row. Drop
-- the 3 constraints, load, null out any now-dangling references,
-- then restore the constraints — same fix Dev's own
-- 14_clean_user_data.sql applies for the identical reason.
ALTER TABLE user_master DROP CONSTRAINT user_master_manager_id_fkey;
ALTER TABLE user_master DROP CONSTRAINT user_master_created_by_fkey;
ALTER TABLE user_master DROP CONSTRAINT user_master_updated_by_fkey;

\copy user_master FROM '/tmp/uat_seed/user_master.csv' CSV HEADER

UPDATE user_master SET manager_id = NULL WHERE manager_id IS NOT NULL AND manager_id NOT IN (SELECT user_id FROM user_master);
UPDATE user_master SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT user_id FROM user_master);
UPDATE user_master SET updated_by = NULL WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT user_id FROM user_master);

ALTER TABLE user_master ADD CONSTRAINT user_master_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES user_master(user_id);
ALTER TABLE user_master ADD CONSTRAINT user_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES user_master(user_id);
ALTER TABLE user_master ADD CONSTRAINT user_master_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES user_master(user_id);

\copy role_menu_mapping FROM '/tmp/uat_seed/role_menu_mapping.csv' CSV HEADER
\copy user_role FROM '/tmp/uat_seed/user_role.csv' CSV HEADER
\copy user_menu_mapping FROM '/tmp/uat_seed/user_menu_mapping.csv' CSV HEADER
\copy master_lookup FROM '/tmp/uat_seed/master_lookup.csv' CSV HEADER
\copy project_config FROM '/tmp/uat_seed/project_config.csv' CSV HEADER
\copy erp_settings FROM '/tmp/uat_seed/erp_settings.csv' CSV HEADER

-- ── Step 3: Fix sequences (RESTART IDENTITY reset them to 1, but we
--            just loaded rows with explicit IDs from Dev) ─────────
SELECT setval(pg_get_serial_sequence('role_master','id'), COALESCE(MAX(id),1)) FROM role_master;
SELECT setval(pg_get_serial_sequence('user_master','user_id'), COALESCE(MAX(user_id),1)) FROM user_master;
SELECT setval(pg_get_serial_sequence('menu_master','id'), COALESCE(MAX(id),1)) FROM menu_master;
SELECT setval(pg_get_serial_sequence('role_menu_mapping','id'), COALESCE(MAX(id),1)) FROM role_menu_mapping;
SELECT setval(pg_get_serial_sequence('user_role','id'), COALESCE(MAX(id),1)) FROM user_role;
SELECT setval(pg_get_serial_sequence('user_menu_mapping','id'), COALESCE(MAX(id),1)) FROM user_menu_mapping;
SELECT setval(pg_get_serial_sequence('master_lookup','id'), COALESCE(MAX(id),1)) FROM master_lookup;
SELECT setval(pg_get_serial_sequence('project_config','id'), COALESCE(MAX(id),1)) FROM project_config;
-- erp_settings has no serial id column (PK is the text "key" column) — no sequence to fix

-- ── Step 4: Verify ──────────────────────────────────────────────
SELECT employee_id, first_name, last_name, user_status FROM user_master ORDER BY employee_id;
SELECT count(*) AS role_count FROM role_master;
SELECT count(*) AS menu_count FROM menu_master;
SELECT count(*) AS role_menu_count FROM role_menu_mapping;
SELECT count(*) AS user_role_count FROM user_role;
SELECT count(*) AS user_menu_override_count FROM user_menu_mapping;
SELECT count(*) AS lookup_count FROM master_lookup;
SELECT count(*) AS config_count FROM project_config;
SELECT count(*) AS settings_count FROM erp_settings;
