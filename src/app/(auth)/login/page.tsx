'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Activity, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryError = searchParams.get('error')

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

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    // On success, redirect to / and let app/page.tsx handle role-based routing
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-7 rounded-2xl border border-gray-200/80 bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-xl shadow-slate-900/5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20 ring-4 ring-teal-500/10">
            <Activity className="h-6 w-6" />
          </div>
          <div className="pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              CareConnect
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-teal-700">
              Caregiver reporting and patient monitoring
            </p>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 pt-0.5">
            Sign in to access your clinical portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {displayError && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs sm:text-sm text-red-800 flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{displayError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition duration-150 ease-in-out focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition duration-150 ease-in-out focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full min-h-[48px] items-center justify-center rounded-xl border border-transparent bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 hover:bg-teal-700 active:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 transition-colors duration-150 cursor-pointer"
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

        <p className="text-center text-[11px] text-gray-400 leading-relaxed pt-1">
          Access is restricted to authorized clinical personnel and invited patients or caregivers.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
