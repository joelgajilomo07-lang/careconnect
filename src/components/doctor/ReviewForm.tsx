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
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      borderColor: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50/40',
      icon: CheckCircle2,
    },
    {
      value: 'warning',
      label: 'Warning',
      description: 'Borderline or elevated readings. Requires close monitoring or medication adjustment.',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
      borderColor: 'peer-checked:border-amber-500 peer-checked:bg-amber-50/40',
      icon: AlertTriangle,
    },
    {
      value: 'critical',
      label: 'Critical',
      description: 'Severe decompensation or acute danger. Dispatches immediate alerts to full care team.',
      badgeColor: 'text-red-700 bg-red-50 border-red-200',
      borderColor: 'peer-checked:border-red-500 peer-checked:bg-red-50/40',
      icon: AlertOctagon,
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Selection Cards */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-purple-600" />
          <h2 className="text-base font-bold text-gray-900">
            1. Assign Clinical Patient Status
          </h2>
        </div>
        <p className="text-xs text-gray-500">
          This updates the official patient status badge across the entire platform and notifies the patient&apos;s care team.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {statusOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = selectedStatus === opt.value
            return (
              <label
                key={opt.value}
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${
                  isSelected
                    ? opt.borderColor.replace('peer-checked:', '')
                    : 'border-gray-200 hover:border-purple-300 bg-white'
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
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${opt.badgeColor}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </span>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mt-1">
                  {opt.description}
                </p>
              </label>
            )
          })}
        </div>

        {selectedStatus === 'critical' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">High-Priority Alert Triggered</p>
              <p className="mt-0.5 text-red-700 leading-relaxed">
                Critical status notifies the care team in-app across all portals. For immediate clinical response, follow standard institutional escalation protocols.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Urgent Flag Checkbox */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1"
          />
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              Flag as Urgent Escalation
              {isUrgent && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                  URGENT
                </span>
              )}
            </span>
            <p className="text-xs text-gray-500">
              Marks the review as urgent and delivers a high-priority in-app notification to the care team.
            </p>
          </div>
        </label>
      </div>

      {/* Clinical Feedback & Instructions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <label htmlFor="feedback_notes" className="text-base font-bold text-gray-900">
              2. Clinical Feedback & Treatment Notes
            </label>
          </div>
          <span className="text-xs text-gray-400">Required</span>
        </div>
        <p className="text-xs text-gray-500">
          Provide specific instructions for the care team (e.g. medication adjustment, repeat measurements, or immediate bedside protocols).
        </p>
        <textarea
          id="feedback_notes"
          rows={4}
          value={feedbackNotes}
          onChange={(e) => setFeedbackNotes(e.target.value)}
          placeholder="e.g. Blood pressure remains elevated. Recheck manual cuff reading in 30 minutes. If systolic remains >160, administer prescribed 10mg amlodipine dose."
          className="w-full rounded-xl border border-gray-300 p-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          required
        />
      </div>

      {/* Error & Success Banners */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Review Submission Failed</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-xs mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          href="/triage"
          className="inline-flex items-center gap-2 min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors duration-150 w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel & Return to Triage
        </Link>

        <button
          type="submit"
          disabled={isPending || !feedbackNotes.trim()}
          className="inline-flex items-center gap-2 min-h-[48px] rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 active:bg-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 w-full sm:w-auto justify-center"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording Clinical Review...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Confirm & Submit Review
            </>
          )}
        </button>
      </div>
    </form>
  )
}
