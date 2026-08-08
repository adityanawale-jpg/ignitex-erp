-- ============================================================
-- 96_operation_machine_multi.sql
-- Change operation_master.machine_id (INT) to machine_ids (INT[])
-- to support multiple machines per operation.
-- Updates all project_config queries accordingly.
-- ============================================================

BEGIN;

-- ── 1. Add machine_ids array column ─────────────────────────
ALTER TABLE operation_master
  ADD COLUMN machine_ids INT[] NOT NULL DEFAULT '{}';

-- ── 2. Migrate existing single machine_id → machine_ids ─────
UPDATE operation_master
  SET machine_ids = ARRAY[machine_id]
  WHERE machine_id IS NOT NULL;

-- ── 3. Drop old single-machine column & index ────────────────
DROP INDEX IF EXISTS idx_op_machine;
ALTER TABLE operation_master DROP COLUMN machine_id;

-- ── 4. GIN index on the array ────────────────────────────────
CREATE INDEX idx_op_machine_ids ON operation_master USING GIN(machine_ids);

-- ── 5. Update project_config: operation_list_select ──────────
-- machine_ids returned as array; machine_names as STRING_AGG
UPDATE project_config SET key_value =
'SELECT o.id, o.operation_code, o.operation_name,
       o.dept_id, d.dept_name, d.dept_code AS dept_ref_code,
       o.machine_ids,
       (SELECT STRING_AGG(m.machine_name, '', '' ORDER BY m.machine_name)
        FROM machine_master m WHERE m.id = ANY(o.machine_ids)) AS machine_names,
       o.std_time, o.yield_percentage, o.process_by,
       o.deactivation_reason, o.deactivated_at,
       o.is_active, o.created_at, o.updated_at
FROM operation_master o
LEFT JOIN dept_master d ON d.id = o.dept_id'
WHERE key_code = 'operation_list_select';

-- ── 6. Update project_config: operation_list_count ───────────
UPDATE project_config SET key_value =
'SELECT COUNT(*) AS total
FROM operation_master o
LEFT JOIN dept_master d ON d.id = o.dept_id'
WHERE key_code = 'operation_list_count';

-- ── 7. Update project_config: operation_create ───────────────
-- Params: $1 operation_name, $2 dept_id, $3 machine_ids(INT[]),
--         $4 std_time, $5 yield_percentage, $6 process_by, $7 user_id
UPDATE project_config SET key_value =
'INSERT INTO operation_master
  (operation_code, operation_name, dept_id, machine_ids,
   std_time, yield_percentage, process_by, created_by, updated_by)
VALUES
  (''OP'' || LPAD(nextval(''operation_code_seq'')::text, 4, ''0''),
   $1, $2, $3::INT[], $4, $5, $6, $7, $7)
RETURNING id, operation_code'
WHERE key_code = 'operation_create';

-- ── 8. Update project_config: operation_update ───────────────
-- Params: $1 operation_name, $2 dept_id, $3 machine_ids(INT[]),
--         $4 std_time, $5 yield_percentage, $6 process_by, $7 user_id, $8 id
UPDATE project_config SET key_value =
'UPDATE operation_master
SET operation_name=$1, dept_id=$2, machine_ids=$3::INT[],
    std_time=$4, yield_percentage=$5, process_by=$6,
    updated_by=$7, updated_at=NOW()
WHERE id=$8
RETURNING id, operation_code'
WHERE key_code = 'operation_update';

COMMIT;
