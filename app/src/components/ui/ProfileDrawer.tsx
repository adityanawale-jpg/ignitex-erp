import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Camera, Upload, Edit3, KeyRound, Save, Phone, Mail,
  Building2, Briefcase, Calendar, Globe, Languages, BadgeCheck,
  Shield, CheckCircle, Eye, EyeOff, RefreshCw, AlertCircle,
  Send, ArrowRight, ArrowLeft, RotateCcw, User, Clock,
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/hooks'
import { updateUser as updateUserSlice, fetchProfileAsync } from '@/redux/slices/authSlice'
import { apiService, getFileUrl } from '@/api/apiService'
import toast from 'react-hot-toast'

// ── helpers ────────────────────────────────────────────────────────────────────
const initials = (name?: string) =>
  (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })

// ── OTP boxes ──────────────────────────────────────────────────────────────────
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
          type="text" inputMode="numeric" maxLength={1}
          value={d.trim()} disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="text-center text-xl font-bold rounded-xl border-2 outline-none transition-colors disabled:opacity-50"
          style={{
            width: 44, height: 52,
            borderColor: d.trim() ? 'var(--accent-gold)' : 'var(--border-color)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
          }}
        />
      ))}
    </div>
  )
}

// ── mini info row ──────────────────────────────────────────────────────────────
const InfoPair = ({ icon: Icon, label, value }: { icon: React.FC<{ className?: string; style?: React.CSSProperties }>; label: string; value?: string | null }) => (
  <div className="flex items-center gap-2.5 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-gold)' }} />
    <span className="text-[11px] w-24 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span className="text-xs font-medium truncate" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
      {value || '—'}
    </span>
  </div>
)

// ── types ──────────────────────────────────────────────────────────────────────
type PwStep = 'idle' | 'sending' | 'otp-sent' | 'verifying' | 'verified' | 'pw-saving'
type Tab = 'profile' | 'security'

// ── main component ─────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void }

const ProfileDrawer: React.FC<Props> = ({ open, onClose }) => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((s) => s.auth)

  const [tab,       setTab]       = useState<Tab>('profile')

  // photo
  const fileRef          = useRef<HTMLInputElement>(null)
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)
  const [photoB64,       setPhotoB64]       = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  // profile form
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [mobile,    setMobile]    = useState('')
  const [saving,    setSaving]    = useState(false)

  // password / OTP
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

  // sync form from Redux
  useEffect(() => {
    setFirstName(user?.first_name ?? '')
    setLastName(user?.last_name  ?? '')
    setMobile(user?.mobile_number ?? '')
  }, [user, open])

  // countdown
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((v) => v - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  // close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ── photo ──────────────────────────────────────────────────────────────────
  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Select a valid image file'); return }
    const b64 = await toBase64(file)
    setPhotoPreview(b64); setPhotoB64(b64)
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
        setPhotoPreview(null); setPhotoB64(null)
      } else toast.error(res.data.message || 'Upload failed')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed')
    } finally { setPhotoUploading(false) }
  }, [photoB64, dispatch])

  // ── save profile ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!firstName.trim()) { toast.error('First name is required'); return }
    setSaving(true)
    try {
      const res = await apiService.put('/auth/profile', {
        first_name: firstName.trim(), last_name: lastName.trim(), mobile_number: mobile.trim(),
      })
      if (res.data.success) {
        const u = res.data.data?.user
        if (u) dispatch(updateUserSlice({
          first_name: u.first_name, last_name: u.last_name, mobile_number: u.mobile_number,
          full_name: `${u.first_name} ${u.last_name ?? ''}`.trim(),
        }))
        toast.success('Profile updated')
      } else toast.error(res.data.message || 'Update failed')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }, [firstName, lastName, mobile, dispatch])

  // ── OTP flow ───────────────────────────────────────────────────────────────
  const resetPwFlow = useCallback(() => {
    setPwStep('idle'); setOtp(''); setOtpError('')
    setResetToken(''); setNewPw(''); setConfPw('')
  }, [])

  const sendOtp = useCallback(async () => {
    if (!user?.employee_id) return
    setPwStep('sending')
    try {
      const res = await apiService.post('/auth/forgot-password', { employee_id: user.employee_id })
      if (res.data.success) {
        setMaskedEmail(res.data.data?.maskedEmail ?? '')
        setPwStep('otp-sent'); setCountdown(120)
        toast.success('OTP sent to your email')
      } else { toast.error(res.data.message || 'Failed to send OTP'); setPwStep('idle') }
    } catch { toast.error('Failed to send OTP'); setPwStep('idle') }
  }, [user?.employee_id])

  const verifyOtp = useCallback(async () => {
    const code = otp.trim()
    if (code.length !== 6) { setOtpError('Enter all 6 digits'); return }
    setOtpError(''); setPwStep('verifying')
    try {
      const res = await apiService.post('/auth/verify-otp', { employee_id: user?.employee_id, otp: code })
      if (res.data.success) {
        setResetToken(res.data.data?.resetToken ?? '')
        setPwStep('verified'); toast.success('OTP verified!')
      } else { setOtpError(res.data.message || 'Invalid OTP'); setPwStep('otp-sent') }
    } catch { setOtpError('Verification failed. Try again.'); setPwStep('otp-sent') }
  }, [otp, user?.employee_id])

  const saveNewPassword = useCallback(async () => {
    if (newPw.length < 6) { toast.error('Password must be ≥ 6 characters'); return }
    if (newPw !== confPw) { toast.error('Passwords do not match'); return }
    if (!resetToken)      { toast.error('Session expired, send OTP again'); return }
    setPwStep('pw-saving')
    try {
      const res = await apiService.post('/auth/reset-password', { reset_token: resetToken, new_password: newPw })
      if (res.data.success) { toast.success('Password changed!'); resetPwFlow() }
      else { toast.error(res.data.message || 'Failed'); setPwStep('verified') }
    } catch { toast.error('Failed to change password'); setPwStep('verified') }
  }, [newPw, confPw, resetToken, resetPwFlow])

  // ── derived ────────────────────────────────────────────────────────────────
  const fullName     = user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'User'
  const avatarLetter = initials(fullName)
  const displayPhoto = photoPreview || getFileUrl(user?.profile_image) || null
  const u            = user as unknown as Record<string, string>

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(500px, 100vw)',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-4px 0 30px rgba(0,0,0,0.2)',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
             style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>My Profile</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => dispatch(fetchProfileAsync())} title="Refresh"
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose}
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          {(['profile', 'security'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'profile') resetPwFlow() }}
              className="flex-1 py-2.5 text-xs font-semibold capitalize transition-colors relative"
              style={{ color: tab === t ? 'var(--accent-gold)' : 'var(--text-muted)' }}
            >
              {t === 'profile' ? 'Profile & Info' : 'Change Password'}
              {tab === t && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ background: 'var(--accent-gold)' }} />
              )}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════ PROFILE TAB ════ */}
          {tab === 'profile' && (
            <div>
              {/* Hero */}
              <div className="relative">
                <div className="h-20" style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--accent-gold) 100%)',
                }} />

                <div className="px-5 pb-4">
                  <div className="flex items-end gap-3 -mt-8">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {displayPhoto ? (
                        <img src={displayPhoto} alt={fullName}
                             className="w-16 h-16 rounded-xl border-3 object-cover shadow-md"
                             style={{ borderColor: 'var(--bg-card)', borderWidth: 3 }} />
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shadow-md"
                             style={{
                               border: '3px solid var(--bg-card)',
                               background: 'var(--color-primary)', color: '#fff',
                               fontFamily: 'Playfair Display, serif',
                             }}>
                          {avatarLetter}
                        </div>
                      )}
                      <button onClick={() => fileRef.current?.click()}
                              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow"
                              style={{ background: 'var(--accent-gold)', color: '#fff' }}
                              title="Change photo">
                        <Camera className="w-3 h-3" />
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                    </div>

                    <div className="pb-0.5 min-w-0">
                      <p className="font-bold text-base leading-tight truncate"
                         style={{ color: 'var(--text-primary)', fontFamily: 'Playfair Display, serif' }}>
                        {fullName}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          <BadgeCheck className="w-3 h-3" style={{ color: 'var(--accent-gold)' }} />
                          {user?.employee_id}
                        </span>
                        {user?.role_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium"
                                style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
                            <Shield className="w-3 h-3" />{user.role_name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Photo upload preview */}
                  {photoPreview && (
                    <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl border"
                         style={{ borderColor: 'var(--accent-gold)', background: 'var(--bg-secondary)' }}>
                      <img src={photoPreview} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>New photo ready</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Click Upload to apply</p>
                      </div>
                      <button onClick={uploadPhoto} disabled={photoUploading}
                              className="btn-primary text-xs px-2.5 py-1 flex items-center gap-1 disabled:opacity-60">
                        {photoUploading ? <><RefreshCw className="w-3 h-3 animate-spin" /> …</> : <><Upload className="w-3 h-3" /> Upload</>}
                      </button>
                      <button onClick={() => { setPhotoPreview(null); setPhotoB64(null) }}
                              className="p-1" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 space-y-5 pb-6">
                {/* Edit form */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Edit3 className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Personal Information</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                             placeholder="First name" className="form-input w-full text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
                      <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                             placeholder="Last name" className="form-input w-full text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                      <input value={user?.emp_email || user?.email || ''} readOnly
                             className="form-input w-full text-sm cursor-not-allowed" style={{ opacity: 0.6 }} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Mobile</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        <input value={mobile} onChange={(e) => setMobile(e.target.value)}
                               placeholder="+91 98765 43210" className="form-input w-full pl-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => { setFirstName(user?.first_name ?? ''); setLastName(user?.last_name ?? ''); setMobile(user?.mobile_number ?? '') }}
                            className="btn-secondary text-xs px-3 py-1.5">Reset</button>
                    <button onClick={handleSave} disabled={saving}
                            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-60">
                      {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save</>}
                    </button>
                  </div>
                </div>

                {/* Account details */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <User className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Account Details</span>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                    <InfoPair icon={BadgeCheck} label="Employee ID"  value={user?.employee_id} />
                    <InfoPair icon={Mail}       label="Email"        value={user?.emp_email || user?.email} />
                    <InfoPair icon={Building2}  label="Department"   value={user?.department_id} />
                    <InfoPair icon={Briefcase}  label="Designation"  value={user?.designation} />
                    <InfoPair icon={Globe}      label="Timezone"     value={u?.timezone || 'Asia/Kolkata'} />
                    <InfoPair icon={Languages}  label="Language"     value={u?.language || 'en'} />
                    <InfoPair icon={Calendar}   label="Member Since" value={fmtDate(u?.start_date)} />
                    <InfoPair icon={Clock}      label="Last Updated" value={fmtDate(u?.updated_at)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ SECURITY TAB ════ */}
          {tab === 'security' && (
            <div className="px-5 py-6">
              <div className="flex items-center gap-2 mb-5">
                <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Change Password</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Verify via OTP sent to your email</p>
                </div>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-7">
                {[
                  { n: 1, label: 'Send OTP',     done: ['otp-sent','verifying','verified','pw-saving'].includes(pwStep) },
                  { n: 2, label: 'Verify OTP',   done: ['verified','pw-saving'].includes(pwStep) },
                  { n: 3, label: 'New Password', done: false },
                ].map((s, i) => (
                  <React.Fragment key={s.n}>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                           style={{
                             background: s.done ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                             color: s.done ? '#fff' : 'var(--text-muted)',
                           }}>
                        {s.done ? <CheckCircle className="w-4 h-4" /> : s.n}
                      </div>
                      <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    </div>
                    {i < 2 && <div className="w-10 h-px" style={{ background: 'var(--border-color)', marginBottom: 14 }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Step 1 */}
              {(pwStep === 'idle' || pwStep === 'sending') && (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                       style={{ background: 'var(--bg-tertiary)' }}>
                    <Send className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Verify your identity</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>OTP will be sent to your registered email</p>
                    {(user?.emp_email || user?.email) && (
                      <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--accent-gold)' }}>
                        {user?.emp_email || user?.email}
                      </p>
                    )}
                  </div>
                  <button onClick={sendOtp} disabled={pwStep === 'sending'}
                          className="btn-primary flex items-center gap-2 mx-auto disabled:opacity-60">
                    {pwStep === 'sending' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send OTP</>}
                  </button>
                </div>
              )}

              {/* Step 2 */}
              {(pwStep === 'otp-sent' || pwStep === 'verifying') && (
                <div className="text-center space-y-5">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enter the OTP</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Sent to&nbsp;<span style={{ color: 'var(--accent-gold)' }}>{maskedEmail || user?.emp_email}</span>
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
                            className="btn-secondary flex items-center gap-1 text-sm">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={verifyOtp} disabled={pwStep === 'verifying' || otp.trim().length < 6}
                            className="btn-primary flex items-center gap-1 text-sm disabled:opacity-60">
                      {pwStep === 'verifying' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying…</> : <><ArrowRight className="w-4 h-4" /> Verify</>}
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

              {/* Step 3 */}
              {(pwStep === 'verified' || pwStep === 'pw-saving') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">OTP verified. Set your new password below.</p>
                  </div>
                  {[
                    { label: 'New Password',    val: newPw,  setV: setNewPw,  show: showNew,  setShow: setShowNew  },
                    { label: 'Confirm Password',val: confPw, setV: setConfPw, show: showConf, setShow: setShowConf },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {f.label} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input type={f.show ? 'text' : 'password'} value={f.val}
                               onChange={(e) => f.setV(e.target.value)} placeholder="••••••••"
                               className="form-input w-full pr-10" disabled={pwStep === 'pw-saving'} />
                        <button type="button" onClick={() => f.setShow((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                          {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {f.label === 'New Password' && f.val.length > 0 && f.val.length < 6 && (
                        <p className="text-xs mt-1 text-red-500">Must be ≥ 6 characters</p>
                      )}
                      {f.label === 'Confirm Password' && f.val && f.val !== newPw && (
                        <p className="text-xs mt-1 text-red-500">Passwords do not match</p>
                      )}
                    </div>
                  ))}
                  <button onClick={saveNewPassword} disabled={pwStep === 'pw-saving'}
                          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                    {pwStep === 'pw-saving' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><KeyRound className="w-4 h-4" /> Set New Password</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

export default ProfileDrawer
