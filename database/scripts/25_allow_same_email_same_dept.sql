-- Migration 25: Allow same email within the same department
-- Removes all unique constraints on emp_email (validation is handled in application layer)

ALTER TABLE user_master DROP CONSTRAINT IF EXISTS user_master_emp_email_key;
ALTER TABLE user_master DROP CONSTRAINT IF EXISTS user_master_emp_email_unique;
ALTER TABLE user_master DROP CONSTRAINT IF EXISTS user_master_email_dept_unique;

-- Drop any remaining email-only or email+dept unique constraints dynamically
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  LOOP
    SELECT conname INTO v_conname
    FROM pg_constraint
    WHERE conrelid = 'user_master'::regclass
      AND contype = 'u'
      AND conname ILIKE '%email%'
    LIMIT 1;

    EXIT WHEN v_conname IS NULL;
    EXECUTE 'ALTER TABLE user_master DROP CONSTRAINT ' || quote_ident(v_conname);
  END LOOP;
END $$;
