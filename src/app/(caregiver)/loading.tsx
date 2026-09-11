import { Loader2, HeartPulse } from 'lucide-react'

export default function CaregiverLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
          <HeartPulse className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded-md" />
          <div className="h-3 w-64 bg-gray-100 rounded-md" />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-16 bg-gray-50 rounded-xl" />
          <div className="h-16 bg-gray-50 rounded-xl" />
        </div>
        <div className="h-40 bg-gray-50 rounded-xl" />
      </div>
    </div>
  )
}
