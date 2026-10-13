'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  Heart,
  Droplets,
  Thermometer,
  Wind,
  Pill,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  XCircle,
  Save,
  MessageSquare,
  Sparkles,
  Check,
  Send,
  CalendarDays,
  ListFilter,
  CheckCheck,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import type {
  PatientClinicalDetails,
  ClinicalVitalsLog,
  VitalSignThresholds,
  ShiftReportSummary,
  MedicationItem,
  CareNoteItem,
  AppointmentItem,
} from '@/app/actions/doctorClinical'
import {
  saveCareNoteAction,
  updateVitalSignThresholdsAction,
  saveMedicationScheduleAction,
  discontinueMedicationAction,
  saveAppointmentAction,
  getPatientClinicalDataAction,
} from '@/app/actions/doctorClinical'

interface Props {
  initialData: PatientClinicalDetails
  readOnly?: boolean // True for Family and Patient portals
  portalRole?: 'doctor' | 'family' | 'patient' | 'admin'
}

type TabKey = 'trends' | 'notes_thresholds' | 'meds_followup'
type VitalMetric = 'all' | 'bp' | 'pulse' | 'spo2' | 'temp' | 'resp' | 'glucose'

export function PatientHealthStatusView({
  initialData,
  readOnly = false,
  portalRole = 'doctor',
}: Props) {
  const [data, setData] = useState<PatientClinicalDetails>(initialData)
  const [activeTab, setActiveTab] = useState<TabKey>('trends')
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7) // 7, 14, 30, 0 = all
  const [activeMetric, setActiveMetric] = useState<VitalMetric>('all')
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({})

  const [isPending, startTransition] = useTransition()
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // -------------------------
  // Care Notes State
  // -------------------------
  const [newNoteText, setNewNoteText] = useState('')
  const [newNotePriority, setNewNotePriority] = useState<'routine' | 'important'>('routine')

  // -------------------------
  // Thresholds State
  // -------------------------
  const [thresholdsForm, setThresholdsForm] = useState<VitalSignThresholds>(initialData.thresholds)

  // -------------------------
  // Medication Form State
  // -------------------------
  const [medName, setMedName] = useState('')
  const [medDosage, setMedDosage] = useState('')
  const [medRoute, setMedRoute] = useState('Oral')
  const [medFreq, setMedFreq] = useState('Every 8 hours')
  const [medTimes, setMedTimes] = useState<string[]>(['08:00', '16:00', '00:00'])
  const [medStartDate, setMedStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [medEndDate, setMedEndDate] = useState('')
  const [medInstructions, setMedInstructions] = useState('')
  const [showAddMed, setShowAddMed] = useState(false)

  // -------------------------
  // Appointment Form State
  // -------------------------
  const [apptType, setApptType] = useState<'check-up' | 'laboratory' | 'therapy' | 'other'>('check-up')
  const [apptDate, setApptDate] = useState('')
  const [apptLocation, setApptLocation] = useState('Tender Touch Dumaguete Clinic')
  const [apptNotes, setApptNotes] = useState('')
  const [showAddAppt, setShowAddAppt] = useState(false)
  const [apptViewMode, setApptViewMode] = useState<'list' | 'calendar'>('list')

  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setActionError(msg)
      setTimeout(() => setActionError(null), 5000)
    } else {
      setActionSuccess(msg)
      setTimeout(() => setActionSuccess(null), 5000)
    }
  }

  // Reload period data
  const handlePeriodChange = (days: number) => {
    setSelectedPeriod(days)
    startTransition(async () => {
      const res = await getPatientClinicalDataAction(data.patient.id, days)
      if (res.data) {
        setData(res.data)
      }
    })
  }

  // Toggle shift report expansion
  const toggleReport = (id: string) => {
    setExpandedReports((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Submit Care Note
  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteText.trim()) return

    startTransition(async () => {
      const res = await saveCareNoteAction(data.patient.id, newNoteText, newNotePriority)
      if (res.success) {
        setNewNoteText('')
        showToast('Care note saved and dispatched to assigned caregivers.')
        // Refresh clinical data
        const refreshed = await getPatientClinicalDataAction(data.patient.id, selectedPeriod)
        if (refreshed.data) setData(refreshed.data)
      } else {
        showToast(res.error || 'Failed to save care note', true)
      }
    })
  }

  // Submit Thresholds
  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateVitalSignThresholdsAction(data.patient.id, {
        bp_systolic_min: thresholdsForm.bp_systolic_min,
        bp_systolic_max: thresholdsForm.bp_systolic_max,
        bp_diastolic_min: thresholdsForm.bp_diastolic_min,
        bp_diastolic_max: thresholdsForm.bp_diastolic_max,
        pulse_rate_min: thresholdsForm.pulse_rate_min,
        pulse_rate_max: thresholdsForm.pulse_rate_max,
        respiratory_rate_min: thresholdsForm.respiratory_rate_min,
        respiratory_rate_max: thresholdsForm.respiratory_rate_max,
        temperature_min: thresholdsForm.temperature_min,
        temperature_max: thresholdsForm.temperature_max,
        spo2_min: thresholdsForm.spo2_min,
        spo2_max: thresholdsForm.spo2_max,
        blood_glucose_min: thresholdsForm.blood_glucose_min,
        blood_glucose_max: thresholdsForm.blood_glucose_max,
      })

      if (res.success) {
        showToast('Clinical thresholds updated and recorded in audit log.')
        const refreshed = await getPatientClinicalDataAction(data.patient.id, selectedPeriod)
        if (refreshed.data) {
          setData(refreshed.data)
          setThresholdsForm(refreshed.data.thresholds)
        }
      } else {
        showToast(res.error || 'Failed to update thresholds', true)
      }
    })
  }

  // Submit Medication Schedule
  const handleSaveMedication = (e: React.FormEvent) => {
    e.preventDefault()
    if (!medName || !medDosage) return

    startTransition(async () => {
      const res = await saveMedicationScheduleAction({
        patientId: data.patient.id,
        name: medName,
        dosage: medDosage,
        route: medRoute,
        frequency: medFreq,
        scheduleTimes: medTimes,
        startDate: medStartDate,
        endDate: medEndDate || undefined,
        instructions: medInstructions || undefined,
      })

      if (res.success) {
        showToast('Medication prescribed and schedule generated for caregivers.')
        setMedName('')
        setMedDosage('')
        setMedInstructions('')
        setShowAddMed(false)
        const refreshed = await getPatientClinicalDataAction(data.patient.id, selectedPeriod)
        if (refreshed.data) setData(refreshed.data)
      } else {
        showToast(res.error || 'Failed to prescribe medication', true)
      }
    })
  }

  // Discontinue Medication
  const handleDiscontinueMed = (medId: string, medName: string) => {
    const reason = window.prompt(`Reason for discontinuing ${medName}:`, 'Course completed / Doctor reassessment')
    if (!reason) return

    startTransition(async () => {
      const res = await discontinueMedicationAction(medId, reason)
      if (res.success) {
        showToast(`${medName} discontinued.`)
        const refreshed = await getPatientClinicalDataAction(data.patient.id, selectedPeriod)
        if (refreshed.data) setData(refreshed.data)
      } else {
        showToast(res.error || 'Failed to discontinue medication', true)
      }
    })
  }

  // Submit Appointment
  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!apptDate) return

    startTransition(async () => {
      const res = await saveAppointmentAction({
        patientId: data.patient.id,
        type: apptType,
        appointmentDate: new Date(apptDate).toISOString(),
        location: apptLocation,
        notes: apptNotes || undefined,
      })

      if (res.success) {
        showToast('Follow-up appointment booked and reminders sent.')
        setApptDate('')
        setApptNotes('')
        setShowAddAppt(false)
        const refreshed = await getPatientClinicalDataAction(data.patient.id, selectedPeriod)
        if (refreshed.data) setData(refreshed.data)
      } else {
        showToast(res.error || 'Failed to schedule appointment', true)
      }
    })
  }

  // Prepare chronological chart points
  const chartPoints = useMemo(() => {
    return [...data.vitalsLogs]
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((v) => {
        const d = new Date(v.logged_at)
        return {
          id: v.id,
          timeLabel: format(d, 'MMM dd, HH:mm'),
          shortTime: format(d, 'MM/dd HH:mm'),
          bp_systolic: v.bp_systolic,
          bp_diastolic: v.bp_diastolic,
          heart_rate: v.heart_rate,
          respiratory_rate: v.respiratory_rate,
          temperature_c: v.temperature_c,
          spo2: v.spo2,
          blood_glucose: v.blood_glucose,
          isOutOfRange: v.isOutOfRange,
        }
      })
  }, [data.vitalsLogs])

  const t = data.thresholds
  const p = data.patient
  const latest = data.latestVitals

  // Custom Dot renderer highlighting out-of-range points in vivid RED
  const renderOutOfRangeDot = (key: keyof ClinicalVitalsLog['isOutOfRange'], strokeColor: string) => {
    return (props: any) => {
      const { cx, cy, payload } = props
      if (!cx || !cy) return null
      const isOut = payload?.isOutOfRange?.[key]

      if (isOut) {
        return (
          <g key={`dot-out-${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={6} fill="#F25F5C" stroke="#FFFFFF" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={9} fill="none" stroke="#F25F5C" strokeWidth={1.5} opacity={0.6} />
          </g>
        )
      }

      return <circle key={`dot-in-${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill={strokeColor} stroke="#FFFFFF" strokeWidth={1} />
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6">
      {/* Toast Alert Banner */}
      {actionSuccess && (
        <div className="rounded-xl bg-[#0F766E]/10 border border-[#2DD4BF]/30 p-3.5 flex items-center gap-3 text-sm font-bold text-[#0F766E] animate-fade-in shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-[#2DD4BF] shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl bg-[#FFF1F2] border border-[#F25F5C]/30 p-3.5 flex items-center gap-3 text-sm font-bold text-[#B91C1C] animate-fade-in shadow-sm">
          <AlertCircle className="h-5 w-5 text-[#F25F5C] shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={portalRole === 'doctor' ? '/doctor' : portalRole === 'family' ? '/family' : '/patient'}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#5B5FE8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {portalRole === 'doctor' ? 'Physician Dashboard' : 'Dashboard'}
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/messages?patientId=${p.id}`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#1E2243] hover:border-[#5B5FE8] shadow-sm transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#5B5FE8]" />
            Message Care Team
          </Link>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
            RA 10173 Protected
          </span>
        </div>
      </div>

      {/* Patient Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#EEF0FF] text-[#5B5FE8] flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
              {p.full_name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-[#1E2243] tracking-tight">
                  {p.full_name}
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {p.age !== null ? `${p.age} years old` : 'Age unrecorded'}
                </span>
                {p.birth_date && (
                  <span className="text-xs text-slate-400">
                    DOB: {format(new Date(p.birth_date), 'MMM dd, yyyy')}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-600">
                Primary Diagnosis: <span className="text-[#1E2243] font-bold">{p.diagnosis || 'General Home Care'}</span>
              </p>
            </div>
          </div>

          {/* Allergies Highlight Banner */}
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            {p.allergies ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FFF1F2] border border-[#F25F5C]/40 text-xs font-black text-[#B91C1C] shadow-sm animate-pulse">
                <ShieldAlert className="h-4 w-4 text-[#F25F5C]" />
                <span>ALLERGIES: {p.allergies}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg">
                No Known Drug Allergies
              </span>
            )}
            <div className="text-xs text-slate-500 font-medium text-right">
              Attending: <strong className="text-slate-800 font-bold">{p.primaryDoctor || 'Dr. Roberto Mendoza'}</strong>
            </div>
          </div>
        </div>

        {/* Care Team and Clinical Context Summary */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-600 pt-1 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Assigned Caregivers:</span>
            <span>{p.caregivers.length > 0 ? p.caregivers.join(', ') : 'None assigned'}</span>
          </div>
          {p.medical_history && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="font-bold">Medical History:</span>
              <span className="italic">{p.medical_history}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'trends'
              ? 'bg-[#1E2243] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-[#1E2243]'
          }`}
        >
          <Activity className="h-4 w-4" />
          Health Status & Vital Trends
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes_thresholds')}
          className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'notes_thresholds'
              ? 'bg-[#1E2243] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-[#1E2243]'
          }`}
        >
          <FileText className="h-4 w-4" />
          Care Notes & Thresholds
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('meds_followup')}
          className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'meds_followup'
              ? 'bg-[#1E2243] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-[#1E2243]'
          }`}
        >
          <Pill className="h-4 w-4" />
          Medication Schedule & Follow-up
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HEALTH STATUS & VITAL-SIGN TRENDS (FIGURE 19)                      */}
      {/* ========================================================================= */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Latest Vital Signs Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#1E2243] flex items-center gap-2">
                <Heart className="h-5 w-5 text-[#F25F5C]" />
                Latest Vital Signs
              </h2>
              {latest?.logged_at && (
                <span className="text-xs text-slate-500 font-medium">
                  Recorded {format(new Date(latest.logged_at), 'MMM dd, yyyy · HH:mm')} by {latest.caregiver_name}
                </span>
              )}
            </div>

            {latest ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* Blood Pressure */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  latest.isOutOfRange.bp_systolic || latest.isOutOfRange.bp_diastolic
                    ? 'border-[#F25F5C] bg-[#FFF1F2]/60 ring-1 ring-[#F25F5C]/30'
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Blood Pressure</span>
                    {latest.isOutOfRange.bp_systolic || latest.isOutOfRange.bp_diastolic ? (
                      <span className="h-2 w-2 rounded-full bg-[#F25F5C] animate-pulse" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#1E2243] mt-2">
                    {latest.bp_systolic && latest.bp_diastolic
                      ? `${latest.bp_systolic}/${latest.bp_diastolic}`
                      : '—'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-semibold">
                    <span>mmHg</span>
                    <span>{t.bp_systolic_min}-{t.bp_systolic_max}/{t.bp_diastolic_min}-{t.bp_diastolic_max}</span>
                  </div>
                </div>

                {/* Pulse / Heart Rate */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  latest.isOutOfRange.heart_rate
                    ? 'border-[#F25F5C] bg-[#FFF1F2]/60 ring-1 ring-[#F25F5C]/30'
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Pulse Rate</span>
                    {latest.isOutOfRange.heart_rate ? (
                      <span className="h-2 w-2 rounded-full bg-[#F25F5C] animate-pulse" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#1E2243] mt-2">
                    {latest.heart_rate ?? '—'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-semibold">
                    <span>bpm</span>
                    <span>{t.pulse_rate_min}-{t.pulse_rate_max}</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  latest.isOutOfRange.spo2
                    ? 'border-[#F25F5C] bg-[#FFF1F2]/60 ring-1 ring-[#F25F5C]/30'
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">SpO2</span>
                    {latest.isOutOfRange.spo2 ? (
                      <span className="h-2 w-2 rounded-full bg-[#F25F5C] animate-pulse" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
                    )}
                  </div>
                  <div className={`text-xl sm:text-2xl font-black mt-2 ${
                    latest.isOutOfRange.spo2 ? 'text-[#B91C1C]' : 'text-[#1E2243]'
                  }`}>
                    {latest.spo2 ? `${latest.spo2}%` : '—'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-semibold">
                    <span>O2 sat</span>
                    <span>&ge; {t.spo2_min}%</span>
                  </div>
                </div>

                {/* Temperature */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  latest.isOutOfRange.temperature_c
                    ? 'border-[#F25F5C] bg-[#FFF1F2]/60 ring-1 ring-[#F25F5C]/30'
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Temperature</span>
                    {latest.isOutOfRange.temperature_c ? (
                      <span className="h-2 w-2 rounded-full bg-[#F25F5C] animate-pulse" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#1E2243] mt-2">
                    {latest.temperature_c ? `${latest.temperature_c}°C` : '—'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-semibold">
                    <span>celsius</span>
                    <span>{t.temperature_min}-{t.temperature_max}°C</span>
                  </div>
                </div>

                {/* Respiratory Rate */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  latest.isOutOfRange.respiratory_rate
                    ? 'border-[#F25F5C] bg-[#FFF1F2]/60 ring-1 ring-[#F25F5C]/30'
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Resp Rate</span>
                    {latest.isOutOfRange.respiratory_rate ? (
                      <span className="h-2 w-2 rounded-full bg-[#F25F5C] animate-pulse" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#1E2243] mt-2">
                    {latest.respiratory_rate ?? '—'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-semibold">
                    <span>cpm</span>
                    <span>{t.respiratory_rate_min}-{t.respiratory_rate_max}</span>
                  </div>
                </div>

                {/* Blood Glucose */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  latest.isOutOfRange.blood_glucose
                    ? 'border-[#F25F5C] bg-[#FFF1F2]/60 ring-1 ring-[#F25F5C]/30'
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Glucose</span>
                    {latest.isOutOfRange.blood_glucose ? (
                      <span className="h-2 w-2 rounded-full bg-[#F25F5C] animate-pulse" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#1E2243] mt-2">
                    {latest.blood_glucose ? `${latest.blood_glucose}` : '—'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-semibold">
                    <span>mg/dL</span>
                    <span>{t.blood_glucose_min}-{t.blood_glucose_max}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center text-slate-400">
                No vitals logged yet for this patient.
              </div>
            )}
          </div>

          {/* Vitals Charts Section with Shaded Bands and Red Out-of-Range Points */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#5B5FE8]" />
                  Vital Sign Trend Curves
                </h3>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                  Green shaded areas represent clinical normal threshold bands. Out-of-range readings plotted in red.
                </p>
              </div>

              {/* Period Selectors */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => handlePeriodChange(7)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPeriod === 7 ? 'bg-white text-[#1E2243] shadow-sm font-black' : 'text-slate-600'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange(14)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPeriod === 14 ? 'bg-white text-[#1E2243] shadow-sm font-black' : 'text-slate-600'
                  }`}
                >
                  14 Days
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange(30)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPeriod === 30 ? 'bg-white text-[#1E2243] shadow-sm font-black' : 'text-slate-600'
                  }`}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange(0)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPeriod === 0 ? 'bg-white text-[#1E2243] shadow-sm font-black' : 'text-slate-600'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1 text-xs font-bold">
              {[
                { id: 'all', label: 'Overview' },
                { id: 'bp', label: 'Blood Pressure' },
                { id: 'pulse', label: 'Pulse Rate' },
                { id: 'spo2', label: 'Oxygen Saturation (SpO2)' },
                { id: 'temp', label: 'Temperature' },
                { id: 'resp', label: 'Respiratory Rate' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMetric(m.id as VitalMetric)}
                  className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                    activeMetric === m.id
                      ? 'bg-[#EEF0FF] border-[#5B5FE8] text-[#5B5FE8]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Chart Container */}
            {chartPoints.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Activity className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No vitals logs recorded in selected period</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Blood Pressure Chart */}
                {(activeMetric === 'all' || activeMetric === 'bp') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Blood Pressure (Systolic & Diastolic) · Target: {t.bp_systolic_min}-{t.bp_systolic_max}/{t.bp_diastolic_min}-{t.bp_diastolic_max} mmHg</span>
                      <span className="text-slate-400 font-normal">Shaded band = Normal Range</span>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="shortTime" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis domain={[50, 180]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <Tooltip />
                          {/* Shaded Acceptable Band for Systolic */}
                          <ReferenceArea y1={t.bp_systolic_min} y2={t.bp_systolic_max} fill="#2DD4BF" fillOpacity={0.12} />
                          {/* Shaded Acceptable Band for Diastolic */}
                          <ReferenceArea y1={t.bp_diastolic_min} y2={t.bp_diastolic_max} fill="#5B5FE8" fillOpacity={0.08} />
                          <Line
                            type="monotone"
                            dataKey="bp_systolic"
                            name="BP Systolic (mmHg)"
                            stroke="#5B5FE8"
                            strokeWidth={2.5}
                            dot={renderOutOfRangeDot('bp_systolic', '#5B5FE8')}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="bp_diastolic"
                            name="BP Diastolic (mmHg)"
                            stroke="#818CF8"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            dot={renderOutOfRangeDot('bp_diastolic', '#818CF8')}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 2. Pulse / Heart Rate Chart */}
                {(activeMetric === 'all' || activeMetric === 'pulse') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Pulse Rate · Target: {t.pulse_rate_min}-{t.pulse_rate_max} bpm</span>
                      <span className="text-slate-400 font-normal">Shaded band = Normal Range</span>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="shortTime" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis domain={[40, 140]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <Tooltip />
                          <ReferenceArea y1={t.pulse_rate_min} y2={t.pulse_rate_max} fill="#2DD4BF" fillOpacity={0.12} />
                          <Line
                            type="monotone"
                            dataKey="heart_rate"
                            name="Pulse Rate (bpm)"
                            stroke="#F25F5C"
                            strokeWidth={2.5}
                            dot={renderOutOfRangeDot('heart_rate', '#F25F5C')}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 3. SpO2 Chart */}
                {(activeMetric === 'all' || activeMetric === 'spo2') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>SpO2 Oxygen Saturation · Target: &ge; {t.spo2_min}%</span>
                      <span className="text-slate-400 font-normal">Shaded band = Normal Range</span>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="shortTime" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis domain={[80, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <Tooltip />
                          <ReferenceArea y1={t.spo2_min} y2={100} fill="#2DD4BF" fillOpacity={0.14} />
                          <Line
                            type="monotone"
                            dataKey="spo2"
                            name="SpO2 (%)"
                            stroke="#0D9488"
                            strokeWidth={2.5}
                            dot={renderOutOfRangeDot('spo2', '#0D9488')}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 4. Temperature Chart */}
                {(activeMetric === 'all' || activeMetric === 'temp') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Body Temperature · Target: {t.temperature_min}-{t.temperature_max}°C</span>
                      <span className="text-slate-400 font-normal">Shaded band = Normal Range</span>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="shortTime" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis domain={[35, 40]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <Tooltip />
                          <ReferenceArea y1={t.temperature_min} y2={t.temperature_max} fill="#2DD4BF" fillOpacity={0.12} />
                          <Line
                            type="monotone"
                            dataKey="temperature_c"
                            name="Temperature (°C)"
                            stroke="#F5A524"
                            strokeWidth={2.5}
                            dot={renderOutOfRangeDot('temperature_c', '#F5A524')}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Below the Charts: Shift Reports, Medication Compliance & Care Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Recent Shift Reports (Expandable) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base sm:text-lg font-black text-[#1E2243] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#5B5FE8]" />
                  Recent Shift Reports ({data.shiftReports.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium">Click to view 8-section notes</span>
              </div>

              {data.shiftReports.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center font-medium">No shift reports submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.shiftReports.map((sr) => {
                    const isExpanded = !!expandedReports[sr.id]
                    return (
                      <div
                        key={sr.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleReport(sr.id)}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-[#1E2243] bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sr.shift} Shift
                              </span>
                              <span className="text-xs text-slate-500">
                                {format(new Date(sr.submitted_at), 'MMM dd, yyyy · HH:mm')}
                              </span>
                              {sr.incidents && (
                                <span className="text-[10px] font-black text-[#B91C1C] bg-[#FFF1F2] px-2 py-0.5 rounded border border-[#F25F5C]/40">
                                  Incident
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-slate-700 mt-1">
                              General Condition: <span className="font-medium text-slate-600">{sr.general_condition || 'Stable'}</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              Logged by: <span className="font-semibold text-slate-600">{sr.caregiver_name}</span>
                            </p>
                          </div>

                          <div className="text-slate-400 p-1">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>

                        {/* Expanded 8 Sections */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-3 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-0.5">Activities & Daily Care:</span>
                                <span className="text-slate-600">{sr.activities_care || 'Assisted with daily hygiene, bath, and repositioning.'}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-0.5">Food & Fluid Intake:</span>
                                <span className="text-slate-600">{sr.food_fluid_intake || 'Adequate meal intake; 1500ml oral fluids.'}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-0.5">Elimination:</span>
                                <span className="text-slate-600">{sr.elimination || 'Normal output; no catheter complications.'}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-0.5">Sleep & Rest:</span>
                                <span className="text-slate-600">{sr.sleep || 'Rested peacefully during intervals.'}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-0.5">Behavior & Mood:</span>
                                <span className="text-slate-600">{sr.behavior_mood || 'Calm, cooperative, alert.'}</span>
                              </div>
                              {sr.incidents && (
                                <div className="bg-[#FFF1F2] p-2.5 rounded-lg border border-[#F25F5C]/30 text-[#B91C1C]">
                                  <span className="font-bold block mb-0.5">Incident Details:</span>
                                  <span>{sr.incident_description || 'Unspecified incident flagged during shift.'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Medication Compliance Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base sm:text-lg font-black text-[#1E2243] flex items-center gap-2">
                    <Pill className="h-5 w-5 text-[#5B5FE8]" />
                    Medication Compliance
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    Past {selectedPeriod > 0 ? `${selectedPeriod} Days` : 'Period'}
                  </span>
                </div>

                {/* Score Dial */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-black text-[#1E2243]">
                      {data.medicationCompliance.complianceRate}%
                    </span>
                    <span className="text-xs text-slate-500 block font-semibold mt-0.5">
                      Compliance Score
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs font-bold">
                    <span className="text-[#0F766E]">{data.medicationCompliance.givenCount} Doses Given</span>
                    <span className="text-[#F5A524]">{data.medicationCompliance.missedCount} Missed</span>
                    <span className="text-[#B91C1C]">{data.medicationCompliance.refusedCount} Refused</span>
                  </div>
                </div>

                {/* Abnormal Doses List */}
                <div className="mt-4 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Missed or Refused Doses:
                  </span>
                  {data.medicationCompliance.abnormalDoses.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      <CheckCheck className="h-6 w-6 mx-auto text-[#2DD4BF] mb-1" />
                      100% On-Time Dose Compliance
                    </div>
                  ) : (
                    data.medicationCompliance.abnormalDoses.map((dose) => (
                      <div
                        key={dose.id}
                        className={`p-2.5 rounded-lg border text-xs space-y-0.5 ${
                          dose.status === 'refused'
                            ? 'bg-[#FFF1F2] border-[#F25F5C]/30 text-[#B91C1C]'
                            : 'bg-[#FFFBEB] border-[#F5A524]/30 text-[#B45309]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{dose.medication_name} ({dose.dosage})</span>
                          <span className="uppercase font-black text-[10px] px-1.5 py-0.5 rounded bg-white">
                            {dose.status}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90">
                          {format(new Date(dose.scheduled_time), 'MMM dd, HH:mm')} · Caregiver: {dose.caregiver_name}
                        </p>
                        {dose.remarks && (
                          <p className="text-[11px] italic mt-0.5">
                            Reason: &ldquo;{dose.remarks}&rdquo;
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Link to Medication Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('meds_followup')}
                className="w-full mt-4 py-2 text-xs font-bold text-[#5B5FE8] bg-[#EEF0FF] hover:bg-[#E0E4FC] rounded-xl transition-colors text-center"
              >
                View Full Medication Schedule &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CARE NOTES & VITAL-SIGN THRESHOLDS (FIGURE 20)                     */}
      {/* ========================================================================= */}
      {activeTab === 'notes_thresholds' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TASK A: CARE NOTES & INSTRUCTIONS */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-[#1E2243] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#5B5FE8]" />
                Doctor's Care Instructions & Notes
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                New instructions dispatch notifications and appear immediately on caregiver dashboards.
              </p>
            </div>

            {/* Note Entry Form (Doctors & Admin Only) */}
            {!readOnly && (
              <form onSubmit={handleSubmitNote} className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Write Clinical Instruction or Remark
                  </label>
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="e.g., Encourage oral hydration. Monitor SpO2 before and after ambulation..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="notePriority"
                        value="routine"
                        checked={newNotePriority === 'routine'}
                        onChange={() => setNewNotePriority('routine')}
                        className="text-[#5B5FE8] focus:ring-[#5B5FE8]"
                      />
                      <span className="text-slate-700">Routine</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#B91C1C]">
                      <input
                        type="radio"
                        name="notePriority"
                        value="important"
                        checked={newNotePriority === 'important'}
                        onChange={() => setNewNotePriority('important')}
                        className="text-[#F25F5C] focus:ring-[#F25F5C]"
                      />
                      <span>Important / Urgent</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || !newNoteText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] transition-all shadow-sm shadow-[#5B5FE8]/25 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Post Instruction</span>
                  </button>
                </div>
              </form>
            )}

            {/* Notes Feed (Chronological, Newest First) */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {data.careNotes.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">No care notes posted yet</p>
                </div>
              ) : (
                data.careNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-xl border space-y-1.5 ${
                      note.priority === 'important'
                        ? 'border-[#F25F5C]/40 bg-[#FFF1F2]/40'
                        : 'border-slate-200/80 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#1E2243]">{note.doctor_name}</span>
                        {note.priority === 'important' ? (
                          <span className="text-[10px] font-black uppercase text-[#B91C1C] bg-[#FFF1F2] px-2 py-0.5 rounded border border-[#F25F5C]/30">
                            Important
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Routine
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {format(new Date(note.created_at), 'MMM dd, yyyy · HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TASK B: VITAL-SIGN THRESHOLDS */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-[#1E2243] flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#5B5FE8]" />
                Vital-Sign Thresholds (Alert Parameters)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Readings beyond these bounds trigger high-priority alerts and red chart shading.
              </p>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-2 pr-2">Vital Sign</th>
                      <th className="py-2 px-2 text-center">Normal Min</th>
                      <th className="py-2 px-2 text-center">Normal Max</th>
                      <th className="py-2 pl-2 text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {/* BP Systolic */}
                    <tr>
                      <td className="py-2.5 pr-2 font-bold text-[#1E2243]">BP Systolic</td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.bp_systolic_min}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, bp_systolic_min: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.bp_systolic_max}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, bp_systolic_max: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-400">mmHg</td>
                    </tr>

                    {/* BP Diastolic */}
                    <tr>
                      <td className="py-2.5 pr-2 font-bold text-[#1E2243]">BP Diastolic</td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.bp_diastolic_min}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, bp_diastolic_min: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.bp_diastolic_max}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, bp_diastolic_max: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-400">mmHg</td>
                    </tr>

                    {/* Pulse Rate */}
                    <tr>
                      <td className="py-2.5 pr-2 font-bold text-[#1E2243]">Pulse / Heart Rate</td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.pulse_rate_min}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, pulse_rate_min: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.pulse_rate_max}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, pulse_rate_max: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-400">bpm</td>
                    </tr>

                    {/* Respiratory Rate */}
                    <tr>
                      <td className="py-2.5 pr-2 font-bold text-[#1E2243]">Respiratory Rate</td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.respiratory_rate_min}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, respiratory_rate_min: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.respiratory_rate_max}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, respiratory_rate_max: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-400">cpm</td>
                    </tr>

                    {/* Temperature */}
                    <tr>
                      <td className="py-2.5 pr-2 font-bold text-[#1E2243]">Body Temperature</td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="0.1"
                          disabled={readOnly}
                          value={thresholdsForm.temperature_min}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, temperature_min: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="0.1"
                          disabled={readOnly}
                          value={thresholdsForm.temperature_max}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, temperature_max: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-400">°C</td>
                    </tr>

                    {/* SpO2 */}
                    <tr>
                      <td className="py-2.5 pr-2 font-bold text-[#1E2243]">Oxygen Saturation (SpO2)</td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.spo2_min}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, spo2_min: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.spo2_max}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, spo2_max: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-400">%</td>
                    </tr>

                    {/* Blood Glucose */}
                    <tr>
                      <td className="py-2.5 pr-2 font-bold text-[#1E2243]">Blood Glucose</td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.blood_glucose_min}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, blood_glucose_min: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          disabled={readOnly}
                          value={thresholdsForm.blood_glucose_max}
                          onChange={(e) =>
                            setThresholdsForm({ ...thresholdsForm, blood_glucose_max: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-400">mg/dL</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {!readOnly && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Changes are logged in public.audit_logs.</span>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] transition-all shadow-sm shadow-[#5B5FE8]/25 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save & Update Thresholds</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MEDICATION SCHEDULE & FOLLOW-UP CARE (FIGURE 21)                  */}
      {/* ========================================================================= */}
      {activeTab === 'meds_followup' && (
        <div className="space-y-8">
          {/* TASK A: MEDICATION SCHEDULE */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-[#1E2243] flex items-center gap-2">
                  <Pill className="h-5 w-5 text-[#5B5FE8]" />
                  Active Prescriptions & Medication Schedule
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Scheduled doses generate tasks for bedside caregivers under "Medications Due This Shift".
                </p>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setShowAddMed(!showAddMed)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] transition-all shadow-sm shadow-[#5B5FE8]/25"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Prescribe Medication</span>
                </button>
              )}
            </div>

            {/* Prescribe Medication Form */}
            {showAddMed && !readOnly && (
              <form onSubmit={handleSaveMedication} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Drug Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Amlodipine, Losartan"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g. 5mg, 500mg tab"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Route</label>
                    <select
                      value={medRoute}
                      onChange={(e) => setMedRoute(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                    >
                      <option value="Oral">Oral</option>
                      <option value="Sublingual">Sublingual</option>
                      <option value="Subcutaneous">Subcutaneous</option>
                      <option value="Topical">Topical</option>
                      <option value="Inhalation">Inhalation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Frequency</label>
                    <select
                      value={medFreq}
                      onChange={(e) => {
                        const val = e.target.value
                        setMedFreq(val)
                        if (val === 'Once daily') setMedTimes(['08:00'])
                        if (val === 'Twice daily') setMedTimes(['08:00', '20:00'])
                        if (val === 'Every 8 hours') setMedTimes(['08:00', '16:00', '00:00'])
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                    >
                      <option value="Once daily">Once daily (OD)</option>
                      <option value="Twice daily">Twice daily (BID)</option>
                      <option value="Every 8 hours">Every 8 hours (Q8H)</option>
                      <option value="Every 6 hours">Every 6 hours (Q6H)</option>
                      <option value="As needed">As needed (PRN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={medStartDate}
                      onChange={(e) => setMedStartDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">End Date (Optional)</label>
                    <input
                      type="date"
                      value={medEndDate}
                      onChange={(e) => setMedEndDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Administration Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Take with meals in the morning. Check BP before administering."
                    value={medInstructions}
                    onChange={(e) => setMedInstructions(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMed(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-1.5 rounded-lg bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] shadow-sm disabled:opacity-50"
                  >
                    Save Prescription
                  </button>
                </div>
              </form>
            )}

            {/* Medications List */}
            <div className="space-y-3">
              {data.medications.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center font-medium">No active medications scheduled.</p>
              ) : (
                data.medications.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      m.status === 'discontinued'
                        ? 'bg-slate-50 border-slate-200/60 opacity-60'
                        : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#1E2243]">{m.name}</span>
                        <span className="text-xs font-bold text-[#5B5FE8] bg-[#EEF0FF] px-2 py-0.5 rounded">
                          {m.dosage}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{m.route} · {m.frequency}</span>
                        {m.status === 'discontinued' && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                            Discontinued
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        Times: <strong className="text-slate-800">{m.schedule_times?.join(', ') || 'Custom'}</strong> · Started: {m.start_date}
                      </p>
                      {m.instructions && (
                        <p className="text-xs text-slate-500 italic">Instructions: {m.instructions}</p>
                      )}
                    </div>

                    {!readOnly && m.status !== 'discontinued' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDiscontinueMed(m.id, m.name)}
                          className="px-3 py-1.5 text-xs font-bold text-[#B91C1C] border border-[#F25F5C]/30 rounded-lg hover:bg-[#FFF1F2] transition-colors"
                        >
                          Discontinue
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TASK B: FOLLOW-UP CARE & APPOINTMENTS */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-[#1E2243] flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#5B5FE8]" />
                  Follow-up Care & Appointments
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Automated reminders are dispatched 1 day prior to caregivers, patients, and family members.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setApptViewMode('list')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      apptViewMode === 'list' ? 'bg-white text-[#1E2243] shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptViewMode('calendar')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      apptViewMode === 'calendar' ? 'bg-white text-[#1E2243] shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Calendar View
                  </button>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setShowAddAppt(!showAddAppt)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] transition-all shadow-sm shadow-[#5B5FE8]/25"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Book Appointment</span>
                  </button>
                )}
              </div>
            </div>

            {/* Appointment Booking Form */}
            {showAddAppt && !readOnly && (
              <form onSubmit={handleSaveAppointment} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Appointment Type</label>
                    <select
                      value={apptType}
                      onChange={(e) => setApptType(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                    >
                      <option value="check-up">Routine Check-up</option>
                      <option value="laboratory">Laboratory Testing</option>
                      <option value="therapy">Physical Therapy</option>
                      <option value="other">Specialist Consultation / Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={apptDate}
                      onChange={(e) => setApptDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Location</label>
                    <input
                      type="text"
                      value={apptLocation}
                      onChange={(e) => setApptLocation(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Purpose & Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Fasting blood sugar recheck & cardiac auscultation."
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5B5FE8] bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAppt(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-1.5 rounded-lg bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] shadow-sm disabled:opacity-50"
                  >
                    Confirm Appointment
                  </button>
                </div>
              </form>
            )}

            {/* List View */}
            {apptViewMode === 'list' ? (
              <div className="space-y-3">
                {data.appointments.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center font-medium">No appointments currently scheduled.</p>
                ) : (
                  data.appointments.map((ap) => (
                    <div
                      key={ap.id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-[#5B5FE8]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-[#5B5FE8] bg-[#EEF0FF] px-2.5 py-0.5 rounded">
                            {ap.type}
                          </span>
                          <span className="text-sm font-bold text-[#1E2243]">
                            {format(new Date(ap.appointment_date), 'EEEE, MMMM dd, yyyy · hh:mm a')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Location: <strong className="text-slate-800">{ap.location || 'Dumaguete Clinic'}</strong>
                        </p>
                        {ap.notes && <p className="text-xs text-slate-500 italic">Purpose: {ap.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#2DD4BF]/15 text-[#0F766E] border border-[#2DD4BF]/30 capitalize">
                          {ap.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Calendar View (Month Timeline) */
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Upcoming Schedule Timeline</span>
                  <span className="text-slate-400 font-normal">Next 30 Days</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.appointments.map((ap) => {
                    const d = new Date(ap.appointment_date)
                    return (
                      <div key={ap.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-[#5B5FE8]">{ap.type}</span>
                          <span className="text-[11px] font-bold text-slate-400">{format(d, 'MMM dd')}</span>
                        </div>
                        <p className="text-xs font-bold text-[#1E2243]">{format(d, 'hh:mm a')}</p>
                        <p className="text-[11px] text-slate-600 truncate">{ap.location}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
