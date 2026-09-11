import { requireRole } from '@/lib/auth/roleGuard'
import { careTeamsService } from '@/services/careTeamsService'
import { LogVitalsForm } from '@/components/caregiver/LogVitalsForm'
import { HeartPulse } from 'lucide-react'

export default async function LogVitalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ patientId?: string }>
}) {
  // 1. Guard route: caregiver only
  const { user } = await requireRole(['caregiver'])

  // 2. Fetch all patients actively assigned to this caregiver
  const params = await searchParams
  const preselectedPatientId = params?.patientId

  const { data: assignedPatients, error: patientsError } = await careTeamsService.getPatientsForCaregiver(user.id)

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-8 pb-24 sm:pb-12">
      {/* Mobile-first Minimalist Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Log Patient Vitals</h1>
            <p className="text-xs text-gray-500">Record daily health observations</p>
          </div>
        </div>
      </div>

      {patientsError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load assigned patients</p>
          <p className="text-xs mt-1">{patientsError}</p>
        </div>
      )}

      {/* Vitals Form with Patient Selector */}
      <LogVitalsForm
        patients={assignedPatients || []}
        defaultPatientId={preselectedPatientId}
      />
    </div>
  )
}