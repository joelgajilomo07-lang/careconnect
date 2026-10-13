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
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F25F5C]/10 text-[#F25F5C]">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-[#1E2243]">Clinical Review Error</h1>
      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        An error occurred while loading patient records or submitting clinical evaluations. RLS constraints and patient consistency checks remain active.
      </p>
      {error.message && (
        <div className="rounded-xl border border-[#F25F5C]/30 bg-[#F25F5C]/10 p-3 text-xs text-[#B91C1C] text-left font-mono">
          {error.message}
        </div>
      )}
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B5FE8] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#4F53D0] transition"
        >
          <RotateCcw className="h-4 w-4" />
          Retry
        </button>
        <Link
          href="/triage"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Stethoscope className="h-4 w-4 text-[#5B5FE8]" />
          Triage Queue
        </Link>
      </div>
    </div>
  )
}
