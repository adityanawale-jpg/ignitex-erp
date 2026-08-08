import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gem, User, KeyRound, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import apiService from '@/api/apiService';
import toast from 'react-hot-toast';

type Step = 'request' | 'verify' | 'reset' | 'done';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [employeeId, setEmployeeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Step 2 state
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Step 3 state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearError = () => setError(null);

  // ── Step 1: Request OTP ───────────────────────────────────────
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!employeeId.trim()) {
      setError('Employee ID is required');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.post('/auth/forgot-password', {
        employee_id: employeeId.trim().toUpperCase(),
      });
      const data = res.data as { data?: { masked_email?: string }; message?: string };
      setMaskedEmail(data.data?.masked_email || '');
      toast.success('OTP sent! Check your email.');
      setStep('verify');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.post('/auth/verify-otp', {
        employee_id: employeeId.trim().toUpperCase(),
        otp,
      });
      const data = res.data as { data?: { reset_token?: string } };
      setResetToken(data.data?.reset_token || '');
      setStep('reset');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiService.post('/auth/reset-password', {
        reset_token: resetToken,
        new_password: newPassword,
      });
      setStep('done');
      toast.success('Password reset successfully!');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Reset failed. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = { request: 1, verify: 2, reset: 3, done: 3 }[step];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#EEF3FB', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            <Gem className="w-4 h-4" style={{ color: '#1E293B' }} />
          </div>
          <div>
            <div className="font-bold text-base" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
              Royal Rise
            </div>
            <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              Enterprise ERP
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {/* Progress steps */}
          {step !== 'done' && (
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((n) => (
                <React.Fragment key={n}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                    style={{
                      background: n <= stepIndex
                        ? 'linear-gradient(135deg, #B89020, #D4AC2C)'
                        : 'var(--bg-primary)',
                      color: n <= stepIndex ? '#fff' : 'var(--text-muted)',
                      border: n <= stepIndex ? 'none' : '1px solid var(--border-color)',
                    }}
                  >
                    {n}
                  </div>
                  {n < 3 && (
                    <div
                      className="flex-1 h-[2px] rounded-full transition-all"
                      style={{
                        background: n < stepIndex
                          ? 'linear-gradient(90deg, #B89020, #D4AC2C)'
                          : 'var(--border-color)',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── Step 1: Request OTP ── */}
          {step === 'request' && (
            <>
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}
              >
                Forgot Password
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Enter your Employee ID and we'll send an OTP to your registered email.
              </p>

              <form onSubmit={handleRequestOTP} className="space-y-4" noValidate>
                <div>
                  <label className="form-label">Employee ID</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <input
                      type="text"
                      className="form-input pl-10"
                      placeholder="e.g. EMP001"
                      value={employeeId}
                      onChange={(e) => { setEmployeeId(e.target.value); clearError(); }}
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all"
                  style={primaryBtnStyle(loading)}
                >
                  {loading ? <><Loader2 className="w-4 h-4 spinner" /> Sending OTP...</> : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Verify OTP ── */}
          {step === 'verify' && (
            <>
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}
              >
                Enter OTP
              </h2>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                A 6-digit OTP has been sent to
              </p>
              {maskedEmail && (
                <p className="text-sm font-semibold mb-6" style={{ color: 'var(--accent-gold, #C4981E)' }}>
                  {maskedEmail}
                </p>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-4" noValidate>
                <div>
                  <label className="form-label">One-Time Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <KeyRound className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-input pl-10 tracking-[0.4em] text-center font-bold text-lg"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); clearError(); }}
                      autoFocus
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all"
                  style={primaryBtnStyle(loading)}
                >
                  {loading ? <><Loader2 className="w-4 h-4 spinner" /> Verifying...</> : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  className="w-full text-sm py-2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => { setOtp(''); setError(null); setStep('request'); }}
                >
                  Didn't receive OTP? Go back
                </button>
              </form>
            </>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 'reset' && (
            <>
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}
              >
                New Password
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                <div>
                  <label className="form-label">New Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <input
                      type={showNew ? 'text' : 'password'}
                      className="form-input pl-10 pr-10"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); clearError(); }}
                      autoFocus
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="form-input pl-10 pr-10"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all"
                  style={primaryBtnStyle(loading)}
                >
                  {loading ? <><Loader2 className="w-4 h-4 spinner" /> Saving...</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: '#22C55E' }} />
              <h2
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}
              >
                Password Reset!
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Your password has been changed successfully. You can now log in with your new password.
              </p>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all"
                style={primaryBtnStyle(false)}
                onClick={() => navigate('/login')}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        {/* Back to login */}
        {step !== 'done' && (
          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

const ErrorBanner = ({ message }: { message: string }) => (
  <div
    className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm"
    style={{
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.35)',
      color: '#dc2626',
    }}
  >
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span>{message}</span>
  </div>
);

const primaryBtnStyle = (isLoading: boolean): React.CSSProperties => ({
  background: isLoading
    ? 'linear-gradient(135deg, #A07C18 0%, #B88E24 100%)'
    : 'linear-gradient(135deg, #B89020 0%, #D4AC2C 50%, #B89020 100%)',
  color: '#FFFFFF',
  boxShadow: isLoading ? 'none' : '0 2px 8px rgba(184,144,32,0.4)',
  opacity: isLoading ? 0.75 : 1,
  cursor: isLoading ? 'not-allowed' : 'pointer',
});

export default ForgotPasswordPage;
