import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import type { TriageQueueItem } from '@/services/vitalsLogsService'
import { checkVitalsRanges } from '@/lib/utils/vitalsThresholds'
import {
  Heart,
  Activity,
  Droplets,
  Thermometer,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
} from 'lucide-react'

interface TriageQueueItemCardProps {
  item: TriageQueueItem
}

export function TriageQueueItemCard({ item }: TriageQueueItemCardProps) {
  const assessment = checkVitalsRanges({
    heart_rate: item.heart_rate,
    spo2: item.spo2,
    bp_systolic: item.bp_systolic,
    bp_diastolic: item.bp_diastolic,
    temperature_c: item.temperature_c,
  })

  const isReviewed = item.medical_reviews && item.medical_reviews.length > 0
  const latestReview = isReviewed ? item.medical_reviews[0] : null
  const patientStatus = item.patient?.patient_profile?.current_status

  return (
    <div
      className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md ${
        !isReviewed
          ? 'border-blue-200 ring-1 ring-blue-500/10'
          : 'border-gray-200'
      }`}
    >
      {/* Top Header: Patient & Doctor-Set Clinical Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/patients/${item.patient_id}`}
              className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {item.patient?.full_name || 'Patient'}
            </Link>
            {item.patient?.patient_profile?.primary_condition && (
              <span className="text-xs text-gray-500 font-medium">
                • {item.patient.patient_profile.primary_condition}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
            <span>Logged by <span className="font-semibold text-gray-700">{item.caregiver?.full_name || 'Caregiver'}</span></span>
            <span>•</span>
            <span title={format(new Date(item.logged_at), 'PPP pp')}>
              {formatDistanceToNow(new Date(item.logged_at), { addSuffix: true })}
            </span>
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Non-clinical heuristic range flag */}
          {assessment.isFlagged && (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20"
              title={assessment.flags.map(f => f.message).join('; ')}
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Flagged (Out of typical range)</span>
            </span>
          )}

          {assessment.isFlagged && patientStatus && (
            <span className="hidden sm:inline-block h-4 w-px bg-gray-200" aria-hidden="true" />
          )}

          {/* Official Doctor Clinical Status Badge */}
          {patientStatus && (
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status:</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                  patientStatus === 'critical'
                    ? 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20'
                    : patientStatus === 'warning'
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                    : patientStatus === 'stable'
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {patientStatus}
              </span>
            </div>
          )}

          <span className="hidden sm:inline-block h-4 w-px bg-gray-200" aria-hidden="true" />

          {/* Review Status Indicator */}
          {isReviewed ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Reviewed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span>Needs Review</span>
            </span>
          )}
        </div>
      </div>

      {/* Vitals Measurements Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
        {/* Blood Pressure */}
        <div className="rounded-xl bg-gray-50/80 p-3 border border-gray-100">
          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <Activity className="h-3.5 w-3.5 text-blue-600" />
            Blood Pressure
          </span>
          <p className="mt-1 text-base font-bold text-gray-900">
            {item.bp_systolic && item.bp_diastolic ? (
              <>
                {item.bp_systolic}/{item.bp_diastolic}{' '}
                <span className="text-xs font-normal text-gray-500">mmHg</span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>

        {/* Heart Rate */}
        <div className="rounded-xl bg-gray-50/80 p-3 border border-gray-100">
          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            Heart Rate
          </span>
          <p className="mt-1 text-base font-bold text-gray-900">
            {item.heart_rate ? (
              <>
                {item.heart_rate}{' '}
                <span className="text-xs font-normal text-gray-500">bpm</span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>

        {/* SpO2 */}
        <div className="rounded-xl bg-gray-50/80 p-3 border border-gray-100">
          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <Droplets className="h-3.5 w-3.5 text-cyan-600" />
            Oxygen SpO2
          </span>
          <p className="mt-1 text-base font-bold text-gray-900">
            {item.spo2 !== null ? `${item.spo2}%` : '—'}
          </p>
        </div>

        {/* Temperature */}
        <div className="rounded-xl bg-gray-50/80 p-3 border border-gray-100">
          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <Thermometer className="h-3.5 w-3.5 text-amber-600" />
            Temperature
          </span>
          <p className="mt-1 text-base font-bold text-gray-900">
            {item.temperature_c !== null ? `${item.temperature_c}°C` : '—'}
          </p>
        </div>
      </div>

      {/* Flagged Explanations (if any) */}
      {assessment.isFlagged && (
        <div className="rounded-xl bg-amber-50/60 p-3 text-xs text-amber-900 mb-3 space-y-1 border border-amber-200/50">
          <p className="font-semibold flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            Measurements outside typical baseline:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            {assessment.flags.map((f, i) => (
              <li key={i}>{f.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Clinical Notes (if logged by caregiver) */}
      {item.notes && (
        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700 flex items-start gap-2 mb-3">
          <FileText className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-gray-900">Caregiver observation:</span>{' '}
            <span className="italic">{item.notes}</span>
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <Link
          href={`/patients/${item.patient_id}`}
          className="text-xs font-semibold text-gray-600 hover:text-purple-700 hover:underline transition-colors duration-150 inline-flex items-center gap-1 min-h-[44px] sm:min-h-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>View Patient Profile & History</span>
        </Link>

        <div>
          {!isReviewed ? (
            <Link
              href={`/review/${item.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white shadow-sm hover:bg-purple-700 active:bg-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-colors duration-150 cursor-pointer w-full sm:w-auto"
            >
              <span>Review Vitals & Set Status</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href={`/patients/${item.patient_id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-3.5 py-2 min-h-[44px] text-xs font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors duration-150 w-full sm:w-auto"
            >
              <span>Review Completed</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
