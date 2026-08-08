import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  User, Mail, Phone, Briefcase, Building2, Calendar, Shield,
  Edit3, KeyRound, Save, X, CheckCircle, Eye, EyeOff, RefreshCw,
  BadgeCheck, Clock, Globe, Languages, Camera, Upload, AlertCircle,
  ArrowRight, ArrowLeft, Send, RotateCcw,
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/hooks'
import { updateUser as updateUserSlice, fetchProfileAsync } from '@/redux/slices/authSlice'
import { apiService, getFileUrl } from '@/api/apiService'
import toast from 'react-hot-toast'

// ── helpers ────────────────────────────────────────────────────

const initials = (name?: string) =>
  (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })

// ── InfoRow ────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }: {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>; label: string; value?: string | null
}) => (
  <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
         style={{ background: 'var(--bg-tertiary)' }}>
      <Icon className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-medium truncate" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value || '—'}
      </p>
    </div>
  </div>
)

// ── OTP digit boxes ────────────────────────────────────────────
const OTPInput = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  const boxRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits  = value.padEnd(6, ' ').split('').slice(0, 6)

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const next = digits.map((d, j) => j === i ? ' ' : d).join('').trimEnd()
      onChange(next)
      if (i > 0) boxRefs.current[i - 1]?.focus()
    }
  }

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, j) => j === i ? (ch || ' ') : d).join('')
    onChange(next.trimEnd())
    if (ch && i < 5) boxRefs.current[i + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    boxRefs.current[Math.min(pasted.length, 5)]?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { boxRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2 outline-none transition-colors disabled:opacity-50"
          style={{
            height: '52px',
            borderColor: d.trim() ? 'var(--accent-gold)' : 'var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      ))}
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────

type PwStep = 'idle' | 'sending' | 'otp-sent' | 'verifying' | 'verified' | 'pw-saving'

const UserProfilePage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((s) => s.auth)

  // ── Profile photo ─────────────────────────────────────────────
  const fileRef          = useRef<HTMLInputElement>(null)
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)
  const [photoB64,       setPhotoB64]       = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoDeleting,  setPhotoDeleting]  = useState(false)

  // ── Profile form ──────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '')
  const [mobile,    setMobile]    = useState(() =>
    (user?.mobile_number ?? '').replace(/^\+91[-\s]?/, '').replace(/\D/g, '').slice(0, 10)
  )
  const [mobileErr, setMobileErr] = useState('')
  const [saving,    setSaving]    = useState(false)

  // ── Password / OTP flow ───────────────────────────────────────
  const [pwOpen,      setPwOpen]      = useState(false)
  const [pwStep,      setPwStep]      = useState<PwStep>('idle')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp,         setOtp]         = useState('')
  const [otpError,    setOtpError]    = useState('')
  const [resetToken,  setResetToken]  = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confPw,      setConfPw]      = useState('')
  const [showNew,     setShowNew]     = useState(false)
  const [showConf,    setShowConf]    = useState(false)
  const [countdown,   setCountdown]   = useState(0)

  // Sync form when Redux user updates
  useEffect(() => {
    setFirstName(user?.first_name ?? '')
    setLastName(user?.last_name  ?? '')
    setMobile((user?.mobile_number ?? '').replace(/^\+91[-\s]?/, '').replace(/\D/g, '').slice(0, 10))
    setMobileErr('')
  }, [user])

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((v) => v - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  // ── Photo handlers ────────────────────────────────────────────
  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Select a valid image file'); return }
    const b64 = await toBase64(file)
    setPhotoPreview(b64)
    setPhotoB64(b64)
    e.target.value = ''
  }, [])

  const uploadPhoto = useCallback(async () => {
    if (!photoB64) return
    setPhotoUploading(true)
    try {
      const res = await apiService.put('/auth/profile/photo', { photo: photoB64 })
      if (res.data.success) {
        dispatch(updateUserSlice({ profile_image: res.data.data?.photo_url }))
        toast.success('Profile photo updated')
        setPhotoPreview(null)
        setPhotoB64(null)
      } else {
        toast.error(res.data.message || 'Upload failed')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to upload photo')
    } finally {
      setPhotoUploading(false)
    }
  }, [photoB64, dispatch])

  const deletePhoto = useCallback(async () => {
    setPhotoDeleting(true)
    try {
      const res = await apiService.delete('/auth/profile/photo')
      if (res.data.success) {
        dispatch(updateUserSlice({ profile_image: undefined }))
        toast.success('Profile photo removed')
      } else {
        toast.error(res.data.message || 'Failed to remove photo')
      }
    } catch {
      toast.error('Failed to remove photo')
    } finally {
      setPhotoDeleting(false)
    }
  }, [dispatch])

  // ── Profile form save ─────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!firstName.trim()) { toast.error('First name is required'); return }
    if (mobile && mobile.length !== 10) { setMobileErr('Enter a valid 10-digit mobile number'); return }
    setMobileErr('')
    setSaving(true)
    try {
      const mobileToSave = mobile ? `+91${mobile}` : ''
      const res = await apiService.put('/auth/profile', {
        first_name: firstName.trim(), last_name: lastName.trim(), mobile_number: mobileToSave,
      })
      if (res.data.success) {
        const u = res.data.data?.user
        if (u) dispatch(updateUserSlice({
          first_name: u.first_name, last_name: u.last_name,
          mobile_number: u.mobile_number,
          full_name: `${u.first_name} ${u.last_name ?? ''}`.trim(),
        }))
        toast.success('Profile updated')
      } else toast.error(res.data.message || 'Update failed')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }, [firstName, lastName, mobile, dispatch])

  // ── OTP flow handlers ─────────────────────────────────────────
  const resetPwFlow = () => {
    setPwOpen(false); setPwStep('idle'); setOtp(''); setOtpError('')
    setResetToken(''); setNewPw(''); setConfPw('')
  }

  const sendOtp = useCallback(async () => {
    if (!user?.employee_id) { toast.error('Employee ID not found'); return }
    setPwStep('sending')
    try {
      const res = await apiService.post('/auth/forgot-password', { employee_id: user.employee_id })
      if (res.data.success) {
        setMaskedEmail(res.data.data?.maskedEmail ?? '')
        setPwStep('otp-sent')
        setCountdown(120)
        toast.success('OTP sent to your email')
      } else {
        toast.error(res.data.message || 'Failed to send OTP')
        setPwStep('idle')
      }
    } catch {
      toast.error('Failed to send OTP')
      setPwStep('idle')
    }
  }, [user?.employee_id])

  const verifyOtp = useCallback(async () => {
    const code = otp.trim()
    if (code.length !== 6) { setOtpError('Enter all 6 digits'); return }
    setOtpError('')
    setPwStep('verifying')
    try {
      const res = await apiService.post('/auth/verify-otp', { employee_id: user?.employee_id, otp: code })
      if (res.data.success) {
        setResetToken(res.data.data?.resetToken ?? '')
        setPwStep('verified')
        toast.success('OTP verified!')
      } else {
        setOtpError(res.data.message || 'Invalid OTP')
        setPwStep('otp-sent')
      }
    } catch {
      setOtpError('Verification failed. Try again.')
      setPwStep('otp-sent')
    }
  }, [otp, user?.employee_id])

  const saveNewPassword = useCallback(async () => {
    if (newPw.length < 6)     { toast.error('Password must be ≥ 6 characters'); return }
    if (newPw !== confPw)     { toast.error('Passwords do not match'); return }
    if (!resetToken)          { toast.error('Session expired, send OTP again'); return }
    setPwStep('pw-saving')
    try {
      const res = await apiService.post('/auth/reset-password', { reset_token: resetToken, new_password: newPw })
      if (res.data.success) {
        toast.success('Password changed successfully!')
        resetPwFlow()
      } else {
        toast.error(res.data.message || 'Failed to set password')
        setPwStep('verified')
      }
    } catch {
      toast.error('Failed to change password')
      setPwStep('verified')
    }
  }, [newPw, confPw, resetToken])

  // ── Derived ───────────────────────────────────────────────────
  const fullName     = user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Unknown'
  const avatarLetter = initials(fullName)
  const displayPhoto = photoPreview || getFileUrl(user?.profile_image) || null
  const u = user as unknown as Record<string, string>

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
        <span>System Admin</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>User Profile</span>
      </div>

      {/* ── Hero Banner ── */}
      <div className="card overflow-hidden mb-6">
        <div className="h-28 w-full" style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--accent-gold) 100%)',
        }} />

        <div className="px-6 pb-5">
          <div className="flex flex-wrap items-end gap-4 -mt-12">

            {/* Avatar with camera overlay */}
            <div className="relative flex-shrink-0">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={fullName}
                  className="w-24 h-24 rounded-2xl border-4 object-cover shadow-lg"
                  style={{ borderColor: 'var(--bg-primary)' }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-2xl border-4 flex items-center justify-center text-3xl font-bold shadow-lg"
                  style={{
                    borderColor: 'var(--bg-primary)',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontFamily: 'Playfair Display, serif',
                  }}
                >
                  {avatarLetter}
                </div>
              )}

              {/* Camera button */}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                style={{ background: 'var(--accent-gold)', color: '#fff' }}
                title="Change photo"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Remove photo button — only when saved photo exists and no new preview */}
              {!photoPreview && getFileUrl(user?.profile_image) && (
                <button
                  onClick={deletePhoto}
                  disabled={photoDeleting}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 disabled:opacity-60"
                  style={{ background: '#ef4444', color: '#fff' }}
                  title="Remove photo"
                >
                  {photoDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              )}

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>

            {/* Name + badges */}
            <div className="pb-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Playfair Display, serif' }}>
                  {fullName}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  <BadgeCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
                  {user?.employee_id || '—'}
                </span>
                {user?.role_name && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium border"
                        style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)', background: 'transparent' }}>
                    <Shield className="w-3.5 h-3.5" />{user.role_name}
                  </span>
                )}
              </div>
            </div>

            <button onClick={() => dispatch(fetchProfileAsync())} title="Refresh profile"
                    className="mb-1 btn-secondary flex items-center gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Photo preview actions */}
          {photoPreview && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border"
                 style={{ borderColor: 'var(--accent-gold)', background: 'var(--bg-secondary)' }}>
              <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>New photo selected</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Click upload to save it as your profile picture</p>
              </div>
              <button onClick={uploadPhoto} disabled={photoUploading}
                      className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-60">
                {photoUploading
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                  : <><Upload className="w-3.5 h-3.5" /> Upload</>}
              </button>
              <button onClick={() => { setPhotoPreview(null); setPhotoB64(null) }}
                      className="btn-secondary flex items-center gap-1 text-xs px-2 py-1.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Account Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Account Details</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>System-managed information</p>
            <InfoRow icon={User}      label="Employee ID" value={user?.employee_id} />
            <InfoRow icon={Mail}      label="Email"       value={user?.emp_email || user?.email} />
            <InfoRow icon={Building2} label="Department"  value={user?.department_id} />
            <InfoRow icon={Briefcase} label="Designation" value={user?.designation} />
            <InfoRow icon={Globe}     label="Timezone"    value={u?.timezone || 'Asia/Kolkata'} />
            <InfoRow icon={Languages} label="Language"    value={u?.language || 'en'} />
            <InfoRow icon={Calendar}  label="Member Since" value={fmtDate(u?.start_date)} />
            <InfoRow icon={Clock}     label="Last Updated" value={fmtDate(u?.updated_at)} />
          </div>
        </div>

        {/* RIGHT: Edit form + Password */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal Information */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Edit3 className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Personal Information</h2>
            </div>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Update your name and contact details</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name" className="form-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name" className="form-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <div className="relative">
                  <input value={user?.emp_email || user?.email || ''} readOnly
                    className="form-input w-full pr-24 cursor-not-allowed" style={{ opacity: 0.65 }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    Read-only
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mobile Number</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 pointer-events-none select-none">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>+91</span>
                    <span className="text-xs" style={{ color: 'var(--border-color)' }}>|</span>
                  </span>
                  <input
                    value={mobile}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setMobile(digits)
                      setMobileErr(digits && digits.length !== 10 ? 'Enter a valid 10-digit mobile number' : '')
                    }}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    maxLength={10}
                    className="form-input w-full pl-[4.5rem]"
                    style={{ borderColor: mobileErr ? 'var(--color-danger, #ef4444)' : undefined }}
                  />
                </div>
                {mobileErr && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{mobileErr}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => { setFirstName(user?.first_name ?? ''); setLastName(user?.last_name ?? ''); setMobile((user?.mobile_number ?? '').replace(/^\+91[-\s]?/, '').replace(/\D/g, '').slice(0, 10)); setMobileErr('') }}
                      className="btn-secondary flex items-center gap-1.5 text-sm">
                <X className="w-4 h-4" /> Reset
              </button>
              <button onClick={handleSave} disabled={saving}
                      className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-60">
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>

          {/* ── Change Password — OTP flow ── */}
          <div className="card p-5">
            <button onClick={() => { setPwOpen((o) => !o); if (pwOpen) resetPwFlow() }}
                    className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Change Password</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {pwOpen ? 'OTP will be sent to your registered email' : 'Verify via email OTP before setting a new password'}
                  </p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-lg font-medium"
                    style={{
                      background: pwOpen ? 'var(--bg-tertiary)' : 'rgba(0,0,0,0.05)',
                      color: pwOpen ? 'var(--text-muted)' : 'var(--accent-gold)',
                    }}>
                {pwOpen ? 'Cancel' : 'Change'}
              </span>
            </button>

            {pwOpen && (
              <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border-color)' }}>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[
                    { n: 1, label: 'Send OTP',    done: ['otp-sent','verifying','verified','pw-saving'].includes(pwStep) },
                    { n: 2, label: 'Verify OTP',  done: ['verified','pw-saving'].includes(pwStep) },
                    { n: 3, label: 'New Password', done: false },
                  ].map((s, i) => (
                    <React.Fragment key={s.n}>
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors`}
                             style={{
                               background: s.done ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                               color: s.done ? '#fff' : 'var(--text-muted)',
                             }}>
                          {s.done ? <CheckCircle className="w-4 h-4" /> : s.n}
                        </div>
                        <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                      </div>
                      {i < 2 && <div className="w-12 h-px mt-[-16px]" style={{ background: 'var(--border-color)' }} />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Step 1: Send OTP */}
                {(pwStep === 'idle' || pwStep === 'sending') && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                         style={{ background: 'var(--bg-tertiary)' }}>
                      <Send className="w-7 h-7" style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Verify your identity</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        An OTP will be sent to your registered email address
                      </p>
                      {(user?.emp_email || user?.email) && (
                        <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-gold)' }}>
                          {user?.emp_email || user?.email}
                        </p>
                      )}
                    </div>
                    <button onClick={sendOtp} disabled={pwStep === 'sending'}
                            className="btn-primary flex items-center gap-2 mx-auto disabled:opacity-60">
                      {pwStep === 'sending'
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                        : <><Send className="w-4 h-4" /> Send OTP</>}
                    </button>
                  </div>
                )}

                {/* Step 2: Verify OTP */}
                {(pwStep === 'otp-sent' || pwStep === 'verifying') && (
                  <div className="text-center space-y-5">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enter the OTP</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        6-digit code sent to&nbsp;
                        <span style={{ color: 'var(--accent-gold)' }}>{maskedEmail || user?.emp_email}</span>
                      </p>
                    </div>

                    <OTPInput value={otp} onChange={setOtp} disabled={pwStep === 'verifying'} />

                    {otpError && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-red-500">
                        <AlertCircle className="w-3.5 h-3.5" /> {otpError}
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => { setPwStep('idle'); setOtp(''); setOtpError('') }}
                              className="btn-secondary flex items-center gap-1.5 text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button onClick={verifyOtp} disabled={pwStep === 'verifying' || otp.trim().length < 6}
                              className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-60">
                        {pwStep === 'verifying'
                          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying…</>
                          : <><ArrowRight className="w-4 h-4" /> Verify OTP</>}
                      </button>
                    </div>

                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {countdown > 0
                        ? <>Resend in <span style={{ color: 'var(--accent-gold)' }}>{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span></>
                        : <button onClick={sendOtp} className="inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--accent-gold)' }}>
                            <RotateCcw className="w-3 h-3" /> Resend OTP
                          </button>}
                    </p>
                  </div>
                )}

                {/* Step 3: New Password */}
                {(pwStep === 'verified' || pwStep === 'pw-saving') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">OTP verified. Set your new password below.</p>
                    </div>
                    {[
                      { label: 'New Password',     val: newPw,  setV: setNewPw,  show: showNew,  setShow: setShowNew  },
                      { label: 'Confirm Password', val: confPw, setV: setConfPw, show: showConf, setShow: setShowConf },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                          {f.label} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input type={f.show ? 'text' : 'password'} value={f.val}
                            onChange={(e) => f.setV(e.target.value)}
                            placeholder="••••••••" className="form-input w-full pr-10"
                            disabled={pwStep === 'pw-saving'} />
                          <button type="button" onClick={() => f.setShow((v) => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                            {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {f.label === 'New Password' && f.val.length > 0 && f.val.length < 6 && (
                          <p className="text-xs mt-1 text-red-500">Must be at least 6 characters</p>
                        )}
                        {f.label === 'Confirm Password' && f.val && f.val !== newPw && (
                          <p className="text-xs mt-1 text-red-500">Passwords do not match</p>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <button onClick={saveNewPassword} disabled={pwStep === 'pw-saving'}
                              className="btn-primary flex items-center gap-1.5 disabled:opacity-60">
                        {pwStep === 'pw-saving'
                          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                          : <><KeyRound className="w-4 h-4" /> Set New Password</>}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default UserProfilePage
