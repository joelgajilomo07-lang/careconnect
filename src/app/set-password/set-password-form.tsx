'use client'

import { useState } from 'react'
import { setPasswordAction } from './actions'
import { Activity, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const res = await setPasswordAction({ password, confirmPassword })

      if (res.error) {
        setError(res.error)
        setIsLoading(false)
        return
      }

      setIsSuccess(true)
      // Redirect to root with full page transition so session cookies and role routing execute cleanly
      setTimeout(() => {
        window.location.href = '/'
      }, 800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(msg)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-100 p-4 sm:p-6">
      <div className="w-full max-w-md space-y-7 rounded-2xl border border-gray-200/80 bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-xl shadow-slate-900/5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20 ring-4 ring-teal-500/10">
            <Activity className="h-6 w-6" />
          </div>
          <div className="pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Set Your Password
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-teal-700">
              Caregiver reporting and patient monitoring
            </p>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pt-0.5">
            Choose a secure password to complete your account activation
          </p>
        </div>

        {/* Success Alert */}
        {isSuccess ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs sm:text-sm text-emerald-800 flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="leading-relaxed">
              Password successfully set! Redirecting to your clinical dashboard...
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Inline Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs sm:text-sm text-red-800 flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="block w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition duration-150 ease-in-out focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="block w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition duration-150 ease-in-out focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3.5 text-[11px] text-gray-600 space-y-1.5">
              <p className="font-semibold text-gray-700">Password requirements:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li className={password.length >= 8 ? 'text-emerald-600 font-medium' : ''}>
                  Minimum 8 characters in length
                </li>
                <li className={password && password === confirmPassword ? 'text-emerald-600 font-medium' : ''}>
                  Both password fields must match exactly
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full min-h-[48px] items-center justify-center rounded-xl border border-transparent bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 hover:bg-teal-700 active:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 transition-colors duration-150 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Password...
                </>
              ) : (
                'Set Password & Continue'
              )}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-gray-400 leading-relaxed pt-1">
          Access is restricted to authorized clinical personnel and invited patients or caregivers.
        </p>
      </div>
    </div>
  )
}
