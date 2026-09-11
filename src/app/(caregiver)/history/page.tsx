import { requireRole } from '@/lib/auth/roleGuard'
import { careTeamsService } from '@/services/careTeamsService'
import { vitalsLogsService } from '@/services/vitalsLogsService'
import { PatientSelector, VitalsChart, HistoryTable } from '@/components/caregiver'
import { History, AlertCircle, PlusCircle } from 'lucide-react'
import Link from 'next/link'

export default async function CaregiverHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ patientId?: string }>
}) {
  // 1. Guard route: caregiver only
  const { user } = await requireRole(['caregiver'])

  // 2. Fetch assigned patients
  const params = await searchParams
  const { data: patients, error: patientsError } = await careTeamsService.getPatientsForCaregiver(user.id)

  const assignedPatients = patients || []

  // If caregiver has no assigned patients
  if (assignedPatients.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-600" />
          <h3 className="mt-3 text-lg font-bold text-amber-900">No Assigned Patients</h3>
          <p className="mt-1 text-sm text-amber-700 max-w-md mx-auto">
            You are not currently assigned to any active patient care teams. Please contact an administrator to assign you to a patient before viewing history.
          </p>
        </div>
      </div>
    )
  }

  // 3. Resolve selected patient ID
  const selectedPatientId = params?.patientId || assignedPatients[0].patientId
  const selectedPatient = assignedPatients.find(p => p.patientId === selectedPatientId) || assignedPatients[0]

  // 4. Fetch historical vitals logs for selected patient
  const { data: logs, error: logsError } = await vitalsLogsService.getByPatient(selectedPatient.patientId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Vitals History & Trends
            </h1>
            <p className="text-xs text-gray-500">
              Viewing historical clinical measurements for your assigned patients
            </p>
          </div>
        </div>

        {/* Quick link to log new vitals */}
        <Link
          href={`/log-vitals?patientId=${selectedPatient.patientId}`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Log New Vitals</span>
        </Link>
      </div>

      {/* Patient Selector Switcher */}
      <PatientSelector
        patients={assignedPatients}
        currentPatientId={selectedPatient.patientId}
      />

      {/* Error handling if fetching logs failed */}
      {logsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to load vitals records</p>
            <p className="text-xs mt-0.5">{logsError}</p>
          </div>
        </div>
      )}

      {/* Vitals Trend Visualization (Recharts) */}
      <VitalsChart logs={logs || []} />

      {/* Detailed Historical Data Table / Cards */}
      <HistoryTable logs={logs || []} />
    </div>
  )
}