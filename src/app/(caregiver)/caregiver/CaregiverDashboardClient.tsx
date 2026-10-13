'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  HeartPulse,
  Pill,
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
  Activity,
  Calendar,
  X,
  Send,
  Sparkles,
  Stethoscope,
  Info,
  Shield,
  Phone,
  Home,
  MessageSquare,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  type CaregiverDashboardData,
  type CaregiverPatientCard,
  type MedicationDueItem,
  type DoctorInstructionItem,
} from '@/app/actions/caregiverDashboard'
import { sendUrgentUpdateAction, type UrgentUpdatePayload } from '@/app/actions/urgentUpdate'

interface Props {
  initialData: CaregiverDashboardData
}

export function CaregiverDashboardClient({ initialData }: Props) {
  const router = useRouter()
  const [data, setData] = useState<CaregiverDashboardData>(initialData)
  const [isPending, startTransition] = useTransition()

  // Urgent Update Modal State (Figure 17)
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false)
  const [urgentForm, setUrgentForm] = useState<UrgentUpdatePayload>({
    patientId: initialData.patients[0]?.id || '',
    eventType: 'Fall',
    description: '',
    vitalSigns: {
      bp: '',
      heartRate: '',
      spo2: '',
      temperature: '',
    },
  })
  const [urgentFeedback, setUrgentFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleSendUrgentUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    setUrgentFeedback(null)

    const selectedPatient = data.patients.find((p) => p.id === urgentForm.patientId)
    const confirmed = window.confirm(
      `Send URGENT ALERT regarding "${selectedPatient?.full_name || 'Patient'}" to the attending physician and agency administrator?`
    )
    if (!confirmed) return

    startTransition(async () => {
      const res = await sendUrgentUpdateAction(urgentForm)
      if (res.error) {
        setUrgentFeedback({ type: 'error', message: res.error })
      } else {
        setUrgentFeedback({
          type: 'success',
          message: `Urgent alert successfully dispatched to physician and administrator at ${format(
            new Date(res.sentAt || Date.now()),
            'h:mm a'
          )}.`,
        })
        setUrgentForm({
          patientId: data.patients[0]?.id || '',
          eventType: 'Fall',
          description: '',
          vitalSigns: { bp: '', heartRate: '', spo2: '', temperature: '' },
        })
        setTimeout(() => {
          setIsUrgentModalOpen(false)
          setUrgentFeedback(null)
        }, 3000)
      }
    })
  }

  return (
    <div className="space-y-6 pb-28 sm:pb-12 max-w-5xl mx-auto">
      {/* Top Mobile-First Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1E2243] to-[#2B3060] text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">
              <span>Tender Touch Home Care Services</span>
              <span>•</span>
              <span className="text-emerald-400">Shift Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hello, {data.caregiverName}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100 mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • Dumaguete City
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/10 text-white border border-white/20">
              {data.patients.length} Assigned {data.patients.length === 1 ? 'Patient' : 'Patients'}
            </span>
          </div>
        </div>
      </div>

      {/* BIG ACTION BUTTONS (Figure 14 Required Feature) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Button 1: Submit Shift Report */}
        <Link
          href="/caregiver/shift-report"
          className="group flex items-center justify-between p-4 rounded-2xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <div className="font-extrabold text-base leading-tight">Submit Shift Report</div>
              <div className="text-xs text-indigo-100 mt-0.5">Vitals, intake, mood &amp; care</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Button 2: Record Medication */}
        <Link
          href="/caregiver/medications"
          className="group flex items-center justify-between p-4 rounded-2xl bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <div className="font-extrabold text-base leading-tight">Record Medication</div>
              <div className="text-xs text-teal-100 mt-0.5">Administer scheduled doses</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Button 3: Send Urgent Update (BIG RED BUTTON) */}
        <button
          type="button"
          onClick={() => setIsUrgentModalOpen(true)}
          className="group flex items-center justify-between p-4 rounded-2xl bg-[#F25F5C] text-white hover:bg-[#E04B48] shadow-sm transition-all active:scale-[0.98] text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform animate-pulse">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="font-extrabold text-base leading-tight">Send Urgent Update</div>
              <div className="text-xs text-rose-100 mt-0.5">Immediate alert to doctor &amp; admin</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* SECTION 1: "MY PATIENTS" CARDS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#5B5FE8]" />
            <h2 className="text-lg font-extrabold text-[#1E2243]">My Assigned Patients</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {data.patients.length} active under care
          </span>
        </div>

        {data.patients.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            <User className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-sm">No Patients Assigned</p>
            <p className="text-xs mt-1">Contact the administrator to assign patient care teams.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.patients.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#5B5FE8]/40 transition-colors space-y-4"
              >
                {/* Patient Header & Status Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-lg text-[#1E2243] leading-tight">{p.full_name}</h3>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {p.age !== null ? `${p.age} yrs old` : 'Age unrecorded'}
                    </div>
                  </div>

                  {/* Today's Shift Report Compliance Indicator */}
                  {p.todayReportSubmitted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Report Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Report Due
                    </span>
                  )}
                </div>

                {/* Diagnosis & Allergies */}
                <div className="text-xs space-y-1">
                  <div className="font-medium text-slate-700">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                      Diagnosis:
                    </span>
                    {p.diagnosis || 'No primary diagnosis entered'}
                  </div>
                  {p.allergies && (
                    <div className="pt-0.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Allergies: {p.allergies}
                      </span>
                    </div>
                  )}
                </div>

                {/* Latest Vital Signs with Red/Green Indicator */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Latest Vital Signs
                    </span>
                    {p.latestVitals ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          p.latestVitals.isNormal
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800 animate-pulse'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.latestVitals.isNormal ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        {p.latestVitals.isNormal ? 'Normal Vitals' : 'Abnormal Alert'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">No vitals yet</span>
                    )}
                  </div>

                  {p.latestVitals ? (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">BP</span>
                        <span className="font-bold text-slate-900">
                          {p.latestVitals.bp_systolic && p.latestVitals.bp_diastolic
                            ? `${p.latestVitals.bp_systolic}/${p.latestVitals.bp_diastolic}`
                            : '—'}
                        </span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">HR</span>
                        <span className="font-bold text-slate-900">
                          {p.latestVitals.heart_rate ? `${p.latestVitals.heart_rate}` : '—'}
                        </span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">SpO2</span>
                        <span
                          className={`font-bold ${
                            p.latestVitals.spo2 && p.latestVitals.spo2 < 95
                              ? 'text-rose-600 font-black'
                              : 'text-slate-900'
                          }`}
                        >
                          {p.latestVitals.spo2 ? `${p.latestVitals.spo2}%` : '—'}
                        </span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Temp</span>
                        <span className="font-bold text-slate-900">
                          {p.latestVitals.temperature_c ? `${p.latestVitals.temperature_c}°` : '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No vitals logged yet today.</p>
                  )}
                </div>

                {/* Card Quick Action Links */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs font-bold">
                  <Link
                    href={`/log-vitals?patientId=${p.id}`}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <HeartPulse className="h-3.5 w-3.5 text-[#5B5FE8]" />
                    <span>Log Vitals</span>
                  </Link>
                  <Link
                    href={`/caregiver/shift-report?patientId=${p.id}`}
                    className="flex-1 py-2 rounded-xl bg-[#EEF0FF] hover:bg-[#E0E4FF] text-[#5B5FE8] text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>Shift Report</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: MEDICATIONS DUE THIS SHIFT */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-lg font-extrabold text-[#1E2243]">Medications Due This Shift</h2>
              <p className="text-xs text-slate-500">
                Sorted by scheduled time. Tap any dose to open Medication Administration.
              </p>
            </div>
          </div>
          <Link
            href="/caregiver/medications"
            className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {data.medicationsDue.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No medication doses scheduled in the current shift.
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.medicationsDue.map((m) => (
              <Link
                key={m.id}
                href={`/caregiver/medications?patientId=${m.patient_id}`}
                className="block p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 bg-slate-50/50 hover:bg-teal-50/20 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        m.status === 'overdue'
                          ? 'bg-rose-100 text-rose-700'
                          : m.status === 'given'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      <Pill className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">{m.medication_name}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {m.dosage} ({m.route || 'Oral'}) • Patient:{' '}
                        <span className="font-bold text-slate-700">{m.patient_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900">
                      {format(new Date(m.scheduled_time), 'h:mm a')}
                    </div>
                    <div className="mt-1">
                      {m.status === 'overdue' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                          Overdue
                        </span>
                      )}
                      {m.status === 'due' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          Due
                        </span>
                      )}
                      {m.status === 'given' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Done
                        </span>
                      )}
                      {m.status === 'missed' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          Missed
                        </span>
                      )}
                      {m.status === 'refused' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          Refused
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: LATEST DOCTOR'S INSTRUCTIONS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Stethoscope className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-extrabold text-[#1E2243]">Latest Doctor&apos;s Instructions</h2>
            <p className="text-xs text-slate-500">
              Care notes and clinical directives issued for your assigned patients.
            </p>
          </div>
        </div>

        {data.doctorInstructions.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No active doctor instructions at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {data.doctorInstructions.map((n) => (
              <div
                key={n.id}
                className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-indigo-950">{n.doctor_name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-slate-700">Patient: {n.patient_name}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">{n.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* URGENT UPDATE MODAL (FIGURE 17) */}
      {/* ========================================================= */}
      {isUrgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-[#F25F5C]" />
                <div>
                  <h3 className="text-lg font-black text-rose-950">Send Urgent Patient Update</h3>
                  <p className="text-xs text-rose-700 font-medium">
                    Immediately notifies attending physician and agency administrator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUrgentModalOpen(false)
                  setUrgentFeedback(null)
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {urgentFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold border ${
                  urgentFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}
              >
                {urgentFeedback.message}
              </div>
            )}

            <form onSubmit={handleSendUrgentUpdate} className="space-y-3 text-xs">
              {/* Select Patient */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Patient *
                </label>
                <select
                  required
                  value={urgentForm.patientId}
                  onChange={(e) => setUrgentForm({ ...urgentForm, patientId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  {data.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.diagnosis || 'Active'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Type */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type of Urgent Event *
                </label>
                <select
                  required
                  value={urgentForm.eventType}
                  onChange={(e) =>
                    setUrgentForm({
                      ...urgentForm,
                      eventType: e.target.value as UrgentUpdatePayload['eventType'],
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="Fall">Fall / Trauma</option>
                  <option value="Difficulty Breathing">Difficulty Breathing / Low SpO2</option>
                  <option value="Chest Pain">Chest Pain / Cardiovascular Distress</option>
                  <option value="Loss of Consciousness">Loss of Consciousness / Syncope</option>
                  <option value="Severe Pain">Severe Acute Pain</option>
                  <option value="Other">Other Critical Medical Event</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Clinical Description &amp; Findings *
                </label>
                <textarea
                  required
                  rows={3}
                  value={urgentForm.description}
                  onChange={(e) => setUrgentForm({ ...urgentForm, description: e.target.value })}
                  placeholder="Describe patient status, time observed, immediate caregiver interventions provided..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Optional Current Vitals */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Vital Signs (Optional)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="BP (120/80)"
                    value={urgentForm.vitalSigns?.bp}
                    onChange={(e) =>
                      setUrgentForm({
                        ...urgentForm,
                        vitalSigns: { ...urgentForm.vitalSigns, bp: e.target.value },
                      })
                    }
                    className="p-2 rounded-lg border border-slate-200 text-center font-bold"
                  />
                  <input
                    type="text"
                    placeholder="HR (bpm)"
                    value={urgentForm.vitalSigns?.heartRate}
                    onChange={(e) =>
                      setUrgentForm({
                        ...urgentForm,
                        vitalSigns: { ...urgentForm.vitalSigns, heartRate: e.target.value },
                      })
                    }
                    className="p-2 rounded-lg border border-slate-200 text-center font-bold"
                  />
                  <input
                    type="text"
                    placeholder="SpO2 (%)"
                    value={urgentForm.vitalSigns?.spo2}
                    onChange={(e) =>
                      setUrgentForm({
                        ...urgentForm,
                        vitalSigns: { ...urgentForm.vitalSigns, spo2: e.target.value },
                      })
                    }
                    className="p-2 rounded-lg border border-slate-200 text-center font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Temp (°C)"
                    value={urgentForm.vitalSigns?.temperature}
                    onChange={(e) =>
                      setUrgentForm({
                        ...urgentForm,
                        vitalSigns: { ...urgentForm.vitalSigns, temperature: e.target.value },
                      })
                    }
                    className="p-2 rounded-lg border border-slate-200 text-center font-bold"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUrgentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !urgentForm.description.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#F25F5C] hover:bg-[#E04B48] text-white font-extrabold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isPending ? 'Dispatching Alert...' : 'Dispatch Urgent Alert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR (Figure 14 Required Feature) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
        <Link
          href="/caregiver"
          className="flex flex-col items-center gap-1 text-[#5B5FE8] font-bold text-[10px]"
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/log-vitals"
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-[10px]"
        >
          <HeartPulse className="h-5 w-5" />
          <span>Log Vitals</span>
        </Link>
        <Link
          href="/caregiver/shift-report"
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-[10px]"
        >
          <ClipboardList className="h-5 w-5" />
          <span>Report</span>
        </Link>
        <Link
          href="/caregiver/medications"
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-[10px]"
        >
          <Pill className="h-5 w-5" />
          <span>Meds</span>
        </Link>
        <Link
          href="/messages"
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-900 font-bold text-[10px]"
        >
          <MessageSquare className="h-5 w-5" />
          <span>Messages</span>
        </Link>
      </nav>
    </div>
  )
}
