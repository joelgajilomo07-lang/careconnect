import { requireRole } from '@/lib/auth/roleGuard'
import { vitalsLogsService } from '@/services/vitalsLogsService'
import { TriageQueueList } from '@/components/doctor'
import { Stethoscope, AlertCircle, ShieldCheck } from 'lucide-react'

export default async function DoctorTriagePage() {
  // 1. Guard route: doctor only
  const { user } = await requireRole(['doctor'])

  // 2. Fetch triage queue across all patients on this doctor's active care teams
  const { data: queueItems, error: queueError } = await vitalsLogsService.getTriageQueueForDoctor()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EEF0FF] p-2.5 text-[#5B5FE8]">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight">
              Clinical Triage Queue
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Reviewing incoming vitals logs for patients on your active care teams
            </p>
          </div>
        </div>

        {/* Security / Role Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-600 shadow-xs">
          <ShieldCheck className="h-4 w-4 text-[#2DD4BF]" />
          <span>RLS Enforced: Active Care Teams Only</span>
        </div>
      </div>

      {/* Error state if query failed */}
      {queueError && (
        <div className="rounded-2xl border border-[#F25F5C]/30 bg-[#FFF1F2] p-4 sm:p-5 text-sm text-rose-950 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#F25F5C] shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-base text-rose-950">Unable to load triage queue</p>
            <p className="text-xs sm:text-sm text-rose-800 mt-0.5 font-medium">{queueError}</p>
          </div>
        </div>
      )}

      {/* Triage Queue List with Tabs */}
      <TriageQueueList items={queueItems || []} />
    </div>
  )
}