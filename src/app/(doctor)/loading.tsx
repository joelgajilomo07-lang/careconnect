import { Stethoscope } from 'lucide-react'

export default function DoctorLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-[#EEF0FF] flex items-center justify-center text-[#5B5FE8]">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-52 bg-slate-200 rounded-md" />
          <div className="h-3 w-72 bg-slate-100 rounded-md" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-28 bg-slate-100 rounded-xl" />
        <div className="h-10 w-28 bg-slate-100 rounded-xl" />
        <div className="h-10 w-28 bg-slate-100 rounded-xl" />
      </div>
      <div className="space-y-3">
        <div className="h-32 bg-slate-50/80 rounded-2xl border border-slate-200/80" />
        <div className="h-32 bg-slate-50/80 rounded-2xl border border-slate-200/80" />
        <div className="h-32 bg-slate-50/80 rounded-2xl border border-slate-200/80" />
      </div>
    </div>
  )
}
