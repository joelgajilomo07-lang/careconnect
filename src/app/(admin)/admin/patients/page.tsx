import { requireRole } from '@/lib/auth/roleGuard'
import { getPatientManagementDataAction } from '@/app/actions/patientManagement'
import { PatientsManagementClient } from './PatientsManagementClient'

export const metadata = {
  title: 'Patient Management & Care Assignment | CareConnect Admin',
  description: 'Tender Touch Home Care Services – Patient Demographics, Clinical Records, and Multidisciplinary Care Teams (Figure 12)',
}

export default async function AdminPatientsPage() {
  await requireRole(['admin'])

  const res = await getPatientManagementDataAction()

  if (res.error || !res.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-bold">Failed to load patient management data</h2>
        <p className="text-sm mt-1">{res.error || 'Unknown error'}</p>
      </div>
    )
  }

  return <PatientsManagementClient initialData={res.data} />
}
