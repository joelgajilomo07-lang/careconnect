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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1F2] text-[#F25F5C] border border-[#F25F5C]/30">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2243]">Vitals Log Not Found</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {logError || 'The requested vitals log could not be found or you do not have permission to review this patient.'}
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
          className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 text-sm sm:text-base font-bold text-slate-600 hover:text-[#5B5FE8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Triage Queue
        </Link>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#0F766E] bg-[#2DD4BF]/10 px-3.5 py-1.5 rounded-full border border-[#2DD4BF]/30 font-bold">
          <ShieldCheck className="h-4 w-4 text-[#2DD4BF]" />
          <span>Active Care Team Verified</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight">Clinical Review & Treatment Orders</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Review vitals measurements submitted by bedside staff, assess clinical status, and issue treatment feedback.
        </p>
      </div>

      {/* Vitals Log Context Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#1E2243]">
                {log.patient?.full_name || 'Assigned Patient'}
              </h2>
              {log.patient_id && (
                <Link
                  href={`/patients/${log.patient_id}`}
                  className="text-sm font-bold text-[#5B5FE8] hover:underline"
                >
                  (View Full Chart)
                </Link>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Condition:{' '}
              <span className="font-bold text-slate-700">
                {log.patient?.patient_profile?.primary_condition || 'General Care'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">Current Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold capitalize border ${
                log.patient?.patient_profile?.current_status === 'critical'
                  ? 'bg-[#F25F5C]/10 text-[#B91C1C] border-[#F25F5C]/30'
                  : log.patient?.patient_profile?.current_status === 'warning'
                  ? 'bg-[#F5A524]/10 text-[#B45309] border-[#F5A524]/30'
                  : log.patient?.patient_profile?.current_status === 'stable'
                  ? 'bg-[#2DD4BF]/10 text-[#0F766E] border-[#2DD4BF]/30'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {log.patient?.patient_profile?.current_status || 'Unassessed'}
            </span>
          </div>
        </div>

        {/* Measurements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
              <Activity className="h-4 w-4 text-[#5B5FE8]" />
              <span>Blood Pressure</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#1E2243]">
              {log.bp_systolic && log.bp_diastolic
                ? `${log.bp_systolic}/${log.bp_diastolic}`
                : '—'}
              <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1">mmHg</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
              <Heart className="h-4 w-4 text-[#F25F5C]" />
              <span>Heart Rate</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#1E2243]">
              {log.heart_rate ?? '—'}
              <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1">bpm</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
              <Droplets className="h-4 w-4 text-[#2DD4BF]" />
              <span>SpO2</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#1E2243]">
              {log.spo2 ?? '—'}
              <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1">%</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
              <Thermometer className="h-4 w-4 text-[#F5A524]" />
              <span>Temperature</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#1E2243]">
              {log.temperature_c ?? '—'}
              <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1">°C</span>
            </p>
          </div>
        </div>

        {/* Metadata & Attribution Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-slate-600 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400" />
              Recorded by:{' '}
              <strong className="text-slate-800 font-bold">
                {log.caregiver?.full_name || 'Assigned Caregiver'}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              {format(new Date(log.logged_at), 'MMM dd, yyyy · HH:mm')}
            </span>
          </div>

          <div>
            {isFlagged ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#F5A524]/10 text-[#B45309] border border-[#F5A524]/30">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F5A524]" />
                Flagged (Out of typical range)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#2DD4BF]/10 text-[#0F766E] border border-[#2DD4BF]/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                Within typical reference range
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prior Review Notice Banner (if previously reviewed) */}
      {hasPreviousReview && latestReview && (
        <div className="rounded-2xl border border-[#5B5FE8]/30 bg-[#EEF0FF]/50 p-4 sm:p-5 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1E2243] font-bold text-base">
              <History className="h-4 w-4 text-[#5B5FE8]" />
              <span>Prior Review on File</span>
            </div>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              {format(new Date(latestReview.reviewed_at), 'MMM dd, yyyy · HH:mm')}
            </span>
          </div>
          <p className="text-sm text-slate-700">
            Reviewed by{' '}
            <strong className="text-[#1E2243] font-bold">{latestReview.doctor?.full_name || 'Attending Physician'}</strong> with status{' '}
            <strong className="capitalize text-[#1E2243] font-bold">{latestReview.new_status}</strong>
            {latestReview.is_urgent && ' (Marked Urgent)'}.
          </p>
          {latestReview.feedback_notes && (
            <p className="text-sm text-[#1E2243] bg-white rounded-lg p-3 border border-[#5B5FE8]/20 italic font-medium">
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