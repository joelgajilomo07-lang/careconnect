import { requireRole } from '@/lib/auth/roleGuard'
import { getShiftReportFormDataAction } from '@/app/actions/shiftReports'
import { ShiftReportFormClient } from './ShiftReportFormClient'

export const metadata = {
  title: 'Submit Shift Report | CareConnect Caregiver',
  description: 'Tender Touch Home Care Services – Bedside Shift Report Documentation (Figure 15)',
}

export default async function CaregiverShiftReportPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>
}) {
  await requireRole(['caregiver'])
  const { patientId } = await searchParams

  const { assignedPatients, thresholds, error } = await getShiftReportFormDataAction(patientId)

  if (error || assignedPatients.length === 0) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 max-w-xl mx-auto">
        <h2 className="text-lg font-bold">Unable to open Shift Report</h2>
        <p className="text-sm mt-1">{error || 'No patients currently assigned to your account.'}</p>
      </div>
    )
  }

  return (
    <ShiftReportFormClient
      assignedPatients={assignedPatients}
      initialThresholds={thresholds}
      defaultPatientId={patientId}
    />
  )
}
