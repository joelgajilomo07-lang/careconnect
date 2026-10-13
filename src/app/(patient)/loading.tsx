import { Sparkles } from 'lucide-react'

export default function PatientLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 animate-pulse">
      <div className="border-b border-slate-200/80 pb-6 space-y-3">
        <div className="h-6 w-32 bg-[#EEF0FF] rounded-full" />
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="h-4 w-96 bg-slate-100 rounded-md" />
      </div>
      <div className="h-28 bg-slate-50/80 rounded-2xl border border-slate-200/80" />
      <div className="h-56 bg-slate-50/80 rounded-2xl border border-slate-200/80" />
      <div className="h-48 bg-slate-50/80 rounded-2xl border border-slate-200/80" />
    </div>
  )
}
