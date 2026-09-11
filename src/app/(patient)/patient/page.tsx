import { requireRole } from '@/lib/auth/roleGuard'
import { usersService } from '@/services/usersService'
import { careTeamsService } from '@/services/careTeamsService'
import { vitalsLogsService } from '@/services/vitalsLogsService'
import { medicalReviewsService } from '@/services/medicalReviewsService'
import { VitalsChart } from '@/components/caregiver/VitalsChart'
import { PatientCareTeamRoster } from '@/components/patient'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { format } from 'date-fns'
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
} from 'lucide-react'

export const metadata = {
  title: 'My Health Dashboard | CareConnect Patient Portal',
  description: 'View your health status, recent vital trends, attending doctor instructions, and care team directory.',
}

export default async function PatientDashboardPage() {
  const { user } = await requireRole(['patient'])
  const patientId = user.id

  // Fetch patient profile, care team, vitals logs, and medical reviews concurrently
  const [patientRes, careTeamRes, vitalsRes, reviewsRes] = await Promise.all([
    usersService.getPatientWithProfile(patientId),
    careTeamsService.getTeamForPatient(patientId),
    vitalsLogsService.getByPatient(patientId),
    medicalReviewsService.getByPatient(patientId),
  ])

  const patient = patientRes.data
  const careTeam = careTeamRes.data || []
  const vitalsLogs = vitalsRes.data || []
  const reviews = reviewsRes.data || []

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
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: CheckCircle2,
      summary: 'Your vital signs and clinical assessment are currently within target therapeutic ranges.',
      guidance: 'Continue following your regular medication schedule and healthy daily routine as advised by your care team.',
    },
    warning: {
      label: 'Needs Attention',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: AlertTriangle,
      summary: 'Your attending physician has noted items that require attentive monitoring.',
      guidance: 'Please review your doctor’s feedback below carefully. Contact the clinic desk if you feel unwell or experience new symptoms.',
    },
    critical: {
      label: 'Critical Review',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      badgeBg: 'bg-red-100 text-red-800 border-red-300',
      icon: AlertCircle,
      summary: 'Urgent medical follow-up is recommended based on recent evaluation.',
      guidance: 'Please contact the clinic desk or your assigned care coordinator immediately. For sudden severe distress, dial 911.',
    },
    unassessed: {
      label: 'Baseline Monitoring',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      badgeBg: 'bg-gray-100 text-gray-700 border-gray-300',
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Notice: Some health records could not be loaded
          </p>
          {patientRes.error && <p>• Profile: {patientRes.error}</p>}
          {vitalsRes.error && <p>• Vitals: {vitalsRes.error}</p>}
          {careTeamRes.error && <p>• Care Team: {careTeamRes.error}</p>}
          {reviewsRes.error && <p>• Doctor Reviews: {reviewsRes.error}</p>}
        </div>
      )}

      {/* Patient Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              Patient Portal
            </span>
            <span className="text-xs text-gray-400">ID: {patientId.slice(0, 8)}…</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Welcome, {patient?.full_name || 'Patient'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
            {patient?.patient_profile?.primary_condition && (
              <span>
                <strong className="font-semibold text-gray-700">Condition:</strong>{' '}
                {patient.patient_profile.primary_condition}
              </span>
            )}
            {patient?.patient_profile?.date_of_birth && (
              <span>
                <strong className="font-semibold text-gray-700">DOB:</strong>{' '}
                {format(new Date(patient.patient_profile.date_of_birth), 'MMMM dd, yyyy')}
              </span>
            )}
            {patient?.patient_profile?.sex && (
              <span>
                <strong className="font-semibold text-gray-700">Sex:</strong>{' '}
                {patient.patient_profile.sex}
              </span>
            )}
          </p>
        </div>

        {/* Status Pill in Header */}
        <div className="shrink-0 flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-sm ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
            <StatusIcon className={`h-5 w-5 ${statusConfig.textColor}`} />
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500 block">
                Doctor Status
              </span>
              <span className={`text-sm font-bold capitalize ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Assessment Status Card */}
      <section className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 border ${statusConfig.borderColor}`}>
            <StatusIcon className={`h-6 w-6 ${statusConfig.textColor}`} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`text-base font-bold ${statusConfig.textColor}`}>
                Clinical Health Status: {statusConfig.label}
              </h2>
              {patient?.patient_profile?.status_updated_at && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Assessed {format(new Date(patient.patient_profile.status_updated_at), 'MMM dd, yyyy · HH:mm')}
                </span>
              )}
            </div>
            <p className={`text-sm font-medium ${statusConfig.textColor}`}>
              {statusConfig.summary}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed bg-white/70 rounded-xl p-3 border border-gray-200/60">
              <strong className="font-semibold text-gray-900">Care Guidance: </strong>
              {statusConfig.guidance}
            </p>
          </div>
        </div>
      </section>

      {/* Attending Doctor's Latest Instructions */}
      {latestReview && (
        <section className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/40 via-white to-purple-50/20 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  Doctor&apos;s Latest Evaluation & Instructions
                </h2>
                <p className="text-xs text-gray-500">
                  Reviewed by {latestReview.doctor?.full_name || 'Attending Physician'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latestReview.is_urgent && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                  Priority Directive
                </span>
              )}
              <span className="text-xs text-gray-400">
                {format(new Date(latestReview.reviewed_at), 'MMM dd, yyyy · HH:mm')}
              </span>
            </div>
          </div>

          {/* Explicit Clinical Mismatch Notice if status was altered outside formal review */}
          {hasStatusReviewMismatch && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Clinical Notice:</strong> Overall status is currently <strong>{statusConfig.label}</strong>, while this review originally recorded <strong>{latestReview.new_status}</strong>. Status was updated outside of this clinical evaluation.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-inner space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-900">
              <FileText className="h-4 w-4 text-purple-600" />
              <span>Clinical Feedback & Care Plan Notes</span>
            </div>
            {latestReview.feedback_notes ? (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pl-1 italic">
                &quot;{latestReview.feedback_notes}&quot;
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic pl-1">
                No notes recorded on the most recent review.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Vitals Trends Visualizer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            My Health Trends
          </h2>
          <span className="text-xs text-gray-500">
            {vitalsLogs.length} total reading{vitalsLogs.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {vitalsLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
            <HeartPulse className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No vital signs recorded yet. Your caregiver will log readings during daily check-ins.
          </div>
        ) : (
          <VitalsChart logs={vitalsLogs} />
        )}
      </section>

      {/* Recent Vitals Logs Table */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-teal-600" />
              Recent Vitals Records
            </h2>
            <p className="text-xs text-gray-500">
              Chronological log of vital signs verified and recorded by your care team
            </p>
          </div>
          <span className="text-xs text-gray-400">Read-Only Health Record</span>
        </div>

        {vitalsLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No vitals logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Blood Pressure</th>
                  <th className="py-2.5 px-3">Heart Rate</th>
                  <th className="py-2.5 px-3">SpO2</th>
                  <th className="py-2.5 px-3">Temperature</th>
                  <th className="py-2.5 px-3">Range Check</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vitalsLogs.slice(0, 15).map((log) => {
                  const assessment = checkVitalsRanges(log)
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                        {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.bp_systolic && log.bp_diastolic
                          ? `${log.bp_systolic}/${log.bp_diastolic} mmHg`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.heart_rate ? `${log.heart_rate} bpm` : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.spo2 ? `${log.spo2}%` : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.temperature_c ? `${log.temperature_c}°C` : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {assessment.isFlagged ? (
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
                      <td className="py-3 px-3 text-gray-500 max-w-xs truncate">
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

      {/* Care Team Contacts Roster */}
      <section>
        <PatientCareTeamRoster members={careTeam} />
      </section>
    </div>
  )
}