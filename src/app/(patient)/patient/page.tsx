import { requireRole } from '@/lib/auth/roleGuard'
import { usersService } from '@/services/usersService'
import { patientsService } from '@/services/patientsService'
import { careTeamsService } from '@/services/careTeamsService'
import { vitalsLogsService } from '@/services/vitalsLogsService'
import { medicalReviewsService } from '@/services/medicalReviewsService'
import { VitalsChart } from '@/components/caregiver/VitalsChart'
import { PatientCareTeamRoster } from '@/components/patient'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { format } from 'date-fns'
import { getPatientClinicalDataAction } from '@/app/actions/doctorClinical'
import Link from 'next/link'
import {
  HeartPulse,
  Activity,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  User,
  Sparkles,
  Stethoscope,
  Info,
  MessageSquare,
  Pill,
  CheckCheck,
} from 'lucide-react'

export const metadata = {
  title: 'My Health Dashboard | CareConnect Patient Portal',
  description: 'View your health status, recent vital trends, attending doctor instructions, and care team directory.',
}

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ patientId?: string }>
}) {
  const { user } = await requireRole(['patient'])

  // Check if patient account is linked to a patient record
  const { data: patientRecord } = await patientsService.getPatientByUserId(user.id)

  if (!patientRecord) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <Info className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">Account Not Linked</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Your account is not yet linked to a patient record. Please contact the administrator.
        </p>
      </div>
    )
  }

  // ACCESS RULE: Patient can ONLY open their own record.
  // Any attempt to open another patient's ID returns 403.
  const resolvedParams = searchParams ? await searchParams : undefined
  if (resolvedParams?.patientId && resolvedParams.patientId !== patientRecord.id && resolvedParams.patientId !== user.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">403 - Access Forbidden</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          You are not authorized to view this patient record. Patients may only view their own health records.
        </p>
      </div>
    )
  }

  const patientId = patientRecord.id

  // Fetch patient profile, care team, vitals logs, medical reviews, and clinical details concurrently
  const [patientRes, careTeamRes, vitalsRes, reviewsRes, clinicalRes] = await Promise.all([
    usersService.getPatientWithProfile(patientId),
    careTeamsService.getTeamForPatient(patientId),
    vitalsLogsService.getByPatient(patientId),
    medicalReviewsService.getByPatient(patientId),
    getPatientClinicalDataAction(patientId, 7),
  ])

  const patient = patientRes.data
  const careTeam = careTeamRes.data || []
  const vitalsLogs = vitalsRes.data || []
  const reviews = reviewsRes.data || []
  const clinicalData = clinicalRes.data

  // Doctor-set clinical status
  const currentStatus = patient?.patient_profile?.current_status || 'unassessed'

  // True latest doctor evaluation (chronologically newest review)
  const latestReview = reviews[0] || null
  const hasStatusReviewMismatch = Boolean(
    latestReview &&
    currentStatus !== 'unassessed' &&
    latestReview.new_status !== currentStatus
  )

  const statusConfig = {
    stable: {
      label: 'Stable',
      bgColor: 'bg-[#2DD4BF]/10',
      borderColor: 'border-[#2DD4BF]/30',
      textColor: 'text-[#0F766E]',
      badgeBg: 'bg-[#2DD4BF]/15 text-[#0F766E] border-[#2DD4BF]/30',
      icon: CheckCircle2,
      summary: 'Your vital signs and clinical assessment are currently within target therapeutic ranges.',
      guidance: 'Continue following your regular medication schedule and healthy daily routine as advised by your care team.',
    },
    warning: {
      label: 'Needs Attention',
      bgColor: 'bg-[#F5A524]/10',
      borderColor: 'border-[#F5A524]/30',
      textColor: 'text-[#B45309]',
      badgeBg: 'bg-[#F5A524]/15 text-[#B45309] border-[#F5A524]/30',
      icon: AlertTriangle,
      summary: 'Your attending physician has noted items that require attentive monitoring.',
      guidance: 'Please review your doctor’s feedback below carefully. Contact the clinic desk if you feel unwell or experience new symptoms.',
    },
    critical: {
      label: 'Critical Review',
      bgColor: 'bg-[#F25F5C]/10',
      borderColor: 'border-[#F25F5C]/30',
      textColor: 'text-[#B91C1C]',
      badgeBg: 'bg-[#F25F5C]/15 text-[#B91C1C] border-[#F25F5C]/30',
      icon: AlertCircle,
      summary: 'Urgent medical follow-up is recommended based on recent evaluation.',
      guidance: 'Please contact the clinic desk or your assigned care coordinator immediately. For sudden severe distress, dial 911.',
    },
    unassessed: {
      label: 'Baseline Monitoring',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-700',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Info,
      summary: 'Routine health tracking in progress.',
      guidance: 'Your daily vitals are being recorded by your care team. Your physician will review trends during regular clinical rounds.',
    },
  }[currentStatus]

  const StatusIcon = statusConfig.icon

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:pb-12 sm:px-6 space-y-8">
      {/* Query Error Alerts */}
      {(patientRes.error || vitalsRes.error || careTeamRes.error || reviewsRes.error) && (
        <div className="rounded-2xl border border-[#F25F5C]/30 bg-[#F25F5C]/10 p-4 text-xs text-[#B91C1C] space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-[#F25F5C]" />
            Notice: Some health records could not be loaded
          </p>
          {patientRes.error && <p>• Profile: {patientRes.error}</p>}
          {vitalsRes.error && <p>• Vitals: {vitalsRes.error}</p>}
          {careTeamRes.error && <p>• Care Team: {careTeamRes.error}</p>}
          {reviewsRes.error && <p>• Doctor Reviews: {reviewsRes.error}</p>}
        </div>
      )}

      {/* Patient Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF0FF] border border-[#5B5FE8]/20 px-3 py-1 text-xs sm:text-sm font-bold text-[#5B5FE8]">
              <Sparkles className="h-4 w-4 text-[#5B5FE8]" />
              Patient Portal
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-mono font-semibold">ID: {patientId.slice(0, 8)}…</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#1E2243]">
            Welcome, {patient?.full_name || 'Patient'}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
            {patient?.patient_profile?.primary_condition && (
              <span>
                <strong className="font-bold text-slate-700">Condition:</strong>{' '}
                {patient.patient_profile.primary_condition}
              </span>
            )}
            {patient?.patient_profile?.date_of_birth && (
              <span>
                <strong className="font-bold text-slate-700">DOB:</strong>{' '}
                {format(new Date(patient.patient_profile.date_of_birth), 'MMMM dd, yyyy')}
              </span>
            )}
            {patient?.patient_profile?.sex && (
              <span>
                <strong className="font-bold text-slate-700">Sex:</strong>{' '}
                {patient.patient_profile.sex}
              </span>
            )}
          </p>
        </div>

        {/* Status Pill & Message Care Team in Header */}
        <div className="shrink-0 flex flex-wrap items-center gap-3">
          <Link
            href={`/messages?patientId=${patientId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B5FE8] text-white text-xs sm:text-sm font-bold hover:bg-[#4A4ED4] shadow-sm shadow-[#5B5FE8]/25 transition-all"
          >
            <MessageSquare className="h-4 w-4" />
            Message My Care Team
          </Link>
          <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 shadow-xs ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
            <StatusIcon className={`h-6 w-6 ${statusConfig.textColor}`} />
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block">
                Doctor Status
              </span>
              <span className={`text-base font-black capitalize ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Assessment Status Card */}
      <section className={`rounded-2xl border p-5 sm:p-6 shadow-xs ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 border ${statusConfig.borderColor} shadow-xs`}>
            <StatusIcon className={`h-7 w-7 ${statusConfig.textColor}`} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`text-lg sm:text-xl font-black ${statusConfig.textColor}`}>
                Clinical Health Status: {statusConfig.label}
              </h2>
              {patient?.patient_profile?.status_updated_at && (
                <span className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Assessed {format(new Date(patient.patient_profile.status_updated_at), 'MMM dd, yyyy · HH:mm')}
                </span>
              )}
            </div>
            <p className={`text-base font-bold ${statusConfig.textColor}`}>
              {statusConfig.summary}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed bg-white/80 rounded-xl p-3.5 border border-slate-200/80 shadow-xs font-medium">
              <strong className="font-bold text-[#1E2243]">Care Guidance: </strong>
              {statusConfig.guidance}
            </p>
          </div>
        </div>
      </section>

      {/* Attending Doctor's Latest Instructions */}
      {latestReview && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#5B5FE8]">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                  Doctor&apos;s Latest Evaluation & Instructions
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">
                  Reviewed by {latestReview.doctor?.full_name || 'Attending Physician'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latestReview.is_urgent && (
                <span className="inline-flex items-center rounded-full bg-[#F25F5C]/10 border border-[#F25F5C]/20 px-3 py-1 text-xs font-bold text-[#B91C1C]">
                  Priority Directive
                </span>
              )}
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                {format(new Date(latestReview.reviewed_at), 'MMM dd, yyyy · HH:mm')}
              </span>
            </div>
          </div>

          {/* Explicit Clinical Mismatch Notice if status was altered outside formal review */}
          {hasStatusReviewMismatch && (
            <div className="rounded-xl border border-[#F5A524]/30 bg-[#F5A524]/10 p-3.5 text-sm text-[#B45309] flex items-start gap-2.5">
              <Info className="h-4 w-4 text-[#F5A524] shrink-0 mt-0.5" />
              <span>
                <strong>Clinical Notice:</strong> Overall status is currently <strong>{statusConfig.label}</strong>, while this review originally recorded <strong>{latestReview.new_status}</strong>. Status was updated outside of this clinical evaluation.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200/60 bg-[#EEF0FF]/30 p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#5B5FE8]">
              <FileText className="h-4 w-4 text-[#5B5FE8]" />
              <span>Clinical Feedback & Care Plan Notes</span>
            </div>
            {latestReview.feedback_notes ? (
              <p className="text-sm sm:text-base text-[#1E2243] leading-relaxed whitespace-pre-wrap pl-1 italic font-medium">
                &quot;{latestReview.feedback_notes}&quot;
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic pl-1 font-medium">
                No notes recorded on the most recent review.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Vitals Trends Visualizer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#5B5FE8]" />
            My Health Trends
          </h2>
          <span className="text-xs sm:text-sm text-slate-500 font-semibold">
            {vitalsLogs.length} total reading{vitalsLogs.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {vitalsLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">
            <HeartPulse className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No vital signs recorded yet. Your caregiver will log readings during daily check-ins.
          </div>
        ) : (
          <VitalsChart logs={vitalsLogs} />
        )}
      </section>

      {/* Recent Vitals Logs Table */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-[#5B5FE8]" />
              Recent Vitals Records
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Chronological log of vital signs verified and recorded by your care team
            </p>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/70 font-semibold">Read-Only Health Record</span>
        </div>

        {vitalsLogs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center font-medium">No vitals logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70">
                <tr>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Date & Time</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Blood Pressure</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Heart Rate</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">SpO2</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Temperature</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Range Check</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Recorded By</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vitalsLogs.slice(0, 15).map((log) => {
                  const assessment = checkVitalsRanges(log)
                  return (
                    <tr key={log.id} className="hover:bg-[#EEF0FF]/30 transition">
                      <td className="py-3.5 px-3 font-medium text-slate-600 whitespace-nowrap text-sm">
                        {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-sm sm:text-base font-black text-[#1E2243]">
                        {log.bp_systolic && log.bp_diastolic
                          ? `${log.bp_systolic}/${log.bp_diastolic} mmHg`
                          : '—'}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-sm sm:text-base font-black text-[#1E2243]">
                        {log.heart_rate ? `${log.heart_rate} bpm` : '—'}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-sm sm:text-base font-black text-[#1E2243]">
                        {log.spo2 ? `${log.spo2}%` : '—'}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-sm sm:text-base font-black text-[#1E2243]">
                        {log.temperature_c ? `${log.temperature_c}°C` : '—'}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {assessment.isFlagged ? (
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
                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap font-medium text-sm">
                        {log.caregiver?.full_name || 'Caregiver'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 max-w-xs truncate text-sm">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Care Summaries (Plain Language) */}
      {clinicalData?.shiftReports && clinicalData.shiftReports.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#5B5FE8]" />
                Recent Care Summaries
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Daily summaries recorded by your home caregivers
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              {clinicalData.shiftReports.length} Recent Logs
            </span>
          </div>

          <div className="space-y-3">
            {clinicalData.shiftReports.slice(0, 4).map((sr) => (
              <div
                key={sr.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2 hover:bg-slate-50 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-[#1E2243] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {sr.shift} Shift
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {format(new Date(sr.submitted_at), 'MMM dd, yyyy · HH:mm')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Caregiver: <strong className="text-slate-700">{sr.caregiver_name}</strong>
                  </span>
                </div>

                <p className="text-sm font-semibold text-[#1E2243]">
                  Condition: <span className="font-normal text-slate-600">{sr.general_condition || 'Comfortable and resting well'}</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 text-slate-600">
                  {sr.activities_care && (
                    <div>
                      <strong className="text-slate-700 font-bold">Daily Assistance:</strong> {sr.activities_care}
                    </div>
                  )}
                  {sr.food_fluid_intake && (
                    <div>
                      <strong className="text-slate-700 font-bold">Meals & Nutrition:</strong> {sr.food_fluid_intake}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Medicines & Schedule (Plain Language) */}
      {clinicalData?.medications && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                <Pill className="h-5 w-5 text-[#5B5FE8]" />
                My Medicines & Schedule
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Your prescribed medicines and daily dosing times
              </p>
            </div>
            {clinicalData.medicationCompliance && (
              <div className="flex items-center gap-2 bg-[#2DD4BF]/10 px-3 py-1.5 rounded-xl border border-[#2DD4BF]/30 text-xs font-bold text-[#0F766E]">
                <CheckCheck className="h-4 w-4 text-[#2DD4BF]" />
                <span>{clinicalData.medicationCompliance.complianceRate}% On-Time Taking</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clinicalData.medications.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#1E2243]">{m.name}</span>
                  <span className="text-xs font-bold text-[#5B5FE8] bg-[#EEF0FF] px-2 py-0.5 rounded">
                    {m.dosage}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-3">
                  <span>{m.route || 'Oral'}</span>
                  <span>•</span>
                  <span>{m.frequency}</span>
                </div>
                {m.schedule_times && (
                  <p className="text-xs text-slate-500">
                    Times to take: <strong className="text-slate-700">{m.schedule_times.join(', ')}</strong>
                  </p>
                )}
                {m.instructions && (
                  <p className="text-xs text-slate-500 italic mt-0.5">Doctor Instructions: {m.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Appointments (Plain Language) */}
      {clinicalData?.appointments && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#5B5FE8]" />
                My Upcoming Appointments
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Scheduled doctor visits and therapy sessions
              </p>
            </div>
          </div>

          {clinicalData.appointments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center font-medium">No upcoming appointments scheduled.</p>
          ) : (
            <div className="space-y-3">
              {clinicalData.appointments.map((ap) => (
                <div
                  key={ap.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-[#5B5FE8] bg-[#EEF0FF] px-2 py-0.5 rounded">
                        {ap.type}
                      </span>
                      <span className="text-sm font-bold text-[#1E2243]">
                        {format(new Date(ap.appointment_date), 'EEEE, MMMM dd, yyyy · hh:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Location: <strong className="text-slate-800">{ap.location || 'Dumaguete Clinic'}</strong>
                    </p>
                    {ap.notes && <p className="text-xs text-slate-500 italic">{ap.notes}</p>}
                  </div>

                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#2DD4BF]/15 text-[#0F766E] border border-[#2DD4BF]/30 capitalize self-start sm:self-auto">
                    {ap.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Care Team Contacts Roster */}
      <section>
        <PatientCareTeamRoster members={careTeam} />
      </section>
    </div>
  )
}