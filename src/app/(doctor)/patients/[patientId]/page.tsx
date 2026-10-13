import { requireRole } from '@/lib/auth/roleGuard'
import { getPatientClinicalDataAction } from '@/app/actions/doctorClinical'
import { PatientHealthStatusView } from '@/components/doctor/PatientHealthStatusView'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Patient Health Status & Clinical Trends | CareConnect',
  description: 'Continuous vital-sign monitoring, acceptable threshold bands, and treatment history.',
}

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  const { user, role } = await requireRole(['doctor', 'admin'])
  const { patientId } = await params

  const { data, error } = await getPatientClinicalDataAction(patientId, 7)

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1F2] text-[#F25F5C] border border-[#F25F5C]/30">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">Patient Chart Inaccessible</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {error || 'The requested patient record could not be loaded. You may only view patient charts for patients on your active care team.'}
        </p>
        <div className="pt-2">
          <Link
            href="/doctor"
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B5FE8] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#5B5FE8]/25 hover:bg-[#4A4ED4] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Physician Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <PatientHealthStatusView initialData={data} readOnly={false} portalRole="doctor" />
}