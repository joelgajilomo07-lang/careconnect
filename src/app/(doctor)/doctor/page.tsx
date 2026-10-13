import { requireRole } from '@/lib/auth/roleGuard'
import { getDoctorDashboardDataAction } from '@/app/actions/doctorDashboard'
import { DoctorDashboardClient } from './DoctorDashboardClient'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Physician Dashboard | CareConnect',
  description: 'Clinical oversight and patient status monitoring for attending physicians.',
}

export default async function DoctorDashboardPage() {
  await requireRole(['doctor'])

  const { data, error } = await getDoctorDashboardDataAction()

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1F2] text-[#F25F5C] border border-[#F25F5C]/30">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">Unable to Load Dashboard</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {error || 'An error occurred while fetching your assigned patient list.'}
        </p>
        <Link
          href="/triage"
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B5FE8] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#4A4ED4] transition-all"
        >
          Go to Triage Queue
        </Link>
      </div>
    )
  }

  return <DoctorDashboardClient initialData={data} />
}
