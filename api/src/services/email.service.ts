import nodemailer from 'nodemailer';
import { executeQuery } from '../database/connection';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

const SMTP_RETRY = { retries: 3, delaysMs: [2000, 4000, 8000] };

// ── Mail config type ──────────────────────────────────────────
export interface MailConfig {
  mail_driver:     string
  mail_host:       string
  mail_port:       string
  mail_encryption: string
  mail_auth:       string
  mail_username:   string
  mail_password:   string
  mail_from_email: string
  mail_from_name:  string
  mail_reply_to:   string
  mail_timeout:    string
  mail_is_active:  string
}

// ── Load config from project_config table ────────────────────
export const loadMailConfig = async (): Promise<MailConfig> => {
  const rows = await executeQuery<{ key_code: string; key_value: string }>(
    `SELECT key_code, key_value FROM project_config WHERE key_code LIKE 'mail_%' AND is_active = TRUE`
  );
  const cfg: Record<string, string> = {};
  rows.forEach((r) => { cfg[r.key_code] = r.key_value; });
  return {
    mail_driver:     cfg.mail_driver     ?? 'smtp',
    mail_host:       cfg.mail_host       ?? '',
    mail_port:       cfg.mail_port       ?? '587',
    mail_encryption: cfg.mail_encryption ?? 'tls',
    mail_auth:       cfg.mail_auth       ?? 'true',
    mail_username:   cfg.mail_username   ?? '',
    mail_password:   cfg.mail_password   ?? '',
    mail_from_email: cfg.mail_from_email ?? '',
    mail_from_name:  cfg.mail_from_name  ?? 'Royal Chain ERP',
    mail_reply_to:   cfg.mail_reply_to   ?? '',
    mail_timeout:    cfg.mail_timeout    ?? '30',
    mail_is_active:  cfg.mail_is_active  ?? 'true',
  };
};

// ── Build transporter from DB config ─────────────────────────
export const createTransporterFromConfig = (config: MailConfig): nodemailer.Transporter => {
  const port     = parseInt(config.mail_port) || 587;
  const secure   = config.mail_encryption === 'ssl';
  const starttls = config.mail_encryption === 'tls';

  return nodemailer.createTransport({
    host: config.mail_host,
    port,
    secure,
    connectionTimeout: (parseInt(config.mail_timeout) || 30) * 1000,
    ...(config.mail_auth === 'true' && {
      auth: { user: config.mail_username, pass: config.mail_password },
    }),
    ...(starttls && { tls: { ciphers: 'SSLv3' }, requireTLS: true }),
  } as nodemailer.TransportOptions);
};

// ── Send password-reset OTP email ─────────────────────────────
export const sendPasswordResetEmail = async (
  toEmail: string,
  employeeId: string,
  otp: string,
  expiryMinutes: number
): Promise<void> => {
  const config = await loadMailConfig();

  if (config.mail_is_active !== 'true') {
    logger.warn('Mail service is disabled — password reset OTP email not sent');
    throw new Error('Mail service is currently disabled. Contact the administrator to enable it in Mail Configuration.');
  }

  if (config.mail_driver === 'log') {
    logger.info(`[LOG DRIVER] Password reset OTP for ${employeeId}: ${otp} → ${toEmail}`);
    return;
  }

  const transporter = createTransporterFromConfig(config);

  const from = config.mail_from_name
    ? `"${config.mail_from_name}" <${config.mail_from_email}>`
    : config.mail_from_email;

  await withRetry(() => transporter.sendMail({
    from,
    to:      toEmail,
    replyTo: config.mail_reply_to || config.mail_from_email,
    subject: 'Password Reset OTP — Royal Chain ERP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;
                  background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1E293B;font-size:22px;margin:0;">Royal Chain ERP</h2>
          <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Password Reset Request</p>
        </div>
        <p style="color:#334155;font-size:14px;">Hello <strong>${employeeId}</strong>,</p>
        <p style="color:#334155;font-size:14px;">
          Use the OTP below to reset your password.
          It is valid for <strong>${expiryMinutes} minutes</strong>.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <span style="display:inline-block;font-size:36px;font-weight:bold;letter-spacing:10px;
                        color:#1E293B;background:#F1F5F9;padding:16px 28px;border-radius:8px;
                        border:2px dashed #CBD5E1;">
            ${otp}
          </span>
        </div>
        <p style="color:#64748B;font-size:13px;">
          If you did not request a password reset, ignore this email. Your password will not change.
        </p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0;">
          © ${new Date().getFullYear()} Royal Chain ERP · Enterprise Resource Planning
        </p>
      </div>
    `,
  }), { ...SMTP_RETRY, label: `Password reset OTP email to ${toEmail}` });

  logger.info(`Password reset OTP email sent to ${toEmail} for ${employeeId}`);
};

// ── Send welcome / account-activation email ───────────────────
export const sendWelcomeEmail = async (
  toEmail:      string,
  fullName:     string,
  employeeId:   string,
  activationUrl: string,
): Promise<void> => {
  const config = await loadMailConfig();

  if (config.mail_is_active !== 'true') {
    logger.warn('Mail service is disabled — welcome email not sent');
    return;               // non-blocking: don't throw, user was still created
  }

  if (config.mail_driver === 'log') {
    logger.info(`[LOG DRIVER] Welcome email for ${employeeId} → ${toEmail} | activation: ${activationUrl}`);
    return;
  }

  const transporter = createTransporterFromConfig(config);
  const from = config.mail_from_name
    ? `"${config.mail_from_name}" <${config.mail_from_email}>`
    : config.mail_from_email;

  const year = new Date().getFullYear();

  await withRetry(() => transporter.sendMail({
    from,
    to:      toEmail,
    replyTo: config.mail_reply_to || config.mail_from_email,
    subject: `Welcome to ${config.mail_from_name || 'Royal Chain ERP'} — Activate Your Account`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;
                  background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
        <div style="text-align:center;margin-bottom:28px;">
          <h2 style="color:#1E293B;font-size:22px;margin:0;">${config.mail_from_name || 'Royal Chain ERP'}</h2>
          <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Your account is ready</p>
        </div>

        <p style="color:#334155;font-size:14px;margin:0 0 8px;">Hello <strong>${fullName}</strong>,</p>
        <p style="color:#334155;font-size:14px;margin:0 0 20px;">
          Your account has been created successfully. Please click the button below to activate it.
          This link is valid for <strong>24 hours</strong>.
        </p>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:16px;margin:0 0 20px;">
          <p style="color:#475569;font-size:13px;margin:0 0 4px;">
            <strong>Employee ID:</strong>&nbsp; ${employeeId}
          </p>
          <p style="color:#475569;font-size:13px;margin:0;">
            <strong>Email:</strong>&nbsp; ${toEmail}
          </p>
        </div>

        <div style="text-align:center;margin:28px 0;">
          <a href="${activationUrl}"
             style="display:inline-block;background:#C9973A;color:#ffffff;text-decoration:none;
                    font-size:15px;font-weight:600;padding:14px 36px;border-radius:6px;
                    letter-spacing:0.3px;">
            Activate My Account
          </a>
        </div>

        <p style="color:#64748B;font-size:12px;line-height:1.6;margin:0 0 4px;">
          If the button above does not work, copy and paste this link into your browser:
        </p>
        <p style="font-size:11px;word-break:break-all;color:#94A3B8;margin:0 0 20px;">${activationUrl}</p>

        <p style="color:#94A3B8;font-size:12px;margin:0 0 4px;">
          If you did not expect this email, please ignore it or contact your administrator.
        </p>

        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
        <p style="color:#CBD5E1;font-size:11px;text-align:center;margin:0;">
          © ${year} ${config.mail_from_name || 'Royal Chain ERP'} · Enterprise Resource Planning
        </p>
      </div>
    `,
  }), { ...SMTP_RETRY, label: `Welcome email to ${toEmail}` });

  logger.info(`Welcome email sent to ${toEmail} for ${employeeId}`);
};
