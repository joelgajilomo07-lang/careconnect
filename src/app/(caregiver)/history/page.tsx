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
        <div className="rounded-2xl border border-[#F5A524]/30 bg-[#FFFBEB] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[#F5A524]" />
          <h3 className="mt-3 text-xl font-black text-amber-950">No Assigned Patients</h3>
          <p className="mt-1 text-base text-amber-800 max-w-md mx-auto font-medium">
            You are not currently assigned to any active patient care teams. Please contact an administrator to assign you to a patient before viewing history.
          </p>
        </div>
      </div>
    )
  }

  // 3. Resolve selected patient ID
  if (params?.patientId && !assignedPatients.some(p => p.patientId === params.patientId)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">403 - Access Forbidden</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          You are not authorized to view this patient record. Caregivers may only view assigned patient records.
        </p>
      </div>
    )
  }

  const selectedPatientId = params?.patientId || assignedPatients[0].patientId
  const selectedPatient = assignedPatients.find(p => p.patientId === selectedPatientId) || assignedPatients[0]

  // 4. Fetch historical vitals logs for selected patient
  const { data: logs, error: logsError } = await vitalsLogsService.getByPatient(selectedPatient.patientId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#EEF0FF] p-3 text-[#5B5FE8] border border-[#5B5FE8]/20 shadow-xs">
            <History className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight">
              Vitals History & Trends
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Viewing historical clinical measurements for your assigned patients
            </p>
          </div>
        </div>

        {/* Quick link to log new vitals */}
        <Link
          href={`/log-vitals?patientId=${selectedPatient.patientId}`}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B5FE8] px-5 py-3 text-sm sm:text-base font-bold text-white shadow-sm shadow-[#5B5FE8]/25 hover:bg-[#4A4ED4] active:bg-[#3D41BD] transition-all cursor-pointer self-start sm:self-auto"
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
        <div className="rounded-2xl border border-[#F25F5C]/30 bg-[#FFF1F2] p-4 text-base text-rose-950 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#F25F5C] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Unable to load vitals records</p>
            <p className="text-sm text-rose-800 mt-0.5">{logsError}</p>
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