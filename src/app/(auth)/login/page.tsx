'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
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
  UserPlus,
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

  // Account creation info modal state
  const [isAccountInfoOpen, setIsAccountInfoOpen] = useState(false)

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
      return 'Your invitation or recovery link is invalid, expired, or has already been used. Please contact your clinic administrator for a new invitation.'
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

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    // Redirect to requested path or root for role-based routing
    router.push(redirectTo)
    router.refresh()
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
          `Password recovery instructions have been sent to ${resetEmail.trim()}. Please check your inbox and junk folders.`
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
      {/* Main Authentication Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-xl shadow-slate-900/5 transition-all">
        {/* Healthcare Identity & Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-teal-50/70 px-3 py-1 mb-4">
            <Activity className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-semibold tracking-wide text-teal-800">
              CareConnect Clinical Portal
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            or{' '}
            <button
              type="button"
              onClick={() => setIsAccountInfoOpen(true)}
              className="font-medium text-teal-600 hover:text-teal-700 underline-offset-2 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30 rounded"
            >
              create an account
            </button>
          </p>
        </div>

        {/* Existing & Role-based Error Messages */}
        {displayError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/95 p-3.5 text-xs sm:text-sm text-red-800 flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{displayError}</span>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Email
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
                placeholder="name@gmail.com"
                className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition duration-150 ease-in-out focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
          </div>

          {/* Password Input with Visibility Toggle */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Password
            </label>
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
                className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition duration-150 ease-in-out focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
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
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0 transition cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="ml-2.5 block text-sm font-medium text-slate-700 select-none cursor-pointer"
            >
              Remember me
            </label>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-3 flex w-full min-h-[46px] items-center justify-center rounded-xl border border-transparent bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-700/20 hover:bg-teal-700 active:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Secondary Action: Forgot Password Link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleOpenForgotPassword}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30 rounded cursor-pointer"
          >
            Forgotten your password?
          </button>
        </div>

        {/* Healthcare Security Notice */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600/70" />
          <span>Encrypted HIPAA-ready clinical portal</span>
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="forgot-password-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    Reset password
                  </h2>
                  <p className="text-xs text-slate-500">
                    Recover access to your CareConnect account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
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
                      Reset link dispatched
                    </p>
                    <p className="leading-relaxed">{resetSuccess}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition duration-150 cursor-pointer"
                >
                  Return to sign in
                </button>
              </div>
            ) : (
              /* Reset Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Enter the email address tied to your clinical or patient profile. We will send you a secure link to update your password.
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
                    Email address
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
                      placeholder="name@gmail.com"
                      className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
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
                    className="flex-1 flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Clinical Account Creation Info Modal */}
      {isAccountInfoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-info-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="account-info-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    Clinical Account Access
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registration & onboarding information
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountInfoOpen(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">
                CareConnect operates as an invitation-only healthcare network.
              </p>
              <p>
                Account profiles for doctors, caregivers, patients, and family members are created and managed by authorized hospital and clinic administrators to protect patient health records.
              </p>
              <p className="pt-1 text-slate-500">
                If you have not received an activation invitation or need to be registered, please reach out to your clinic administrator or care coordination supervisor.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAccountInfoOpen(false)}
              className="w-full flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition duration-150 cursor-pointer"
            >
              Back to sign in
            </button>
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
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
