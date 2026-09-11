'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default function FamilyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Family Portal Error:', error)
  }, [error])

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Family Portal Temporarily Unavailable</h1>
      <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
        We encountered a problem loading your loved one&apos;s records. Please try again.
      </p>
      {error.message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 text-left font-mono">
          {error.message}
        </div>
      )}
      <div className="pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
        >
          <RotateCcw className="h-4 w-4" />
          Reload Portal
        </button>
      </div>
    </div>
  )
}
