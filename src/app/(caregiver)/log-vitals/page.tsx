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
    <div className="min-h-screen bg-[#F5F8FA] py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl pb-24 sm:pb-12">
        {/* Mobile-first Minimalist Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="rounded-2xl bg-[#EAF4F1] p-3 text-[#5D817C] border border-[#8EBAAB]/40 shadow-xs">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#223852] tracking-tight">Log Patient Vitals</h1>
              <p className="text-sm font-semibold text-[#5D817C] mt-0.5">Record daily clinical observations & bedside vitals</p>
            </div>
          </div>
        </div>

        {patientsError && (
          <div className="mb-6 rounded-2xl border border-[#D9776A] bg-[#FCEFEB] p-4 text-sm text-[#8E281B]">
            <p className="font-semibold">Unable to load assigned patients</p>
            <p className="text-xs mt-1">{patientsError}</p>
          </div>
        )}

        {/* Vitals Form with Patient Selector */}
        <LogVitalsForm
          patients={assignedPatients || []}
          defaultPatientId={preselectedPatientId}
          currentCaregiver={{
            id: user.id,
            fullName: user.user_metadata?.full_name || 'Bedside Caregiver',
            staffId: `STF-${user.id.slice(0, 8).toUpperCase()}`,
          }}
        />
      </div>
    </div>
  )
}