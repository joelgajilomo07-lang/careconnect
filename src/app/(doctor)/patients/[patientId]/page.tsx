import { requireRole } from '@/lib/auth/roleGuard'
import { usersService } from '@/services/usersService'
import { careTeamsService, type CareTeamMemberWithUser } from '@/services/careTeamsService'
import { vitalsLogsService, type VitalsLogWithCaregiver } from '@/services/vitalsLogsService'
import { medicalReviewsService, type MedicalReviewWithDoctor } from '@/services/medicalReviewsService'
import { VitalsChart } from '@/components/caregiver/VitalsChart'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { format, differenceInYears } from 'date-fns'
import Link from 'next/link'
import {
  ArrowLeft,
  Activity,
  Heart,
  Droplets,
  Thermometer,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Users,
  Stethoscope,
  ShieldAlert,
} from 'lucide-react'

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  // 1. Guard route: doctor only
  await requireRole(['doctor'])

  // 2. Resolve dynamic route param (Next.js 15 Promise)
  const { patientId } = await params

  // 3. Fetch patient profile, care team, vitals logs, and medical reviews concurrently
  const [patientRes, careTeamRes, vitalsRes, reviewsRes] = await Promise.all([
    usersService.getPatientWithProfile(patientId),
    careTeamsService.getTeamForPatient(patientId),
    vitalsLogsService.getByPatient(patientId),
    medicalReviewsService.getByPatient(patientId),
  ])

  const patient = patientRes.data
  const careTeam: CareTeamMemberWithUser[] = careTeamRes.data || []
  const vitalsLogs: VitalsLogWithCaregiver[] = vitalsRes.data || []
  const reviews: MedicalReviewWithDoctor[] = reviewsRes.data || []

  // If patient not found or access denied by RLS
  if (patientRes.error || !patient) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Patient Chart Inaccessible</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {patientRes.error ||
            'The requested patient record could not be loaded. You may only view patient charts for patients on your active care team.'}
        </p>
        <div className="pt-2">
          <Link
            href="/triage"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Triage Queue
          </Link>
        </div>
      </div>
    )
  }

  const profile = patient.patient_profile
  const currentStatus = profile?.current_status || 'unassessed'
  const age = profile?.date_of_birth
    ? differenceInYears(new Date(), new Date(profile.date_of_birth))
    : null

  // Map care team members by role
  const doctors = careTeam.filter((m) => m.member_role === 'doctor')
  const caregivers = careTeam.filter((m) => m.member_role === 'caregiver')
  const family = careTeam.filter((m) => m.member_role === 'family_member')

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/triage"
          className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-medium text-gray-600 hover:text-purple-700 hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Triage Queue
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Active Care Team Member</span>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                {patient.full_name?.charAt(0) || 'P'}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  {patient.full_name}
                </h1>
                <p className="text-xs text-gray-500">
                  Patient ID: <span className="font-mono text-gray-600">{patient.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="flex flex-col sm:items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Official Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                  currentStatus === 'critical'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : currentStatus === 'warning'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : currentStatus === 'stable'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {currentStatus === 'critical' && <ShieldAlert className="h-3.5 w-3.5" />}
                {currentStatus === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
                {currentStatus === 'stable' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {currentStatus}
              </span>
            </div>
            {profile?.status_updated_at && (
              <p className="text-[11px] text-gray-400">
                Last updated {format(new Date(profile.status_updated_at), 'MMM dd, HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* Clinical Info & Demographics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Primary Condition</span>
            <span className="font-semibold text-gray-800 text-sm">
              {profile?.primary_condition || 'General Care'}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Age / Sex</span>
            <span className="font-semibold text-gray-800 text-sm">
              {age !== null ? `${age} yrs` : '—'} · {profile?.sex || 'Unspecified'}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Date of Birth</span>
            <span className="font-semibold text-gray-800 text-sm">
              {profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'MMM dd, yyyy') : '—'}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Assigned Care Team</span>
            <span className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-600" />
              {careTeam.length} Member{careTeam.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Care Team Roster Summary */}
        <div className="rounded-xl bg-gray-50 p-3.5 text-xs text-gray-600 flex flex-wrap items-center gap-x-6 gap-y-2 border border-gray-200">
          <div>
            <strong className="text-gray-900">Physicians:</strong>{' '}
            {doctors.length > 0
              ? doctors.map((d) => d.member?.full_name).filter(Boolean).join(', ')
              : 'None'}
          </div>
          <div>
            <strong className="text-gray-900">Caregivers:</strong>{' '}
            {caregivers.length > 0
              ? caregivers.map((c) => c.member?.full_name).filter(Boolean).join(', ')
              : 'None'}
          </div>
          <div>
            <strong className="text-gray-900">Family Contacts:</strong>{' '}
            {family.length > 0
              ? family.map((f) => f.member?.full_name).filter(Boolean).join(', ')
              : 'None'}
          </div>
        </div>
      </div>

      {/* Vitals Trends Chart */}
      {vitalsLogs.length > 0 ? (
        <VitalsChart logs={vitalsLogs} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No Vitals Logs Recorded Yet</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Bedside vitals logged for this patient will plot trend lines here automatically.
          </p>
        </div>
      )}

      {/* Vitals Log History Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Recorded Vitals History
            </h2>
            <p className="text-xs text-gray-500">
              Complete chronological audit of measurements recorded for this patient
            </p>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {vitalsLogs.length} Total Log{vitalsLogs.length === 1 ? '' : 's'}
          </span>
        </div>

        {vitalsLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No vitals recorded.</p>
        ) : (
          <>
            {/* Mobile Card View (< sm) */}
            <div className="block sm:hidden space-y-3">
              {vitalsLogs.map((log) => {
                const evalResult = checkVitalsRanges(log)
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-semibold text-gray-900">
                        {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
                      </span>
                      {evalResult.isFlagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="h-3 w-3" />
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Typical
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white p-2 border border-gray-100">
                        <span className="text-gray-500">BP:</span>{' '}
                        <span className="font-bold text-gray-900">
                          {log.bp_systolic && log.bp_diastolic
                            ? `${log.bp_systolic}/${log.bp_diastolic} mmHg`
                            : '—'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-gray-100">
                        <span className="text-gray-500">Heart Rate:</span>{' '}
                        <span className="font-bold text-gray-900">
                          {log.heart_rate ? `${log.heart_rate} bpm` : '—'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-gray-100">
                        <span className="text-gray-500">SpO2:</span>{' '}
                        <span className="font-bold text-gray-900">
                          {log.spo2 ? `${log.spo2}%` : '—'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-gray-100">
                        <span className="text-gray-500">Temp:</span>{' '}
                        <span className="font-bold text-gray-900">
                          {log.temperature_c ? `${log.temperature_c}°C` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-500">
                      <span>Logged by: <strong className="text-gray-700">{log.caregiver?.full_name || 'Caregiver'}</strong></span>
                      <Link
                        href={`/review/${log.id}`}
                        className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 active:bg-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-colors duration-150 shadow-sm"
                      >
                        <Stethoscope className="h-3.5 w-3.5" />
                        <span>Review</span>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop / Tablet Table View (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">BP (mmHg)</th>
                    <th className="py-2.5 px-3">HR (bpm)</th>
                    <th className="py-2.5 px-3">SpO2 (%)</th>
                    <th className="py-2.5 px-3">Temp (°C)</th>
                    <th className="py-2.5 px-3">Range Heuristic</th>
                    <th className="py-2.5 px-3">Logged By</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vitalsLogs.map((log) => {
                    const evalResult = checkVitalsRanges(log)
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/70 transition-colors duration-150">
                        <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                          {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {log.bp_systolic && log.bp_diastolic
                            ? `${log.bp_systolic}/${log.bp_diastolic}`
                            : '—'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">{log.heart_rate ?? '—'}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{log.spo2 ? `${log.spo2}%` : '—'}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {log.temperature_c ? `${log.temperature_c}°C` : '—'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {evalResult.isFlagged ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="h-3 w-3" />
                              Flagged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Typical
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-700 whitespace-nowrap">
                          {log.caregiver?.full_name || 'Caregiver'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Link
                            href={`/review/${log.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 transition-colors duration-150"
                          >
                            <Stethoscope className="h-3.5 w-3.5" />
                            Review
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Past Medical Reviews Audit Timeline */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Medical Review Audit History
          </h2>
          <p className="text-xs text-gray-500">
            Chronological audit of clinical evaluations and treatment notes by attending physicians
          </p>
        </div>

        {reviews.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No physician reviews recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      {rev.doctor?.full_name || 'Attending Doctor'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize border ${
                        rev.new_status === 'critical'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : rev.new_status === 'warning'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {rev.new_status}
                    </span>
                    {rev.is_urgent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                        URGENT
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400">
                    {format(new Date(rev.reviewed_at), 'MMM dd, yyyy · HH:mm')}
                  </span>
                </div>

                {rev.feedback_notes && (
                  <p className="text-gray-700 bg-white rounded-lg p-3 border border-gray-200 leading-relaxed italic">
                    &quot;{rev.feedback_notes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}