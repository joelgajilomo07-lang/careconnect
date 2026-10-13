'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitMedicalReviewAction } from '@/app/(doctor)/actions'
import type { VitalsLogDetail } from '@/services/vitalsLogsService'
import type { Database } from '@/types/database.types'
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Send,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  FileText,
  Stethoscope,
} from 'lucide-react'
import Link from 'next/link'

interface ReviewFormProps {
  vitalsLog: VitalsLogDetail
}

type PatientStatus = Database['public']['Enums']['patient_status']

export function ReviewForm({ vitalsLog }: ReviewFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Default status from current patient profile, or 'stable'
  const currentStatus = vitalsLog.patient?.patient_profile?.current_status
  const defaultStatus: PatientStatus =
    currentStatus && currentStatus !== 'unassessed' ? currentStatus : 'stable'

  const [selectedStatus, setSelectedStatus] = useState<PatientStatus>(defaultStatus)
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!feedbackNotes.trim()) {
      setErrorMessage('Please provide clinical notes or feedback before submitting.')
      return
    }

    startTransition(async () => {
      const res = await submitMedicalReviewAction({
        vitals_log_id: vitalsLog.id,
        new_status: selectedStatus,
        feedback_notes: feedbackNotes,
        is_urgent: isUrgent,
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage('Medical review submitted successfully. Status updated and notifications broadcasted.')
        setTimeout(() => {
          router.push('/triage')
          router.refresh()
        }, 1200)
      }
    })
  }

  const statusOptions: Array<{
    value: PatientStatus
    label: string
    description: string
    badgeColor: string
    borderColor: string
    icon: typeof CheckCircle2
  }> = [
    {
      value: 'stable',
      label: 'Stable',
      description: 'Vitals within expected recovery baseline. Continue standard monitoring.',
      badgeColor: 'text-[#0F766E] bg-[#2DD4BF]/10 border-[#2DD4BF]/30',
      borderColor: 'peer-checked:border-[#2DD4BF] peer-checked:bg-[#2DD4BF]/5',
      icon: CheckCircle2,
    },
    {
      value: 'warning',
      label: 'Warning',
      description: 'Borderline or elevated readings. Requires close monitoring or medication adjustment.',
      badgeColor: 'text-[#B45309] bg-[#F5A524]/10 border-[#F5A524]/30',
      borderColor: 'peer-checked:border-[#F5A524] peer-checked:bg-[#F5A524]/5',
      icon: AlertTriangle,
    },
    {
      value: 'critical',
      label: 'Critical',
      description: 'Severe decompensation or acute danger. Dispatches immediate alerts to full care team.',
      badgeColor: 'text-[#B91C1C] bg-[#F25F5C]/10 border-[#F25F5C]/30',
      borderColor: 'peer-checked:border-[#F25F5C] peer-checked:bg-[#F25F5C]/5',
      icon: AlertOctagon,
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Selection Cards */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-[#5B5FE8]" />
          <h2 className="text-lg sm:text-xl font-black text-[#1E2243]">
            1. Assign Clinical Patient Status
          </h2>
        </div>
        <p className="text-sm font-medium text-slate-500">
          This updates the official patient status badge across the entire platform and notifies the patient&apos;s care team.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {statusOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = selectedStatus === opt.value
            return (
              <label
                key={opt.value}
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 focus-within:ring-2 focus-within:ring-[#5B5FE8] focus-within:ring-offset-2 ${
                  isSelected
                    ? opt.borderColor.replace('peer-checked:', '')
                    : 'border-slate-200 hover:border-[#5B5FE8]/40 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="new_status"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => {
                    setSelectedStatus(opt.value)
                    if (opt.value === 'critical') {
                      setIsUrgent(true)
                    }
                  }}
                  className="sr-only"
                />
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border ${opt.badgeColor}`}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </span>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-[#5B5FE8] bg-[#5B5FE8]' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mt-1 font-medium">
                  {opt.description}
                </p>
              </label>
            )
          })}
        </div>

        {selectedStatus === 'critical' && (
          <div className="rounded-xl border border-[#F25F5C]/30 bg-[#FFF1F2] p-4 text-sm text-rose-950 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-[#F25F5C] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-base text-rose-950">High-Priority Alert Triggered</p>
              <p className="mt-0.5 text-rose-800 leading-relaxed font-medium">
                Critical status notifies the care team in-app across all portals. For immediate clinical response, follow standard institutional escalation protocols.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Urgent Flag Checkbox */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-[#5B5FE8] focus:ring-[#5B5FE8] focus-visible:ring-2 focus-visible:ring-[#5B5FE8] focus-visible:ring-offset-1 accent-[#5B5FE8]"
          />
          <div className="space-y-0.5">
            <span className="text-base font-bold text-[#1E2243] flex items-center gap-2">
              Flag as Urgent Escalation
              {isUrgent && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#F25F5C]/10 text-[#B91C1C] border border-[#F25F5C]/30">
                  URGENT
                </span>
              )}
            </span>
            <p className="text-sm text-slate-500 font-medium">
              Marks the review as urgent and delivers a high-priority in-app notification to the care team.
            </p>
          </div>
        </label>
      </div>

      {/* Clinical Feedback & Instructions */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#5B5FE8]" />
            <label htmlFor="feedback_notes" className="text-lg sm:text-xl font-black text-[#1E2243]">
              2. Clinical Feedback & Treatment Notes
            </label>
          </div>
          <span className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-wider">Required</span>
        </div>
        <p className="text-sm font-medium text-slate-500">
          Provide specific instructions for the care team (e.g. medication adjustment, repeat measurements, or immediate bedside protocols).
        </p>
        <textarea
          id="feedback_notes"
          rows={4}
          value={feedbackNotes}
          onChange={(e) => setFeedbackNotes(e.target.value)}
          placeholder="e.g. Blood pressure remains elevated. Recheck manual cuff reading in 30 minutes. If systolic remains >160, administer prescribed 10mg amlodipine dose."
          className="w-full rounded-xl border border-slate-200 p-4 text-sm sm:text-base text-[#1E2243] placeholder:text-slate-400 focus:border-[#5B5FE8] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/15 font-medium"
          required
        />
      </div>

      {/* Error & Success Banners */}
      {errorMessage && (
        <div className="rounded-xl border border-[#F25F5C]/30 bg-[#FFF1F2] p-4 text-sm text-rose-950 flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-[#F25F5C] shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-base text-rose-950">Review Submission Failed</p>
            <p className="text-sm text-rose-800 mt-0.5 font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-[#2DD4BF]/30 bg-[#F0FDFA] p-4 text-sm text-teal-950 flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-[#2DD4BF] shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-base text-teal-950">Success</p>
            <p className="text-sm text-teal-800 mt-0.5 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          href="/triage"
          className="inline-flex items-center gap-2 min-h-[48px] rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] transition-colors duration-150 w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel & Return to Triage
        </Link>

        <button
          type="submit"
          disabled={isPending || !feedbackNotes.trim()}
          className="inline-flex items-center gap-2 min-h-[48px] rounded-xl bg-[#5B5FE8] px-6 py-2.5 text-sm sm:text-base font-bold text-white shadow-sm shadow-[#5B5FE8]/25 hover:bg-[#4A4ED4] active:bg-[#3D41BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 w-full sm:w-auto justify-center cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Recording Clinical Review...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Confirm & Submit Review
            </>
          )}
        </button>
      </div>
    </form>
  )
}
