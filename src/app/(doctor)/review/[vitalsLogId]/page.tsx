import { requireRole } from '@/lib/auth/roleGuard'
import { vitalsLogsService } from '@/services/vitalsLogsService'
import { ReviewForm } from '@/components/doctor/ReviewForm'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  ArrowLeft,
  Activity,
  Heart,
  Droplets,
  Thermometer,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
} from 'lucide-react'

export default async function DoctorReviewPage({
  params,
}: {
  params: Promise<{ vitalsLogId: string }>
}) {
  // 1. Guard route: doctor only
  await requireRole(['doctor'])

  // 2. Resolve dynamic route param (Next.js 15 Promise)
  const { vitalsLogId } = await params

  // 3. Fetch detailed vitals log with joined patient, caregiver, and reviews
  const { data: log, error: logError } = await vitalsLogsService.getDetailById(vitalsLogId)

  if (logError || !log) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Vitals Log Not Found</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {logError || 'The requested vitals log could not be found or you do not have permission to review this patient.'}
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

  // 4. Evaluate non-clinical threshold indicators
  const thresholdResult = checkVitalsRanges(log)
  const isFlagged = thresholdResult.isFlagged

  // 5. Check if already reviewed
  const pastReviews = log.medical_reviews || []
  const hasPreviousReview = pastReviews.length > 0
  const latestReview = hasPreviousReview ? pastReviews[0] : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/triage"
          className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Triage Queue
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Active Care Team Verified</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clinical Review & Treatment Orders</h1>
        <p className="text-xs text-gray-500 mt-1">
          Review vitals measurements submitted by bedside staff, assess clinical status, and issue treatment feedback.
        </p>
      </div>

      {/* Vitals Log Context Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {log.patient?.full_name || 'Assigned Patient'}
              </h2>
              {log.patient_id && (
                <Link
                  href={`/patients/${log.patient_id}`}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                >
                  (View Full Chart)
                </Link>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Condition:{' '}
              <span className="font-medium text-gray-700">
                {log.patient?.patient_profile?.primary_condition || 'General Care'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Current Status:</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                log.patient?.patient_profile?.current_status === 'critical'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : log.patient?.patient_profile?.current_status === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : log.patient?.patient_profile?.current_status === 'stable'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {log.patient?.patient_profile?.current_status || 'Unassessed'}
            </span>
          </div>
        </div>

        {/* Measurements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Activity className="h-3.5 w-3.5 text-purple-600" />
              <span>Blood Pressure</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {log.bp_systolic && log.bp_diastolic
                ? `${log.bp_systolic}/${log.bp_diastolic}`
                : '—'}
              <span className="text-xs font-normal text-gray-500 ml-1">mmHg</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              <span>Heart Rate</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {log.heart_rate ?? '—'}
              <span className="text-xs font-normal text-gray-500 ml-1">bpm</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Droplets className="h-3.5 w-3.5 text-blue-500" />
              <span>SpO2</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {log.spo2 ?? '—'}
              <span className="text-xs font-normal text-gray-500 ml-1">%</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Thermometer className="h-3.5 w-3.5 text-amber-500" />
              <span>Temperature</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {log.temperature_c ?? '—'}
              <span className="text-xs font-normal text-gray-500 ml-1">°C</span>
            </p>
          </div>
        </div>

        {/* Metadata & Attribution Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              Recorded by:{' '}
              <strong className="text-gray-700">
                {log.caregiver?.full_name || 'Assigned Caregiver'}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
            </span>
          </div>

          <div>
            {isFlagged ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Flagged (Out of typical range)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Within typical reference range
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prior Review Notice Banner (if previously reviewed) */}
      {hasPreviousReview && latestReview && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 sm:p-5 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-900 font-bold">
              <History className="h-4 w-4 text-purple-700" />
              <span>Prior Review on File</span>
            </div>
            <span className="text-xs text-purple-700">
              {format(new Date(latestReview.reviewed_at), 'MMM dd, yyyy · HH:mm')}
            </span>
          </div>
          <p className="text-xs text-purple-800">
            Reviewed by{' '}
            <strong>{latestReview.doctor?.full_name || 'Attending Physician'}</strong> with status{' '}
            <strong className="capitalize">{latestReview.new_status}</strong>
            {latestReview.is_urgent && ' (Marked Urgent)'}.
          </p>
          {latestReview.feedback_notes && (
            <p className="text-xs text-purple-900 bg-white/70 rounded-lg p-2.5 border border-purple-100 italic">
              &quot;{latestReview.feedback_notes}&quot;
            </p>
          )}
        </div>
      )}

      {/* Review Submission Form */}
      <ReviewForm vitalsLog={log} />
    </div>
  )
}