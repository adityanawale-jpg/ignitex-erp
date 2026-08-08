-- Findings O+P: consolidates the 5 separate read queries authenticateUser()
-- made per login attempt (fetch user, check start_date, check expiry_date,
-- check role status, fetch role_name) into the single login_get query
-- template, computed via inline boolean/EXISTS expressions. Reference copy
-- of the same UPDATE applied directly against the local dev DB — run this
-- on any other environment (Dev/UAT) to keep project_config in sync.

UPDATE project_config SET key_value = '
SELECT u.user_id, u.employee_id, u.password_hash, u.first_name, u.last_name,
       u.emp_email, u.mobile_number, u.profile_image, u.user_status,
       (u.start_date > CURRENT_DATE) AS not_started,
       (u.expiry_date IS NOT NULL AND u.expiry_date < CURRENT_DATE) AS expired,
       EXISTS (SELECT 1 FROM user_role ur WHERE ur.user_id = u.user_id) AS has_any_role,
       EXISTS (
         SELECT 1 FROM user_role ur JOIN role_master rm ON rm.id = ur.role_id
         WHERE ur.user_id = u.user_id AND rm.is_active = TRUE
       ) AS has_active_role,
       (
         SELECT rm.role_name FROM user_role ur JOIN role_master rm ON rm.id = ur.role_id
         WHERE ur.user_id = u.user_id AND ur.is_default = TRUE LIMIT 1
       ) AS role_name
FROM user_master u
WHERE u.employee_id = :userid AND u.user_status = TRUE
', updated_at = NOW() WHERE key_code = 'login_get';
