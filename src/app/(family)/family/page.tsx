import { requireRole } from '@/lib/auth/roleGuard'
import { careTeamsService } from '@/services/careTeamsService'
import { usersService } from '@/services/usersService'
import { vitalsLogsService } from '@/services/vitalsLogsService'
import { medicalReviewsService } from '@/services/medicalReviewsService'
import { FamilyPatientSelector, FamilyCareTeamRoster } from '@/components/family'
import { VitalsChart } from '@/components/caregiver/VitalsChart'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { format } from 'date-fns'
import { getPatientClinicalDataAction } from '@/app/actions/doctorClinical'
import Link from 'next/link'
import {
  Heart,
  Users,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  HeartPulse,
  Info,
  PhoneCall,
  Stethoscope,
  MessageSquare,
  Pill,
  CheckCheck,
  Clock,
} from 'lucide-react'

export const metadata = {
  title: 'Family Member Portal | CareConnect',
  description: 'Monitor your loved one’s health trends, physician updates, and care team directory.',
}

interface FamilyPageProps {
  searchParams?: Promise<{ patientId?: string }>
}

export default async function FamilyDashboardPage({ searchParams }: FamilyPageProps) {
  const { user } = await requireRole(['family_member'])
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  // 1. Fetch all assigned active patients for this family member
  const patientsRes = await careTeamsService.getPatientsForFamilyMember(user.id)
  const assignedPatients = patientsRes.data || []

  // If family member has no active patient assignments
  if (assignedPatients.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Users className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">No Patient Assignments Found</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          Your account is registered as a Family Member, but you are not currently assigned to any active patient care teams. Please contact the clinic administrator to link your account to your loved one.
        </p>
      </div>
    )
  }

  // 2. Select patient: query param if valid, or default to first assigned patient
  const paramPatientId = resolvedSearchParams?.patientId
  if (paramPatientId && !assignedPatients.some((p) => p.patientId === paramPatientId)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">403 - Access Forbidden</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          You are not authorized to view this patient record. Family members may only view linked patient records.
        </p>
      </div>
    )
  }

  const selectedPatientSummary = (paramPatientId ? assignedPatients.find((p) => p.patientId === paramPatientId) : null) || assignedPatients[0]
  const selectedPatientId = selectedPatientSummary.patientId

  // 3. Concurrently fetch selected patient's profile, care team, vitals, reviews, and clinical data
  const [patientRes, careTeamRes, vitalsRes, reviewsRes, clinicalRes] = await Promise.all([
    usersService.getPatientWithProfile(selectedPatientId),
    careTeamsService.getTeamForPatient(selectedPatientId),
    vitalsLogsService.getByPatient(selectedPatientId),
    medicalReviewsService.getByPatient(selectedPatientId),
    getPatientClinicalDataAction(selectedPatientId, 7),
  ])

  const patient = patientRes.data
  const careTeam = careTeamRes.data || []
  const vitalsLogs = vitalsRes.data || []
  const reviews = reviewsRes.data || []
  const clinicalData = clinicalRes.data

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
      icon: CheckCircle2,
      summary: 'Vital signs are within normal therapeutic targets. Daily care routines proceeding as planned.',
    },
    warning: {
      label: 'Needs Attention',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      icon: AlertTriangle,
      summary: 'The attending physician is monitoring specific vitals or symptom trends. Care team notified.',
    },
    critical: {
      label: 'Critical Status',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      icon: AlertCircle,
      summary: 'Physician attention required. The clinical team has flagged urgent instructions.',
    },
    unassessed: {
      label: 'Routine Baseline',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      icon: Info,
      summary: 'Initial vitals recordings underway. Formal clinical review scheduled.',
    },
  }[currentStatus]

  const StatusIcon = statusConfig.icon
  const isCritical = currentStatus === 'critical'

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

      {/* Header & Multi-Patient Switcher */}
      <div className="space-y-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs sm:text-sm font-bold text-amber-800">
                <Heart className="h-4 w-4 text-amber-600" />
                Family Portal
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Logged in as: {user.email}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#1E2243]">
              Patient Care Overview
            </h1>
          </div>

          <Link
            href={`/messages?patientId=${selectedPatientId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B5FE8] text-white text-xs sm:text-sm font-bold hover:bg-[#4A4ED4] shadow-sm shadow-[#5B5FE8]/25 transition-all self-start sm:self-auto shrink-0"
          >
            <MessageSquare className="h-4 w-4" />
            Message the Care Team
          </Link>
        </div>

        {/* Multi-Patient Selector */}
        <FamilyPatientSelector
          patients={assignedPatients}
          selectedPatientId={selectedPatientId}
        />
      </div>

      {/* Critical Alert Banner (if urgent) */}
      {isCritical && (
        <section className="rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white font-bold">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-red-950">
                  Priority Health Notice for {patient?.full_name || 'Your Loved One'}
                </h2>
                <span className="rounded-full bg-red-200 px-3 py-1 text-xs font-bold text-red-900 uppercase tracking-wider">
                  Clinical Alert
                </span>
              </div>
              <p className="text-sm text-red-900/90 leading-relaxed font-medium">
                The attending physician has flagged a critical update regarding {patient?.full_name || 'this patient'}. Please read the clinical notes below and reach out to the Nurses&apos; Station if you have immediate concerns.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-red-200/80">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-red-900">
              <PhoneCall className="h-4 w-4" />
              <span>Nurses&apos; Station: (555) 019-2835 (24/7)</span>
            </div>
            <span className="text-red-300">|</span>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-red-900">
              <PhoneCall className="h-4 w-4" />
              <span>Clinic Desk: (555) 019-2834 (8am–5pm)</span>
            </div>
          </div>
        </section>
      )}

      {/* Health Status Summary Card */}
      <section className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/80 border ${statusConfig.borderColor}`}>
            <StatusIcon className={`h-7 w-7 ${statusConfig.textColor}`} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className={`text-lg sm:text-xl font-black ${statusConfig.textColor}`}>
                  {patient?.full_name || 'Patient'} — {statusConfig.label}
                </h2>
                {selectedPatientSummary.relationshipLabel && (
                  <span className="rounded-md bg-white/70 px-2.5 py-0.5 text-xs font-bold text-gray-700 border border-gray-200">
                    {selectedPatientSummary.relationshipLabel}
                  </span>
                )}
              </div>
              {patient?.patient_profile?.status_updated_at && (
                <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Status updated {format(new Date(patient.patient_profile.status_updated_at), 'MMM dd, yyyy · HH:mm')}
                </span>
              )}
            </div>

            <p className={`text-base font-bold ${statusConfig.textColor}`}>
              {statusConfig.summary}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-white/70 rounded-xl p-3.5 border border-gray-200/60 mt-2 font-medium">
              {patient?.patient_profile?.primary_condition && (
                <div>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">Primary Condition: </span>
                  <span className="font-black text-[#1E2243]">{patient.patient_profile.primary_condition}</span>
                </div>
              )}
              {patient?.patient_profile?.date_of_birth && (
                <div>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">DOB: </span>
                  <span className="font-black text-[#1E2243]">
                    {format(new Date(patient.patient_profile.date_of_birth), 'MMMM dd, yyyy')}
                  </span>
                </div>
              )}
              {patient?.patient_profile?.sex && (
                <div>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">Sex: </span>
                  <span className="font-black text-[#1E2243]">{patient.patient_profile.sex}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Attending Doctor's Clinical Updates */}
      {latestReview && (
        <section className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/40 via-white to-purple-50/20 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                  Physician&apos;s Clinical Update for Family
                </h2>
                <p className="text-sm font-medium text-gray-500 mt-0.5">
                  Recorded by {latestReview.doctor?.full_name || 'Attending Physician'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latestReview.is_urgent && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  Urgent Evaluation
                </span>
              )}
              <span className="text-xs sm:text-sm text-gray-500 font-medium">
                {format(new Date(latestReview.reviewed_at), 'MMM dd, yyyy · HH:mm')}
              </span>
            </div>
          </div>

          {/* Explicit Clinical Mismatch Notice if status was altered outside formal review */}
          {hasStatusReviewMismatch && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-sm text-amber-900 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Clinical Notice:</strong> Overall status is currently <strong>{statusConfig.label}</strong>, while this review originally recorded <strong>{latestReview.new_status}</strong>. Status was updated outside of this clinical evaluation.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-purple-100 bg-white p-4 sm:p-5 shadow-inner space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-900">
              <FileText className="h-4 w-4 text-purple-600" />
              <span>Doctor&apos;s Notes & Care Recommendations</span>
            </div>
            {latestReview.feedback_notes ? (
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap pl-1 italic font-medium">
                &quot;{latestReview.feedback_notes}&quot;
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic pl-1 font-medium">
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
            <Activity className="h-5 w-5 text-amber-600" />
            {patient?.full_name || 'Loved One'}&apos;s Vital Trends
          </h2>
          <span className="text-xs sm:text-sm text-slate-500 font-semibold">
            {vitalsLogs.length} total reading{vitalsLogs.length === 1 ? '' : 's'}
          </span>
        </div>

        {vitalsLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm font-medium text-gray-500">
            <HeartPulse className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No vitals logs recorded yet for {patient?.full_name || 'this patient'}.
          </div>
        ) : (
          <VitalsChart logs={vitalsLogs} />
        )}
      </section>

      {/* Chronological Vitals History Table */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-amber-600" />
              Measurement History
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Read-only record of observations logged by assigned healthcare personnel
            </p>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/70 font-semibold">Protected Health Record</span>
        </div>

        {vitalsLogs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center font-medium">No vital records available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-slate-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Date & Time</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Blood Pressure</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Heart Rate</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">SpO2</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Temperature</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Range Check</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Logged By</th>
                  <th className="py-3 px-3 uppercase tracking-wider text-slate-500 font-bold text-xs">Caregiver Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vitalsLogs.slice(0, 15).map((log) => {
                  const assessment = checkVitalsRanges(log)
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition">
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
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

      {/* Care Summaries: Short Summaries of Last Few Shift Reports */}
      {clinicalData?.shiftReports && clinicalData.shiftReports.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#5B5FE8]" />
                Daily Care Summaries
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Care routine updates from assigned caregivers (no internal clinical notes)
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
                      <strong className="text-slate-700 font-bold">Meals & Fluids:</strong> {sr.food_fluid_intake}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Medication Schedule & Compliance (Read-Only) */}
      {clinicalData?.medications && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                <Pill className="h-5 w-5 text-[#5B5FE8]" />
                Medication Schedule & Compliance
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Current active medicines administered by caregivers under physician instructions
              </p>
            </div>
            {clinicalData.medicationCompliance && (
              <div className="flex items-center gap-2 bg-[#0F766E]/10 px-3 py-1.5 rounded-xl border border-[#2DD4BF]/30 text-xs font-bold text-[#0F766E]">
                <CheckCheck className="h-4 w-4 text-[#2DD4BF]" />
                <span>{clinicalData.medicationCompliance.complianceRate}% On-Time Compliance</span>
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
                    Scheduled Times: <strong className="text-slate-700">{m.schedule_times.join(', ')}</strong>
                  </p>
                )}
                {m.instructions && (
                  <p className="text-xs text-slate-500 italic mt-0.5">Note: {m.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Appointments */}
      {clinicalData?.appointments && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#5B5FE8]" />
                Upcoming Follow-up Appointments
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Scheduled check-ups and therapy sessions
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

      {/* Care Team & Kin Directory */}
      <section>
        <FamilyCareTeamRoster
          members={careTeam}
          patientName={patient?.full_name || 'Loved One'}
        />
      </section>
    </div>
  )
}