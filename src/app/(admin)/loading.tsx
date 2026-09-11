import { ShieldCheck } from 'lucide-react'

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-56 bg-gray-200 rounded-md" />
          <div className="h-3 w-72 bg-gray-100 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100" />
        <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100" />
        <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100" />
        <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100" />
      </div>
      <div className="h-64 bg-gray-50 rounded-2xl border border-gray-100" />
    </div>
  )
}
