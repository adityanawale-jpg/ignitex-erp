import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Loader2, User, Lock, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { loginAsync, clearError } from '@/redux/slices/authSlice';
import toast from 'react-hot-toast';

/* ── palette ──────────────────────────────────────── */
const C = {
  maroon:     '#7B2215',
  maroonDark: '#8D2818',
  gold:       '#C9A84C',
  goldLight:  '#E2C47A',
  cream:      '#FAF7F2',
  dark:       '#1A0F0A',
  muted:      '#8A7A6E',
  border:     '#E8E0D6',
} as const;

/* ── schema ───────────────────────────────────────── */
const loginSchema = yup.object({
  username:   yup.string().required('Username is required').min(3, 'Minimum 3 characters'),
  password:   yup.string().required('Password is required').min(6, 'Minimum 6 characters'),
  rememberMe: yup.boolean(),
});
type LoginFormData = yup.InferType<typeof loginSchema>;

/* ── component ────────────────────────────────────── */
const LoginPage: React.FC = () => {
  const navigate  = useNavigate();
  const dispatch  = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((s) => s.auth);
  const showDemoCredentials = useAppSelector((s) => s.appConfig.showDemoCredentials);

  const [showPassword, setShowPassword] = useState(false);
  const [loginError,   setLoginError]   = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      username:   localStorage.getItem('erp_remember_user') || '',
      rememberMe: !!localStorage.getItem('erp_remember_user'),
    },
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) { setLoginError(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    if (data.rememberMe) localStorage.setItem('erp_remember_user', data.username);
    else                  localStorage.removeItem('erp_remember_user');

    const result = await dispatch(loginAsync({ username: data.username, password: data.password }));
    if (loginAsync.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    }
  };

  return (
    <div
      className="lp-page"
      style={{
        fontFamily: "'Montserrat', sans-serif",
        background: C.cream,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* diagonal gold lattice */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          repeating-linear-gradient(45deg,  transparent, transparent 60px, rgba(201,168,76,0.04) 60px, rgba(201,168,76,0.04) 61px),
          repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(201,168,76,0.04) 60px, rgba(201,168,76,0.04) 61px)
        `,
      }} />

      {/* inset gold page border */}
      <div style={{
        position: 'fixed', inset: 20,
        border: `1px solid rgba(201,168,76,0.35)`,
        borderRadius: 16,
        pointerEvents: 'none', zIndex: 0,
        animation: 'lp-border-fade 1.5s ease forwards',
        opacity: 0,
      }} />

      {/* ── card ────────────────────────────────────── */}
      <div
        className="lp-wrapper"
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex',
          width: 900,
          maxWidth: 'calc(100vw - 56px)',
          minHeight: 560,
          boxShadow: '0 30px 80px rgba(26,15,10,0.18), 0 8px 24px rgba(26,15,10,0.1)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* ══════════════════════════════════════════════
            BRAND PANEL (left)
        ══════════════════════════════════════════════ */}
        <div
          style={{
            width: '42%',
            flexShrink: 0,
            background: C.maroon,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '52px 36px',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="hidden sm:flex"
        >
          {/* decorative circles */}
          <div style={{
            position: 'absolute', top: -60, left: -60,
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(201,168,76,0.08)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -80, right: -80,
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />

          {/* logo box */}
          <div style={{
            background: 'white',
            borderRadius: 2,
            padding: '16px 20px',
            width: 210,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            zIndex: 1,
          }}>
            <img
              src="/logo.jpg"
              alt="Royal Rise"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* gold vertical line */}
          <GoldLine />

          {/* tagline */}
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: C.goldLight,
            fontSize: 12,
            letterSpacing: 5,
            textTransform: 'uppercase',
            textAlign: 'center',
            zIndex: 1,
            fontWeight: 500,
          }}>
            Crafted With Precision
          </div>

          {/* description */}
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 1.8,
            zIndex: 1,
            maxWidth: 200,
            fontStyle: 'italic',
            marginTop: 10,
          }}>
            Excellence in every link, since decades of trusted craftsmanship
          </div>

          {/* gold vertical line */}
          <GoldLine />

          {/* bottom ornament — ✦ — */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            zIndex: 1, marginTop: 4,
          }}>
            <div style={{ width: 24, height: 1, background: `linear-gradient(to right, transparent, ${C.gold})`, opacity: 0.6 }} />
            <span style={{ color: C.gold, fontSize: 14, opacity: 0.75 }}>✦</span>
            <div style={{ width: 24, height: 1, background: `linear-gradient(to left, transparent, ${C.gold})`, opacity: 0.6 }} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            LOGIN PANEL (right)
        ══════════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '36px 48px',
          position: 'relative',
          minWidth: 0,
          overflow: 'hidden',
        }}>
          {/* left gold accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: 3, height: '100%',
            background: `linear-gradient(to bottom, transparent, ${C.gold}, transparent)`,
            opacity: 0.4,
          }} />

          {/* mobile logo (hidden on sm+) */}
          <div className="flex sm:hidden items-center justify-center mb-8">
            <img src="/logo.jpg" alt="Royal Rise" style={{ width: 160, height: 'auto' }} />
          </div>

          {/* heading */}
          <div className="lp-heading" style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32, fontWeight: 600,
            color: C.dark, letterSpacing: 0.5, marginBottom: 4,
          }}>Welcome Back</div>

          {/* sub */}
          <div className="lp-sub" style={{
            fontSize: 11, color: C.muted,
            letterSpacing: 3, textTransform: 'uppercase',
            marginBottom: 26, fontWeight: 400,
          }}>Sign in to your account</div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* username */}
            <div className="lp-field-1" style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Employee ID / Username</label>
              <div style={{ position: 'relative' }}>
                <User style={iconStyle} />
                <input
                  {...register('username')}
                  type="text"
                  placeholder="e.g. EMP001"
                  autoComplete="username"
                  style={inputStyle}
                  onFocus={e => applyFocus(e.currentTarget)}
                  onBlur={e  => removeFocus(e.currentTarget)}
                />
              </div>
              {errors.username && <p style={fieldErrStyle}>{errors.username.message}</p>}
            </div>

            {/* password */}
            <div className="lp-field-2" style={{ marginBottom: 0 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={iconStyle} />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => applyFocus(e.currentTarget)}
                  onBlur={e  => removeFocus(e.currentTarget)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: C.muted, display: 'flex', alignItems: 'center', padding: 2,
                  }}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              {errors.password && <p style={fieldErrStyle}>{errors.password.message}</p>}
            </div>

            {/* remember + forgot */}
            <div className="lp-footer-row" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 12, marginBottom: 20,
            }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                fontSize: 12, color: C.muted, letterSpacing: 0.5, fontWeight: 400,
              }}>
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  style={{ width: 15, height: 15, accentColor: C.maroon, cursor: 'pointer' }}
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                style={{ fontSize: 11, color: C.maroon, textDecoration: 'none', letterSpacing: 0.5 }}
              >
                Forgot password?
              </Link>
            </div>

            {/* inline error */}
            {loginError && (
              <div className="lp-error-box" style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 14px', marginBottom: 18, borderRadius: 1,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#dc2626', fontSize: 13,
              }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
                <span>{loginError}</span>
              </div>
            )}

            {/* submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="lp-btn"
              style={{
                width: '100%', padding: '15px 0',
                background: isLoading ? '#a83320' : C.maroon,
                color: 'white', border: 'none',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 11, letterSpacing: 3,
                textTransform: 'uppercase', fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                borderRadius: 1,
                opacity: isLoading ? 0.75 : 1,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                transition: 'background 0.3s',
              }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = C.maroonDark; }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = C.maroon; }}
            >
              {isLoading
                ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Signing in...</>
                : 'Sign In'}
            </button>
          </form>

          {showDemoCredentials && (
            <>
              {/* divider */}
              <div className="lp-divider" style={{
                display: 'flex', alignItems: 'center', gap: 14, marginTop: 16,
              }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, letterSpacing: 2, color: '#C8BDB5', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Demo Credentials
                </span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              {/* demo credentials */}
              <div className="lp-footer-note" style={{ marginTop: 8 }}>
                {[
                  { user: 'EMP001', pass: 'Admin@123', role: 'Administrator' },
                  { user: 'EMP002', pass: 'Admin@123', role: 'Manager' },
                ].map((cred) => (
                  <button
                    key={cred.user}
                    type="button"
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '5px 8px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12, color: C.muted, letterSpacing: 0.3,
                    }}
                    onClick={() => { setValue('username', cred.user); setValue('password', cred.pass); }}
                  >
                    <span style={{ color: C.maroon, fontWeight: 600 }}>{cred.user}</span>
                    {' · '}{cred.role}{' · '}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{cred.pass}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 10, letterSpacing: 0.3 }}>
            © 2026 Royal Rise · Enterprise Resource Planning
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── helpers ──────────────────────────────────────── */
const GoldLine: React.FC = () => (
  <div style={{
    width: 2, height: 36,
    background: `linear-gradient(to bottom, transparent, #C9A84C, transparent)`,
    margin: '18px 0', opacity: 0.7, zIndex: 1,
  }} />
);

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10, letterSpacing: 2.5,
  textTransform: 'uppercase',
  color: '#8A7A6E',
  marginBottom: 9, fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px 12px 42px',
  border: '1px solid #E8E0D6',
  borderRadius: 1,
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 13, color: '#1A0F0A',
  background: '#FAF7F2',
  outline: 'none',
  letterSpacing: 0.3,
  transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
  boxSizing: 'border-box',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
  color: '#8A7A6E', width: 16, height: 16, pointerEvents: 'none',
};

const fieldErrStyle: React.CSSProperties = {
  marginTop: 4, fontSize: 11, color: '#dc2626',
};

function applyFocus(el: HTMLInputElement) {
  el.style.borderColor = '#C9A84C';
  el.style.background   = 'white';
  el.style.boxShadow    = '0 0 0 3px rgba(201,168,76,0.1)';
}
function removeFocus(el: HTMLInputElement) {
  el.style.borderColor = '#E8E0D6';
  el.style.background   = '#FAF7F2';
  el.style.boxShadow    = 'none';
}

export default LoginPage;
