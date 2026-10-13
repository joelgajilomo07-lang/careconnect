import { requireRole } from '@/lib/auth/roleGuard'
import { getCaregiverDashboardDataAction } from '@/app/actions/caregiverDashboard'
import { CaregiverDashboardClient } from './CaregiverDashboardClient'

export const metadata = {
  title: 'Caregiver Dashboard | CareConnect',
  description: 'Tender Touch Home Care Services – Bedside Caregiver Portal & Monitoring (Figure 14)',
}

export default async function CaregiverDashboardPage() {
  await requireRole(['caregiver'])

  const res = await getCaregiverDashboardDataAction()

  if (res.error || !res.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-bold">Failed to load caregiver dashboard</h2>
        <p className="text-sm mt-1">{res.error || 'Unknown error'}</p>
      </div>
    )
  }

  return <CaregiverDashboardClient initialData={res.data} />
}
