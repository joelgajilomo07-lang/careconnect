'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  X,
  ShieldCheck,
} from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const queryError = searchParams.get('error')
  const redirectTo = searchParams.get('redirect_to') || '/'

  // Load remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('careconnect_remembered_email')
      if (savedEmail) {
        const handle = requestAnimationFrame(() => {
          setEmail(savedEmail)
          setRememberMe(true)
        })
        return () => cancelAnimationFrame(handle)
      }
    } catch {
      // Ignore localStorage availability issues in restricted environments
    }
  }, [])

  const getDisplayError = () => {
    if (error) return error
    if (queryError === 'invalid_or_expired_link') {
      return 'Your invitation or recovery link is invalid, expired, or has already been used. Please contact your clinic administrator.'
    }
    if (queryError === 'account_not_configured') {
      return 'Your account profile has not been configured yet. Please contact an administrator.'
    }
    return null
  }

  const displayError = getDisplayError()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Handle "Remember me" preference
    try {
      if (rememberMe) {
        localStorage.setItem('careconnect_remembered_email', email.trim())
      } else {
        localStorage.removeItem('careconnect_remembered_email')
      }
    } catch {
      // Ignore localStorage write failures
    }

    try {
      const result = await loginAction({
        email: email.trim(),
        password,
      })

      if (!result.success) {
        setError(result.error || 'Invalid email or password.')
        setIsLoading(false)
        return
      }

      // Successful login -> route to role's dashboard
      router.push(result.redirectTo || redirectTo)
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during login.'
      setError(msg)
      setIsLoading(false)
    }
  }

  const handleOpenForgotPassword = () => {
    setResetEmail(email.trim())
    setResetError(null)
    setResetSuccess(null)
    setIsForgotModalOpen(true)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.')
      return
    }

    setResetError(null)
    setResetSuccess(null)
    setIsResetting(true)

    try {
      const supabase = createClient()
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/confirm?type=recovery`
          : undefined

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        {
          redirectTo: redirectUrl,
        }
      )

      if (resetErr) {
        setResetError(resetErr.message)
      } else {
        setResetSuccess(
          `Password reset instructions have been dispatched to ${resetEmail.trim()}. Please check your email inbox.`
        )
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to dispatch password reset email. Please try again.'
      setResetError(msg)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Centered Authentication Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-xl shadow-slate-900/5 transition-all">
        {/* CareConnect Logo & System Identity */}
        <div className="text-center mb-7">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20 shadow-xs mb-3.5">
            <HeartPulse className="h-7 w-7 text-[#5B5FE8]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1E2243]">
            CareConnect
          </h1>

          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600">
            Tender Touch Home Care Services
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            Caregiver Reporting & Patient Monitoring System
          </p>
        </div>

        {/* Error Notification Alert */}
        {displayError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/95 p-3.5 text-xs sm:text-sm text-red-800 flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{displayError}</span>
          </div>
        )}

        {/* Login Form Controls */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              E-mail Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#1E2243] placeholder-slate-400 transition duration-150 ease-in-out focus:border-[#5B5FE8] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20"
              />
            </div>
          </div>

          {/* Password Input with Visibility Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleOpenForgotPassword}
                className="text-xs font-semibold text-[#5B5FE8] hover:text-[#4B4FD8] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30 rounded cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-[#1E2243] placeholder-slate-400 transition duration-150 ease-in-out focus:border-[#5B5FE8] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="pt-1 flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#5B5FE8] focus:ring-[#5B5FE8] focus:ring-offset-0 transition cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="ml-2.5 block text-sm font-medium text-slate-700 select-none cursor-pointer"
            >
              Remember me
            </label>
          </div>

          {/* Log In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-3 flex w-full min-h-[46px] items-center justify-center rounded-xl border border-transparent bg-[#5B5FE8] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#5B5FE8]/20 hover:bg-[#4B4FD8] active:bg-[#3D41C8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging In...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Security Notice & Dumaguete City Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col items-center justify-center gap-1 text-slate-400 text-xs text-center">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-[#5B5FE8]" />
            <span>Authorized Clinical Access Only</span>
          </div>
          <span className="text-[11px] text-slate-400">Accounts are issued by agency administrators</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="forgot-password-title"
                    className="text-lg font-bold text-[#1E2243]"
                  >
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-500">
                    Send reset instructions to your registered email
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success State */}
            {resetSuccess ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs sm:text-sm text-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-900">
                      Reset Link Sent
                    </p>
                    <p className="leading-relaxed">{resetSuccess}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full flex items-center justify-center rounded-xl bg-[#5B5FE8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4B4FD8] transition duration-150 cursor-pointer"
                >
                  Return to Log In
                </button>
              </div>
            ) : (
              /* Reset Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Enter the email address tied to your CareConnect account. We will dispatch a secure password reset link.
                </p>

                {resetError && (
                  <div className="rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{resetError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    E-mail Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#1E2243] placeholder-slate-400 focus:border-[#5B5FE8] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !resetEmail.trim()}
                    className="flex-1 flex items-center justify-center rounded-xl bg-[#5B5FE8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4B4FD8] disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#5B5FE8]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
