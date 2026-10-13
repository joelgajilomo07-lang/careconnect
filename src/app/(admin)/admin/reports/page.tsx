import { requireRole } from '@/lib/auth/roleGuard'
import { getReportCandidatesAction } from '@/app/actions/reports'
import { ReportsClient } from './ReportsClient'

export const metadata = {
  title: 'Clinical & Compliance Reports | CareConnect Admin',
  description: 'Tender Touch Home Care Services – Patient Care Summaries, Shift Compliance, and MAR Reports (Figure 13 Task B)',
}

export default async function AdminReportsPage() {
  await requireRole(['admin'])

  const { patients, caregivers } = await getReportCandidatesAction()

  return <ReportsClient patients={patients} caregivers={caregivers} />
}
