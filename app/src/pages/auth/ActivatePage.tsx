import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Gem } from 'lucide-react'
import apiService from '@/api/apiService'

/* ── palette (matches LoginPage) ─────────────────────── */
const C = {
  maroon:  '#7B2215',
  gold:    '#C9A84C',
  cream:   '#FAF7F2',
  dark:    '#1A0F0A',
  muted:   '#8A7A6E',
  border:  '#E8E0D6',
} as const

type State = 'loading' | 'success' | 'error'

const ActivatePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [state,     setState]     = useState<State>('loading')
  const [message,   setMessage]   = useState('')
  const [employeeId, setEmployeeId] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('No activation token found in the link. Please check your email and try again.')
      return
    }

    apiService.post('/auth/activate', { token })
      .then((res: { data?: { message?: string; data?: { employee_id?: string } } }) => {
        setState('success')
        setMessage(res.data?.message || 'Account activated successfully.')
        setEmployeeId(res.data?.data?.employee_id || '')
      })
      .catch((err: unknown) => {
        setState('error')
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message || 'Activation failed. The link may be invalid or expired.'
        setMessage(msg)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: C.cream }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl p-8"
        style={{ background: '#fff', border: `1px solid ${C.border}` }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: C.dark }}
          >
            <Gem className="w-6 h-6" style={{ color: C.gold }} />
          </div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Playfair Display, serif', color: C.dark }}
          >
            Account Activation
          </h1>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Royal Chain ERP</p>
        </div>

        {/* State display */}
        <div className="flex flex-col items-center gap-4 py-4">
          {state === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.gold }} />
              <p className="text-sm text-center" style={{ color: C.muted }}>
                Verifying your activation link…
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle className="w-14 h-14" style={{ color: '#16a34a' }} />
              <div className="text-center">
                <p className="text-base font-semibold mb-1" style={{ color: C.dark }}>
                  {message}
                </p>
                {employeeId && (
                  <p className="text-sm" style={{ color: C.muted }}>
                    Your Employee ID: <strong>{employeeId}</strong>
                  </p>
                )}
              </div>
              <Link
                to="/login"
                className="mt-2 w-full text-center px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: C.maroon, color: '#fff' }}
              >
                Go to Login
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="w-14 h-14" style={{ color: '#dc2626' }} />
              <div className="text-center">
                <p className="text-base font-semibold mb-1" style={{ color: C.dark }}>
                  Activation Failed
                </p>
                <p className="text-sm" style={{ color: C.muted }}>{message}</p>
              </div>
              <Link
                to="/login"
                className="mt-2 w-full text-center px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: C.maroon, color: '#fff' }}
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivatePage
