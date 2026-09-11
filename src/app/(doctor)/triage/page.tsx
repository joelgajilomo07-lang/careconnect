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
          <div className="rounded-xl bg-purple-100 p-2.5 text-purple-700">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Clinical Triage Queue
            </h1>
            <p className="text-xs text-gray-500">
              Reviewing incoming vitals logs for patients on your active care teams
            </p>
          </div>
        </div>

        {/* Security / Role Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2 border border-gray-200 text-xs text-gray-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>RLS Enforced: Active Care Teams Only</span>
        </div>
      </div>

      {/* Error state if query failed */}
      {queueError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to load triage queue</p>
            <p className="text-xs mt-0.5">{queueError}</p>
          </div>
        </div>
      )}

      {/* Triage Queue List with Tabs */}
      <TriageQueueList items={queueItems || []} />
    </div>
  )
}