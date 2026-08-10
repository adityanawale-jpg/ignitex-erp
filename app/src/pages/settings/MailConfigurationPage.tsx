import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  EnvelopeIcon,
  ServerIcon,
  LockClosedIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { dynamicApi, apiService } from '@/api/apiService'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'

// ── Types ─────────────────────────────────────────────────────
interface MailFormValues {
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

interface TestMailValues {
  test_email: string
}

type SaveStatus = { type: 'success'; time: string } | { type: 'error'; message: string } | null

// ── Toggle — defined outside to avoid React remount on re-render ──
interface ToggleProps {
  value: boolean
  onChange: () => void
  onColor?: string
}
const Toggle: React.FC<ToggleProps> = ({ value, onChange, onColor = 'bg-[var(--color-primary)]' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors
      focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1
      ${value ? onColor : 'bg-gray-300 dark:bg-gray-600'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
        ${value ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
)

// ── Section — defined outside ─────────────────────────────────
const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon, title, children,
}) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-primary)]">
      <span className="text-[var(--color-primary)]">{icon}</span>
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{title}</h3>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
)

// ── Field — defined outside ───────────────────────────────────
const Field: React.FC<{
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}> = ({ label, required, hint, error, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-[var(--text-secondary)]">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    {error && (
      <p className="text-xs text-red-500 flex items-center gap-1">
        <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />{error}
      </p>
    )}
  </div>
)

// ── Validation ────────────────────────────────────────────────
const schema = yup.object({
  mail_driver:     yup.string().required('Mail driver is required'),
  mail_host:       yup.string().when('mail_driver', {
    is: 'smtp',
    then: (s) => s.required('SMTP host is required'),
    otherwise: (s) => s.default(''),
  }),
  mail_port:       yup.string().when('mail_driver', {
    is: 'smtp',
    then: (s) => s.required('SMTP port is required').matches(/^\d+$/, 'Port must be a number'),
    otherwise: (s) => s.default(''),
  }),
  mail_encryption: yup.string().default('tls'),
  mail_auth:       yup.string().default('true'),
  mail_username:   yup.string().when('mail_auth', {
    is: 'true',
    then: (s) => s.required('Username is required when authentication is enabled'),
    otherwise: (s) => s.default(''),
  }),
  mail_password:   yup.string().default(''),
  mail_from_email: yup.string().email('Invalid email address').required('From email is required'),
  mail_from_name:  yup.string().required('From name is required'),
  mail_reply_to:   yup.string()
    .transform((v: string) => (v === '' ? undefined : v))
    .email('Invalid reply-to email')
    .optional()
    .default(''),
  mail_timeout:    yup.string().default('30'),
  mail_is_active:  yup.string().default('true'),
})

const testSchema = yup.object({
  test_email: yup.string().email('Invalid email address').required('Recipient email is required'),
})

const DEFAULTS: MailFormValues = {
  mail_driver:     'smtp',
  mail_host:       '',
  mail_port:       '587',
  mail_encryption: 'tls',
  mail_auth:       'true',
  mail_username:   '',
  mail_password:   '',
  mail_from_email: '',
  mail_from_name:  'IgniteX.ai ERP',
  mail_reply_to:   '',
  mail_timeout:    '30',
  mail_is_active:  'true',
}

const nowTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

// ── Page ──────────────────────────────────────────────────────
const MailConfigurationPage: React.FC = () => {
  const [loading,        setLoading]       = useState(true)
  const [saving,         setSaving]        = useState(false)
  const [saveStatus,     setSaveStatus]    = useState<SaveStatus>(null)
  const [testSending,   setTestSending]  = useState(false)
  const [testStatus,    setTestStatus]   = useState<SaveStatus>(null)
  const [showPassword,  setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MailFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: DEFAULTS,
  })

  const {
    register:      regTest,
    handleSubmit:  handleTestSubmit,
    formState: {   errors: testErrors },
  } = useForm<TestMailValues>({ resolver: yupResolver(testSchema) })

  const mailDriver  = watch('mail_driver')
  const requireAuth = watch('mail_auth')      === 'true'
  const isActive    = watch('mail_is_active') === 'true'

  // ── Load ────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const res = await dynamicApi.get('mail_config_get')
        const rows: { key_code: string; key_value: string }[] = res.data?.data ?? []
        const values = { ...DEFAULTS }
        rows.forEach((r) => {
          if (r.key_code in values)
            (values as Record<string, string>)[r.key_code] = r.key_value
        })
        reset(values, { keepDirty: false })
      } catch {
        setSaveStatus({ type: 'error', message: 'Could not load configuration from server.' })
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save ────────────────────────────────────────────────────
  const onSave = async (data: MailFormValues) => {
    setSaving(true)
    setSaveStatus(null)
    try {
      await Promise.all(
        (Object.entries(data) as [string, string][]).map(([key_code, key_value]) =>
          dynamicApi.put('mail_config_update', { key_code }, { key_value })
        )
      )
      reset(data, { keepDirty: false })
      setSaveStatus({ type: 'success', time: nowTime() })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'An unexpected error occurred while saving.'
      setSaveStatus({ type: 'error', message: msg })
    } finally {
      setSaving(false)
    }
  }

  // ── Test mail ───────────────────────────────────────────────
  const onSendTest = async (data: TestMailValues) => {
    setTestSending(true)
    setTestStatus(null)
    try {
      await apiService.post('/mail/test', { test_email: data.test_email })
      setTestStatus({ type: 'success', time: `Test email sent to ${data.test_email} at ${nowTime()}` })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not send test email. Verify your SMTP settings and try again.'
      setTestStatus({ type: 'error', message: msg })
    } finally {
      setTestSending(false)
    }
  }

  const inputCls = (hasError?: boolean) =>
    `w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-input)] text-[var(--text-primary)]
     placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
     transition-colors ${hasError ? 'border-red-400' : 'border-[var(--border-primary)]'}`

  const selectCls = (hasError?: boolean) =>
    `w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-input)] text-[var(--text-primary)]
     focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors
     ${hasError ? 'border-red-400' : 'border-[var(--border-primary)]'}`

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading mail configuration…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      <PageBreadcrumb parent="System Admin" current="Mail Configuration" className="" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <EnvelopeIcon className="w-5 h-5 text-[var(--color-primary)]" />
            Mail Configuration
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Configure SMTP and sender settings for all outgoing system emails.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit(onSave)}
          disabled={saving}
          style={{ background: 'var(--accent-gold)', color: '#fff' }}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg
            hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity shadow-sm whitespace-nowrap"
        >
          {saving ? (
            <><ArrowPathIcon className="w-4 h-4 animate-spin" />Saving…</>
          ) : (
            <><CheckCircleIcon className="w-4 h-4" />Save Changes</>
          )}
        </button>
      </div>

      {/* ── Save Status Banner ── */}
      {saveStatus && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm
          ${saveStatus.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-700 dark:text-green-300'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-700 dark:text-red-300'}`}
        >
          {saveStatus.type === 'success'
            ? <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500" />
            : <XCircleIcon    className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />}
          <div className="flex-1">
            {saveStatus.type === 'success' ? (
              <>
                <span className="font-semibold">Configuration saved successfully.</span>
                <span className="ml-1 text-green-600 dark:text-green-400">
                  Saved at {saveStatus.time}
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">Failed to save configuration. </span>
                <span>{saveStatus.message}</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSaveStatus(null)}
            className="flex-shrink-0 opacity-50 hover:opacity-80 leading-none"
          >✕</button>
        </div>
      )}


      {/* ── Main Form ── */}
      <form onSubmit={handleSubmit(onSave)} className="space-y-5" noValidate>

        {/* General */}
        <Section icon={<ServerIcon className="w-4 h-4" />} title="General Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <Field label="Mail Driver" required error={errors.mail_driver?.message}>
              <select {...register('mail_driver')} className={selectCls(!!errors.mail_driver)}>
                <option value="smtp">SMTP</option>
                <option value="sendmail">Sendmail</option>
                <option value="log">Log (Development only)</option>
              </select>
            </Field>

            <Field label="Mail Service">
              <div className="flex items-center gap-3 h-[38px]">
                <Toggle
                  value={isActive}
                  onColor="bg-green-500"
                  onChange={() => setValue('mail_is_active', isActive ? 'false' : 'true', { shouldDirty: true })}
                />
                <span className={`text-sm font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-muted)]'}`}>
                  {isActive ? 'Enabled — emails will be sent' : 'Disabled — no emails will be sent'}
                </span>
              </div>
            </Field>

          </div>

          {mailDriver === 'sendmail' && (
            <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-50 border border-amber-200
              dark:bg-amber-950/20 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Sendmail uses the server's local MTA. Ensure{' '}
                <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">sendmail</code>{' '}
                is installed and configured on the host.
              </span>
            </div>
          )}
          {mailDriver === 'log' && (
            <div className="flex gap-2 items-start p-3 rounded-lg bg-purple-50 border border-purple-200
              dark:bg-purple-950/20 dark:border-purple-700 text-sm text-purple-800 dark:text-purple-300">
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Log driver writes emails to the application log file. No real emails are sent.{' '}
                <strong>Do not use in production.</strong>
              </span>
            </div>
          )}
        </Section>

        {/* SMTP Server */}
        {mailDriver === 'smtp' && (
          <Section icon={<ServerIcon className="w-4 h-4" />} title="SMTP Server">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="sm:col-span-2">
                <Field label="SMTP Host" required error={errors.mail_host?.message}
                  hint="e.g. smtp.gmail.com, smtp.office365.com">
                  <input
                    {...register('mail_host')}
                    type="text"
                    placeholder="smtp.gmail.com"
                    className={inputCls(!!errors.mail_host)}
                  />
                </Field>
              </div>

              <Field label="Port" required error={errors.mail_port?.message}
                hint="25 · 465 (SSL) · 587 (TLS)">
                <input
                  {...register('mail_port')}
                  type="text"
                  placeholder="587"
                  className={inputCls(!!errors.mail_port)}
                />
              </Field>

              <Field label="Encryption" error={errors.mail_encryption?.message}>
                <select {...register('mail_encryption')} className={selectCls(!!errors.mail_encryption)}>
                  <option value="none">None</option>
                  <option value="tls">TLS / STARTTLS  (port 587)</option>
                  <option value="ssl">SSL  (port 465)</option>
                </select>
              </Field>

              <Field label="Connection Timeout (seconds)" error={errors.mail_timeout?.message}>
                <input
                  {...register('mail_timeout')}
                  type="number"
                  min="5"
                  max="120"
                  placeholder="30"
                  className={inputCls(!!errors.mail_timeout)}
                />
              </Field>

            </div>
          </Section>
        )}

        {/* Authentication */}
        {mailDriver === 'smtp' && (
          <Section icon={<LockClosedIcon className="w-4 h-4" />} title="Authentication">

            <Field label="Require Authentication" error={errors.mail_auth?.message}>
              <div className="flex items-center gap-3 h-[38px]">
                <Toggle
                  value={requireAuth}
                  onChange={() => setValue('mail_auth', requireAuth ? 'false' : 'true', { shouldDirty: true })}
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  {requireAuth ? 'Enabled' : 'Disabled — no credentials sent'}
                </span>
              </div>
            </Field>

            {/* Always show credentials — just disabled when auth is off */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 transition-opacity ${requireAuth ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

              <Field label="SMTP Username" required={requireAuth} error={errors.mail_username?.message}
                hint="Usually the full email address">
                <input
                  {...register('mail_username')}
                  type="text"
                  placeholder="your@email.com"
                  autoComplete="username"
                  disabled={!requireAuth}
                  className={inputCls(!!errors.mail_username)}
                />
              </Field>

              <Field label="SMTP Password" error={errors.mail_password?.message}
                hint={
                  watch('mail_host')?.toLowerCase().includes('gmail')
                    ? 'Gmail: use an App Password — your normal Google password is blocked by Google for SMTP. Go to myaccount.google.com → Security → App passwords.'
                    : watch('mail_host')?.toLowerCase().includes('outlook') || watch('mail_host')?.toLowerCase().includes('office365')
                    ? 'Outlook/Office 365: use an App Password when 2-Step Verification is on.'
                    : 'Use an App Password if your provider requires 2-Step Verification.'
                }>
                <div className="relative">
                  <input
                    {...register('mail_password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={!requireAuth}
                    className={`${inputCls(!!errors.mail_password)} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 flex items-center px-3
                      text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword
                      ? <EyeSlashIcon className="w-4 h-4" />
                      : <EyeIcon      className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

            </div>

          </Section>
        )}

        {/* Sender */}
        <Section icon={<UserIcon className="w-4 h-4" />} title="Sender Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <Field label="From Email Address" required error={errors.mail_from_email?.message}>
              <input
                {...register('mail_from_email')}
                type="email"
                placeholder="noreply@yourcompany.com"
                className={inputCls(!!errors.mail_from_email)}
              />
            </Field>

            <Field label="From Name (Display Name)" required error={errors.mail_from_name?.message}>
              <input
                {...register('mail_from_name')}
                type="text"
                placeholder="IgniteX.ai ERP"
                className={inputCls(!!errors.mail_from_name)}
              />
            </Field>

            <Field label="Reply-To Email" error={errors.mail_reply_to?.message}
              hint="Leave blank to use the From address">
              <input
                {...register('mail_reply_to')}
                type="email"
                placeholder="support@yourcompany.com"
                className={inputCls(!!errors.mail_reply_to)}
              />
            </Field>

          </div>
        </Section>

        {/* ── Test Mail ── */}
        <Section icon={<PaperAirplaneIcon className="w-4 h-4" />} title="Test Mail">
          <p className="text-xs text-[var(--text-muted)]">
            Send a test email to verify your configuration is working.
            Make sure you <strong>Save Configuration</strong> before testing.
          </p>

          {/* Recipient input */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Recipient Email Address <span className="text-red-500">*</span>
            </label>
            <input
              {...regTest('test_email')}
              type="email"
              placeholder="recipient@example.com"
              className={inputCls(!!testErrors.test_email)}
            />
            {testErrors.test_email && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
                {testErrors.test_email.message}
              </p>
            )}
          </div>

          {/* Send button */}
          <div>
            <button
              type="button"
              onClick={handleTestSubmit(onSendTest)}
              disabled={testSending}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg
                bg-green-500 hover:bg-green-600 text-white
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testSending ? (
                <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                <><PaperAirplaneIcon className="w-4 h-4" /> Send</>
              )}
            </button>
          </div>

          {/* Result banner */}
          {testStatus && (
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm border ${
              testStatus.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-700 dark:text-green-300'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-700 dark:text-red-300'
            }`}>
              {testStatus.type === 'success'
                ? <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" />
                : <XCircleIcon    className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />}
              <span>{testStatus.type === 'success' ? testStatus.time : testStatus.message}</span>
            </div>
          )}
        </Section>

        {/* ── Action Bar ── */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg
              bg-[var(--color-primary)] text-white hover:opacity-90
              disabled:opacity-60 disabled:cursor-not-allowed transition-opacity shadow-sm"
          >
            {saving ? (
              <><ArrowPathIcon className="w-4 h-4 animate-spin" />Saving…</>
            ) : (
              <><CheckCircleIcon className="w-4 h-4" />Save Configuration</>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}

export default MailConfigurationPage
