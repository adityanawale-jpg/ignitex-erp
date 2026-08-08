import { Response } from 'express';
import nodemailer from 'nodemailer';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { loadMailConfig, createTransporterFromConfig } from '../services/email.service';
import type { MailConfig } from '../services/email.service';

/**
 * POST /api/v1/mail/test
 * Send a test email using the saved mail configuration.
 */
export const sendTestMail = async (req: AuthRequest, res: Response): Promise<void> => {
  const { test_email } = req.body as { test_email?: string }

  if (!test_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_email)) {
    sendValidationError(res, 'A valid recipient email address is required')
    return
  }

  let config: MailConfig
  try {
    config = await loadMailConfig()
  } catch (err) {
    logger.error('Failed to load mail config for test', err)
    sendError(res, 'Could not read mail configuration from database.', 500)
    return
  }

  if (config.mail_is_active !== 'true') {
    sendError(res, 'Mail service is currently disabled. Enable it in Mail Configuration first.', 400)
    return
  }

  if (config.mail_driver === 'log') {
    logger.info(`[LOG DRIVER] Test email would be sent to ${test_email}`)
    sendSuccess(res, null, `Log driver active — test email logged (not sent) for ${test_email}`)
    return
  }

  try {
    const transporter = createTransporterFromConfig(config)

    const from = config.mail_from_name
      ? `"${config.mail_from_name}" <${config.mail_from_email}>`
      : config.mail_from_email

    await transporter.sendMail({
      from,
      to:      test_email,
      replyTo: config.mail_reply_to || config.mail_from_email,
      subject: 'Test Email — Royal Chain ERP Mail Configuration',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;
                    background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
          <h2 style="color:#1E293B;font-size:20px;margin:0 0 8px;">Mail Configuration Test</h2>
          <p style="color:#64748B;font-size:13px;margin:0 0 24px;">Royal Chain ERP</p>
          <p style="color:#334155;font-size:14px;">
            This is a test email sent from your Royal Chain ERP system to confirm that your
            outgoing mail settings are working correctly.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
            <tr style="background:#F8FAFC;">
              <td style="padding:8px 12px;color:#64748B;border:1px solid #E2E8F0;font-weight:600;">SMTP Host</td>
              <td style="padding:8px 12px;color:#1E293B;border:1px solid #E2E8F0;">${config.mail_host}:${config.mail_port}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#64748B;border:1px solid #E2E8F0;font-weight:600;">Encryption</td>
              <td style="padding:8px 12px;color:#1E293B;border:1px solid #E2E8F0;">${config.mail_encryption.toUpperCase()}</td>
            </tr>
            <tr style="background:#F8FAFC;">
              <td style="padding:8px 12px;color:#64748B;border:1px solid #E2E8F0;font-weight:600;">From</td>
              <td style="padding:8px 12px;color:#1E293B;border:1px solid #E2E8F0;">${from}</td>
            </tr>
          </table>
          <p style="color:#10B981;font-size:14px;font-weight:600;">
            ✓ Your mail configuration is working correctly.
          </p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
          <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0;">
            © ${new Date().getFullYear()} Royal Chain ERP · This is an automated test message.
          </p>
        </div>
      `,
    })

    logger.info(`Test email sent to ${test_email} via ${config.mail_host}`)
    sendSuccess(res, null, `Test email sent successfully to ${test_email}`)
  } catch (err) {
    const error = err as Error & { code?: string; responseCode?: number; response?: string }
    logger.error(`Test email failed: ${error.message}`)

    const isGmail   = config.mail_host.toLowerCase().includes('gmail')
    const isOutlook = config.mail_host.toLowerCase().includes('outlook') ||
                      config.mail_host.toLowerCase().includes('office365')

    let userMessage = error.message
    if (error.code === 'ECONNREFUSED')
      userMessage = `Connection refused — check that host "${config.mail_host}" and port ${config.mail_port} are correct.`
    else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET')
      userMessage = `Connection timed out — the server "${config.mail_host}" is unreachable. Check host, port, and firewall settings.`
    else if (error.code === 'EAUTH' || error.responseCode === 535 || error.responseCode === 534) {
      if (isGmail)
        userMessage =
          `Gmail blocked the login. Your normal Google password cannot be used for SMTP. ` +
          `You must create a Gmail App Password: go to myaccount.google.com → Security → 2-Step Verification → App passwords, ` +
          `generate a password for "Mail", and paste that 16-character code here instead.`
      else if (isOutlook)
        userMessage =
          `Outlook authentication failed. If 2-Step Verification is enabled on your account, ` +
          `create an App Password at account.microsoft.com → Security → Advanced security options.`
      else
        userMessage = `Authentication failed — the username or password was rejected by ${config.mail_host}.`
    }
    else if (error.responseCode === 550)
      userMessage = `Recipient rejected (550) — the address "${test_email}" was refused by the mail server.`
    else if (error.response)
      userMessage = `Server responded: ${error.response}`

    sendError(res, userMessage, 400)
  }
}
