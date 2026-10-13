'use client'

import { useState } from 'react'
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
  ChevronDown,
  ChevronUp,
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

  // Collapsible state defaulting to true if flagged, false otherwise
  const [isOpen, setIsOpen] = useState(assessment.isFlagged)

  const isReviewed = item.medical_reviews && item.medical_reviews.length > 0
  const patientStatus = item.patient?.patient_profile?.current_status

  return (
    <div
      className={`rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md ${
        !isReviewed
          ? 'border-[#5B5FE8]/30 ring-1 ring-[#5B5FE8]/15'
          : 'border-slate-200/80'
      }`}
    >
      {/* Top Header Bar (Always Visible) */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Patient Details & Attribution */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/patients/${item.patient_id}`}
                className="text-lg sm:text-xl font-black text-[#1E2243] hover:text-[#5B5FE8] transition-colors truncate"
              >
                {item.patient?.full_name || 'Patient'}
              </Link>
              {item.patient?.patient_profile?.primary_condition && (
                <span className="text-sm text-slate-500 font-semibold">
                  • {item.patient.patient_profile.primary_condition}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-1.5 font-medium">
              <span>
                Logged by{' '}
                <span className="font-bold text-slate-700">
                  {item.caregiver?.full_name || 'Caregiver'}
                </span>
              </span>
              <span>•</span>
              <span title={format(new Date(item.logged_at), 'PPP pp')}>
                {formatDistanceToNow(new Date(item.logged_at), { addSuffix: true })}
              </span>
            </p>
          </div>

          {/* Status Badges, Compact Vitals Summary, and Action Controls */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {assessment.isFlagged && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5A524]/10 px-2.5 py-1 text-xs font-bold text-[#B45309] ring-1 ring-inset ring-[#F5A524]/30"
                  title={assessment.flags.map((f) => f.message).join('; ')}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-[#F5A524] shrink-0" />
                  <span>Flagged</span>
                </span>
              )}

              {patientStatus && (
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Status:
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                      patientStatus === 'critical'
                        ? 'bg-[#F25F5C]/10 text-[#B91C1C] ring-1 ring-inset ring-[#F25F5C]/30'
                        : patientStatus === 'warning'
                        ? 'bg-[#F5A524]/10 text-[#B45309] ring-1 ring-inset ring-[#F5A524]/30'
                        : patientStatus === 'stable'
                        ? 'bg-[#2DD4BF]/10 text-[#0F766E] ring-1 ring-inset ring-[#2DD4BF]/30'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {patientStatus}
                  </span>
                </div>
              )}

              {isReviewed ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DD4BF]/10 px-2.5 py-1 text-xs font-bold text-[#0F766E] border border-[#2DD4BF]/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>Reviewed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF0FF] px-2.5 py-1 text-xs font-bold text-[#5B5FE8] border border-[#5B5FE8]/30">
                  <Clock className="h-3.5 w-3.5 text-[#5B5FE8]" />
                  <span>Needs Review</span>
                </span>
              )}
            </div>

            {/* Quick Summary Chips */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
              <span
                className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-slate-700"
                title="Blood Pressure"
              >
                <Activity className="h-3.5 w-3.5 text-[#5B5FE8]" />
                {item.bp_systolic && item.bp_diastolic
                  ? `${item.bp_systolic}/${item.bp_diastolic}`
                  : '—'}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-slate-700"
                title="Heart Rate"
              >
                <Heart className="h-3.5 w-3.5 text-[#F25F5C]" />
                {item.heart_rate ? `${item.heart_rate} bpm` : '—'}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 border ${
                  item.spo2 !== null && item.spo2 < 95
                    ? 'bg-[#F5A524]/10 text-[#B45309] border-[#F5A524]/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200/80'
                }`}
                title="Oxygen Saturation"
              >
                <Droplets className="h-3.5 w-3.5 text-[#2DD4BF]" />
                {item.spo2 !== null ? `${item.spo2}%` : '—'}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-slate-700"
                title="Temperature"
              >
                <Thermometer className="h-3.5 w-3.5 text-[#F5A524]" />
                {item.temperature_c !== null ? `${item.temperature_c}°C` : '—'}
              </span>
            </div>

            {/* Action Buttons: Review & Accordion Toggle */}
            <div className="flex items-center gap-2">
              {!isReviewed ? (
                <Link
                  href={`/review/${item.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5B5FE8] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-[#5B5FE8]/25 hover:bg-[#4A4ED4] active:bg-[#3D41BD] transition-all"
                >
                  <span>Review</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href={`/patients/${item.patient_id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <span>Profile</span>
                  <UserCheck className="h-4 w-4 text-slate-500" />
                </Link>
              )}

              {/* Accordion Expand/Collapse Button */}
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse triage details' : 'Expand triage details'}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-slate-100 p-4 sm:p-5 pt-4 space-y-4 bg-slate-50/40">
          {/* Vitals Measurements Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Blood Pressure */}
            <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-2xs">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[#5B5FE8]" />
                Blood Pressure
              </span>
              <p className="mt-1 text-lg sm:text-xl font-black text-[#1E2243]">
                {item.bp_systolic && item.bp_diastolic ? (
                  <>
                    {item.bp_systolic}/{item.bp_diastolic}{' '}
                    <span className="text-xs sm:text-sm font-semibold text-slate-400">mmHg</span>
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>

            {/* Heart Rate */}
            <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-2xs">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-[#F25F5C]" />
                Heart Rate
              </span>
              <p className="mt-1 text-lg sm:text-xl font-black text-[#1E2243]">
                {item.heart_rate ? (
                  <>
                    {item.heart_rate}{' '}
                    <span className="text-xs sm:text-sm font-semibold text-slate-400">bpm</span>
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>

            {/* SpO2 */}
            <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-2xs">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-[#2DD4BF]" />
                Oxygen SpO2
              </span>
              <p className="mt-1 text-lg sm:text-xl font-black text-[#1E2243]">
                {item.spo2 !== null ? `${item.spo2}%` : '—'}
              </p>
            </div>

            {/* Temperature */}
            <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 shadow-2xs">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Thermometer className="h-4 w-4 text-[#F5A524]" />
                Temperature
              </span>
              <p className="mt-1 text-lg sm:text-xl font-black text-[#1E2243]">
                {item.temperature_c !== null ? `${item.temperature_c}°C` : '—'}
              </p>
            </div>
          </div>

          {/* Flagged Explanations (if any) */}
          {assessment.isFlagged && (
            <div className="rounded-xl bg-[#FFFBEB] p-4 text-sm text-amber-900 space-y-1.5 border border-[#F5A524]/30 shadow-2xs">
              <p className="font-black text-sm sm:text-base flex items-center gap-1.5 text-amber-950">
                <AlertCircle className="h-4 w-4 text-[#F5A524] shrink-0" />
                Measurements outside typical baseline:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-1 font-medium">
                {assessment.flags.map((f, i) => (
                  <li key={i}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical Notes (if logged by caregiver) */}
          {item.notes && (
            <div className="rounded-xl bg-white p-4 text-sm text-slate-700 flex items-start gap-2.5 border border-slate-200/80 shadow-2xs">
              <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#1E2243]">Caregiver observation:</span>{' '}
                <span className="italic">{item.notes}</span>
              </div>
            </div>
          )}

          {/* Bottom Actions Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/70 pt-3">
            <Link
              href={`/patients/${item.patient_id}`}
              className="text-sm font-bold text-slate-600 hover:text-[#5B5FE8] hover:underline transition-colors inline-flex items-center gap-1.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8]"
            >
              <UserCheck className="h-4 w-4 text-slate-400" />
              <span>View Patient Profile & History</span>
            </Link>

            <div>
              {!isReviewed ? (
                <Link
                  href={`/review/${item.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B5FE8] px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-[#5B5FE8]/25 hover:bg-[#4A4ED4] active:bg-[#3D41BD] transition-all w-full sm:w-auto"
                >
                  <span>Review Vitals & Set Status</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href={`/patients/${item.patient_id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors w-full sm:w-auto"
                >
                  <span>Review Completed</span>
                  <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
