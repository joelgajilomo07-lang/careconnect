'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, Stethoscope } from 'lucide-react'
import Link from 'next/link'

export default function DoctorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Doctor Clinical Portal Error:', error)
  }, [error])

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Clinical Review Error</h1>
      <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
        An error occurred while loading patient records or submitting clinical evaluations. RLS constraints and patient consistency checks remain active.
      </p>
      {error.message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 text-left font-mono">
          {error.message}
        </div>
      )}
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
        >
          <RotateCcw className="h-4 w-4" />
          Retry
        </button>
        <Link
          href="/triage"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          <Stethoscope className="h-4 w-4" />
          Triage Queue
        </Link>
      </div>
    </div>
  )
}
