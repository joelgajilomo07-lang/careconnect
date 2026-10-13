'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pill,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  AlertTriangle,
  User,
  Info,
  Calendar,
  Send,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  recordMedicationDoseAction,
  getMedicationAdministrationDataAction,
  type MedicationScheduleItem,
} from '@/app/actions/medicationAdministration'

interface Props {
  assignedPatients: Array<{ id: string; full_name: string; diagnosis: string | null }>
  initialPatientId: string
  initialDoses: MedicationScheduleItem[]
}

export function MedicationAdministrationClient({
  assignedPatients,
  initialPatientId,
  initialDoses,
}: Props) {
  const router = useRouter()
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId)
  const [doses, setDoses] = useState<MedicationScheduleItem[]>(initialDoses)
  const [isPending, startTransition] = useTransition()

  // Per-dose remark inputs
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [activeRemarkId, setActiveRemarkId] = useState<string | null>(null)

  // Status feedback
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handlePatientChange = async (newPatientId: string) => {
    setSelectedPatientId(newPatientId)
    setFeedback(null)
    startTransition(async () => {
      const res = await getMedicationAdministrationDataAction(newPatientId)
      if (res.doses) setDoses(res.doses)
    })
  }

  const handleRecordDose = async (
    logId: string,
    status: 'given' | 'missed' | 'refused'
  ) => {
    const remarkText = remarks[logId]?.trim() || ''

    if ((status === 'missed' || status === 'refused') && !remarkText) {
      setActiveRemarkId(logId)
      setFeedback({
        type: 'error',
        message: `A reason/remark is mandatory when recording a dose as "${status.toUpperCase()}". Please enter remark below.`,
      })
      return
    }

    setFeedback(null)
    startTransition(async () => {
      const res = await recordMedicationDoseAction({
        logId,
        status,
        remarks: remarkText,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        const notifNote =
          status === 'missed' || status === 'refused'
            ? ` Status recorded as ${status.toUpperCase()} and urgent notification delivered to attending physician.`
            : ' Recorded as GIVEN.'
        setFeedback({
          type: 'success',
          message: `Dose updated successfully.${notifNote}`,
        })

        // Refresh data
        const refreshed = await getMedicationAdministrationDataAction(selectedPatientId)
        if (refreshed.doses) setDoses(refreshed.doses)
        setActiveRemarkId(null)
      }
    })
  }

  const selectedPatient = assignedPatients.find((p) => p.id === selectedPatientId)

  return (
    <div className="space-y-6 pb-28 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <Link
            href="/caregiver"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5B5FE8] transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Caregiver Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1E2243] tracking-tight">
              Medication Administration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
              Figure 16
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Tender Touch Home Care Services – Bedside Scheduled Dose Administration
          </p>
        </div>

        {/* Patient Switcher */}
        <div className="min-w-[200px]">
          <select
            value={selectedPatientId}
            onChange={(e) => handlePatientChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white shadow-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            {assignedPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.diagnosis || 'Active'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p>{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Patient Demographic Banner */}
      {selectedPatient && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
              Active Patient Record
            </span>
            <span className="text-base font-black text-slate-900">
              {selectedPatient.full_name}
            </span>
            <span className="text-slate-600 font-medium ml-2">
              • {selectedPatient.diagnosis || 'Home Care Monitoring'}
            </span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-100 text-teal-800">
            {doses.length} {doses.length === 1 ? 'Dose' : 'Doses'} Scheduled
          </span>
        </div>
      )}

      {/* SCHEDULED DOSES LIST */}
      <div className="space-y-4">
        {doses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs">
            <Pill className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-600">No Doses Scheduled</p>
            <p className="mt-0.5">
              No medications scheduled for this patient in the current shift window.
            </p>
          </div>
        ) : (
          doses.map((dose) => {
            const isRecorded =
              dose.status === 'given' || dose.status === 'missed' || dose.status === 'refused'

            return (
              <div
                key={dose.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs space-y-4 transition-all ${
                  dose.status === 'overdue'
                    ? 'border-rose-300 ring-2 ring-rose-100'
                    : isRecorded
                    ? 'border-slate-200 bg-slate-50/40'
                    : 'border-slate-200'
                }`}
              >
                {/* Dose Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        dose.status === 'overdue'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : dose.status === 'given'
                          ? 'bg-emerald-100 text-emerald-700'
                          : dose.status === 'missed'
                          ? 'bg-amber-100 text-amber-700'
                          : dose.status === 'refused'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      <Pill className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-base text-slate-900">{dose.name}</h3>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {dose.dosage} • Route: {dose.route || 'Oral'}
                      </p>
                      {dose.instructions && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          Instructions: {dose.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs font-black text-slate-900 justify-end">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{format(new Date(dose.scheduled_time), 'h:mm a')}</span>
                    </div>

                    <div className="mt-1">
                      {dose.status === 'overdue' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                          Overdue &gt;60m
                        </span>
                      )}
                      {dose.status === 'due' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          Due This Shift
                        </span>
                      )}
                      {dose.status === 'given' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Given
                        </span>
                      )}
                      {dose.status === 'missed' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-300">
                          Missed Dose
                        </span>
                      )}
                      {dose.status === 'refused' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-800 border border-rose-300">
                          Patient Refused
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* If already recorded, show administration summary */}
                {isRecorded ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs flex items-center justify-between text-slate-600">
                    <div>
                      <span className="font-bold text-slate-700">Administered At: </span>
                      {dose.administered_at
                        ? format(new Date(dose.administered_at), 'MMMM d, h:mm a')
                        : 'Recorded'}
                      {dose.remarks && (
                        <div className="mt-0.5 text-slate-500 italic">
                          Remark: &quot;{dose.remarks}&quot;
                        </div>
                      )}
                    </div>
                    {dose.caregiver_name && (
                      <span className="text-[11px] font-medium text-slate-500">
                        By {dose.caregiver_name}
                      </span>
                    )}
                  </div>
                ) : (
                  /* Action Controls for unrecorded dose */
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {/* Optional Remark Input */}
                    <div>
                      <input
                        type="text"
                        placeholder="Optional remarks (Mandatory if Missed or Refused)..."
                        value={remarks[dose.id] || ''}
                        onChange={(e) =>
                          setRemarks({ ...remarks, [dose.id]: e.target.value })
                        }
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium text-slate-900 ${
                          activeRemarkId === dose.id
                            ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/20'
                            : 'border-slate-200'
                        }`}
                      />
                    </div>

                    {/* Three Action Buttons: Given (green), Missed (amber), Refused (red) */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Given (Green) */}
                      <button
                        type="button"
                        onClick={() => handleRecordDose(dose.id, 'given')}
                        disabled={isPending}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Given</span>
                      </button>

                      {/* Missed (Amber) */}
                      <button
                        type="button"
                        onClick={() => handleRecordDose(dose.id, 'missed')}
                        disabled={isPending}
                        className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>Missed</span>
                      </button>

                      {/* Refused (Red) */}
                      <button
                        type="button"
                        onClick={() => handleRecordDose(dose.id, 'refused')}
                        disabled={isPending}
                        className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Refused</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
