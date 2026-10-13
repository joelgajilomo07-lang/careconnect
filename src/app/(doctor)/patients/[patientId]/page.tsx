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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1F2] text-[#F25F5C] border border-[#F25F5C]/30">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">Patient Chart Inaccessible</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {patientRes.error ||
            'The requested patient record could not be loaded. You may only view patient charts for patients on your active care team.'}
        </p>
        <div className="pt-2">
          <Link
            href="/triage"
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B5FE8] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#5B5FE8]/25 hover:bg-[#4A4ED4] transition-all"
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
          className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 text-sm sm:text-base font-bold text-slate-600 hover:text-[#5B5FE8] hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Triage Queue
        </Link>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#0F766E] bg-[#2DD4BF]/10 px-3.5 py-1.5 rounded-full border border-[#2DD4BF]/30 font-bold">
          <ShieldCheck className="h-4 w-4 text-[#2DD4BF]" />
          <span>Active Care Team Member</span>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-[#EEF0FF] text-[#5B5FE8] flex items-center justify-center font-bold text-lg">
                {patient.full_name?.charAt(0) || 'P'}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight">
                  {patient.full_name}
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-0.5">
                  Patient ID: <span className="font-mono text-slate-600 font-semibold">{patient.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="flex flex-col sm:items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">Official Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold capitalize border ${
                  currentStatus === 'critical'
                    ? 'bg-[#F25F5C]/10 text-[#B91C1C] border-[#F25F5C]/30'
                    : currentStatus === 'warning'
                    ? 'bg-[#F5A524]/10 text-[#B45309] border-[#F5A524]/30'
                    : currentStatus === 'stable'
                    ? 'bg-[#2DD4BF]/10 text-[#0F766E] border-[#2DD4BF]/30'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {currentStatus === 'critical' && <ShieldAlert className="h-4 w-4" />}
                {currentStatus === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {currentStatus === 'stable' && <CheckCircle2 className="h-4 w-4" />}
                {currentStatus}
              </span>
            </div>
            {profile?.status_updated_at && (
              <p className="text-xs text-slate-400 font-medium">
                Last updated {format(new Date(profile.status_updated_at), 'MMM dd, HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* Clinical Info & Demographics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 block mb-1">Primary Condition</span>
            <span className="font-black text-[#1E2243] text-base sm:text-lg">
              {profile?.primary_condition || 'General Care'}
            </span>
          </div>

          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 block mb-1">Age / Sex</span>
            <span className="font-black text-[#1E2243] text-base sm:text-lg">
              {age !== null ? `${age} yrs` : '—'} · {profile?.sex || 'Unspecified'}
            </span>
          </div>

          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 block mb-1">Date of Birth</span>
            <span className="font-black text-[#1E2243] text-base sm:text-lg">
              {profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'MMM dd, yyyy') : '—'}
            </span>
          </div>

          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 block mb-1">Assigned Care Team</span>
            <span className="font-black text-[#1E2243] text-base sm:text-lg flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#5B5FE8]" />
              {careTeam.length} Member{careTeam.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Care Team Roster Summary */}
        <div className="rounded-xl bg-slate-50/70 p-4 text-sm text-slate-700 flex flex-wrap items-center gap-x-6 gap-y-2 border border-slate-200/80 font-medium">
          <div>
            <strong className="text-[#1E2243] font-bold">Physicians:</strong>{' '}
            {doctors.length > 0
              ? doctors.map((d) => d.member?.full_name).filter(Boolean).join(', ')
              : 'None'}
          </div>
          <div>
            <strong className="text-[#1E2243] font-bold">Caregivers:</strong>{' '}
            {caregivers.length > 0
              ? caregivers.map((c) => c.member?.full_name).filter(Boolean).join(', ')
              : 'None'}
          </div>
          <div>
            <strong className="text-[#1E2243] font-bold">Family Contacts:</strong>{' '}
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-slate-500">
          <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-[#1E2243]">No Vitals Logs Recorded Yet</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Bedside vitals logged for this patient will plot trend lines here automatically.
          </p>
        </div>
      )}

      {/* Vitals Log History Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#5B5FE8]" />
              Recorded Vitals History
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Complete chronological audit of measurements recorded for this patient
            </p>
          </div>
          <span className="text-xs sm:text-sm text-slate-500 font-semibold">
            {vitalsLogs.length} Total Log{vitalsLogs.length === 1 ? '' : 's'}
          </span>
        </div>

        {vitalsLogs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center font-medium">No vitals recorded.</p>
        ) : (
          <>
            {/* Mobile Card View (< sm) */}
            <div className="block sm:hidden space-y-3">
              {vitalsLogs.map((log) => {
                const evalResult = checkVitalsRanges(log)
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-sm font-bold text-[#1E2243]">
                        {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
                      </span>
                      {evalResult.isFlagged ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F5A524]/10 text-[#B45309] border border-[#F5A524]/30">
                          <AlertTriangle className="h-3.5 w-3.5 text-[#F5A524]" />
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#2DD4BF]/10 text-[#0F766E] border border-[#2DD4BF]/30">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                          Typical
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-0.5">BP</span>
                        <span className="font-black text-[#1E2243] text-base">
                          {log.bp_systolic && log.bp_diastolic
                            ? `${log.bp_systolic}/${log.bp_diastolic} mmHg`
                            : '—'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Heart Rate</span>
                        <span className="font-black text-[#1E2243] text-base">
                          {log.heart_rate ? `${log.heart_rate} bpm` : '—'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-0.5">SpO2</span>
                        <span className="font-black text-[#1E2243] text-base">
                          {log.spo2 ? `${log.spo2}%` : '—'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Temp</span>
                        <span className="font-black text-[#1E2243] text-base">
                          {log.temperature_c ? `${log.temperature_c}°C` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-sm text-slate-600">
                      <span>Logged by: <strong className="text-slate-800 font-bold">{log.caregiver?.full_name || 'Caregiver'}</strong></span>
                      <Link
                        href={`/review/${log.id}`}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#5B5FE8] text-white text-sm font-bold hover:bg-[#4A4ED4] active:bg-[#3D41BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] transition-all shadow-sm shadow-[#5B5FE8]/25"
                      >
                        <Stethoscope className="h-4 w-4" />
                        <span>Review</span>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop / Tablet Table View (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Date / Time</th>
                    <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">BP (mmHg)</th>
                    <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">HR (bpm)</th>
                    <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">SpO2 (%)</th>
                    <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Temp (°C)</th>
                    <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Range Heuristic</th>
                    <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Logged By</th>
                    <th className="py-3 px-3 text-right uppercase tracking-wider text-slate-500 font-bold text-xs">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#1E2243]">
                  {vitalsLogs.map((log) => {
                    const evalResult = checkVitalsRanges(log)
                    return (
                      <tr key={log.id} className="hover:bg-[#EEF0FF]/40 transition-colors duration-150">
                        <td className="py-3.5 px-3 font-medium text-slate-600 whitespace-nowrap text-sm">
                          {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
                        </td>
                        <td className="py-3.5 px-3 font-black text-[#1E2243] whitespace-nowrap text-sm sm:text-base">
                          {log.bp_systolic && log.bp_diastolic
                            ? `${log.bp_systolic}/${log.bp_diastolic}`
                            : '—'}
                        </td>
                        <td className="py-3.5 px-3 font-black text-[#1E2243] whitespace-nowrap text-sm sm:text-base">{log.heart_rate ?? '—'}</td>
                        <td className="py-3.5 px-3 font-black text-[#1E2243] whitespace-nowrap text-sm sm:text-base">{log.spo2 ? `${log.spo2}%` : '—'}</td>
                        <td className="py-3.5 px-3 font-black text-[#1E2243] whitespace-nowrap text-sm sm:text-base">
                          {log.temperature_c ? `${log.temperature_c}°C` : '—'}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {evalResult.isFlagged ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F5A524]/10 text-[#B45309] border border-[#F5A524]/30">
                              <AlertTriangle className="h-3.5 w-3.5 text-[#F5A524]" />
                              Flagged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#2DD4BF]/10 text-[#0F766E] border border-[#2DD4BF]/30">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                              Typical
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap font-medium text-sm">
                          {log.caregiver?.full_name || 'Caregiver'}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <Link
                            href={`/review/${log.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EEF0FF] px-3 py-1.5 text-xs sm:text-sm font-bold text-[#5B5FE8] hover:bg-[#5B5FE8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] transition-colors duration-150"
                          >
                            <Stethoscope className="h-4 w-4" />
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#5B5FE8]" />
            Medical Review Audit History
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Chronological audit of clinical evaluations and treatment notes by attending physicians
          </p>
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center font-medium">No physician reviews recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 text-sm space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#1E2243] text-base">
                      {rev.doctor?.full_name || 'Attending Doctor'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                        rev.new_status === 'critical'
                          ? 'bg-[#F25F5C]/10 text-[#B91C1C] border-[#F25F5C]/30'
                          : rev.new_status === 'warning'
                          ? 'bg-[#F5A524]/10 text-[#B45309] border-[#F5A524]/30'
                          : 'bg-[#2DD4BF]/10 text-[#0F766E] border-[#2DD4BF]/30'
                      }`}
                    >
                      {rev.new_status}
                    </span>
                    {rev.is_urgent && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#F25F5C]/10 text-[#B91C1C] border border-[#F25F5C]/30">
                        URGENT
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-slate-500 font-medium">
                    {format(new Date(rev.reviewed_at), 'MMM dd, yyyy · HH:mm')}
                  </span>
                </div>

                {rev.feedback_notes && (
                  <p className="text-[#1E2243] bg-white rounded-lg p-3.5 border border-slate-200/80 leading-relaxed italic font-medium">
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