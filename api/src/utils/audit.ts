import { executeQuery } from '../database/connection';
import { logger } from './logger';

interface AuditParams {
  userId?:     number | null;
  employeeId?: string;
  fullName?:   string;
  action:      string;   // CREATE | UPDATE | DELETE | ASSIGN | REVOKE | LOGIN | LOGOUT | CONFIG
  module:      string;   // Users | Roles | Permissions | User-Role | Mail Config | Menu | Login
  recordId?:   string | number;
  description: string;
  oldValues?:  Record<string, unknown>;
  newValues?:  Record<string, unknown>;
  ipAddress?:  string;
}

/** Fire-and-forget audit log. Never throws — failures are logged to console only. */
export const logAudit = (params: AuditParams): void => {
  setImmediate(async () => {
    try {
      await executeQuery(
        `INSERT INTO audit_log
           (user_id, employee_id, full_name, action, module, record_id, description, old_values, new_values, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          params.userId      ?? null,
          params.employeeId  ?? null,
          params.fullName    ?? null,
          params.action,
          params.module,
          params.recordId    != null ? String(params.recordId) : null,
          params.description,
          params.oldValues   ? JSON.stringify(params.oldValues)  : null,
          params.newValues   ? JSON.stringify(params.newValues)  : null,
          params.ipAddress   ?? null,
        ],
      );
    } catch (err) {
      logger.warn('Audit log write failed:', err);
    }
  });
};

/** Log to system_error_log table. Fire-and-forget. */
export const logError = (params: {
  severity?:      string;
  errorType?:     string;
  message:        string;
  stackTrace?:    string;
  requestPath?:   string;
  requestMethod?: string;
  userId?:        number | null;
  employeeId?:    string;
  ipAddress?:     string;
}): void => {
  setImmediate(async () => {
    try {
      await executeQuery(
        `INSERT INTO system_error_log
           (severity, error_type, message, stack_trace, request_path, request_method, user_id, employee_id, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          params.severity      ?? 'ERROR',
          params.errorType     ?? null,
          params.message,
          params.stackTrace    ?? null,
          params.requestPath   ?? null,
          params.requestMethod ?? null,
          params.userId        ?? null,
          params.employeeId    ?? null,
          params.ipAddress     ?? null,
        ],
      );
    } catch (err) {
      logger.warn('Error log write failed:', err);
    }
  });
};
