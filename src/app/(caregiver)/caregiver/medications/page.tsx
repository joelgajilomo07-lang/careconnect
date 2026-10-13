import { requireRole } from '@/lib/auth/roleGuard'
import { getMedicationAdministrationDataAction } from '@/app/actions/medicationAdministration'
import { MedicationAdministrationClient } from './MedicationAdministrationClient'

export const metadata = {
  title: 'Medication Administration | CareConnect Caregiver',
  description: 'Tender Touch Home Care Services – Bedside Medication Administration Record (Figure 16)',
}

export default async function CaregiverMedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>
}) {
  await requireRole(['caregiver'])
  const { patientId } = await searchParams

  const res = await getMedicationAdministrationDataAction(patientId)

  if (res.error && res.assignedPatients.length === 0) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 max-w-xl mx-auto">
        <h2 className="text-lg font-bold">Unable to open Medication Administration</h2>
        <p className="text-sm mt-1">{res.error}</p>
      </div>
    )
  }

  return (
    <MedicationAdministrationClient
      assignedPatients={res.assignedPatients}
      initialPatientId={res.selectedPatientId}
      initialDoses={res.doses}
    />
  )
}
