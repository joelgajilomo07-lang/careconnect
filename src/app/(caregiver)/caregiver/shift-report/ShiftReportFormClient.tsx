'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  HeartPulse,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  Info,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import {
  submitShiftReportAction,
  type VitalSignThresholds,
  type SubmitShiftReportPayload,
} from '@/app/actions/shiftReports'

interface Props {
  assignedPatients: Array<{ id: string; full_name: string; diagnosis: string | null }>
  initialThresholds: VitalSignThresholds
  defaultPatientId?: string
}

export function ShiftReportFormClient({
  assignedPatients,
  initialThresholds,
  defaultPatientId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Selected Patient & Shift
  const [patientId, setPatientId] = useState(defaultPatientId || assignedPatients[0]?.id || '')
  const [shift, setShift] = useState<'Morning' | 'Afternoon' | 'Night' | 'Day'>('Day')
  const [thresholds, setThresholds] = useState<VitalSignThresholds>(initialThresholds)

  // 1. Vital Signs Form State
  const [vitals, setVitals] = useState({
    bp_systolic: 120,
    bp_diastolic: 80,
    pulse_rate: 75,
    respiratory_rate: 16,
    temperature_c: 36.6,
    spo2: 98,
    blood_glucose: '',
  })

  // 2. Observations & Care Sections State
  const [generalCondition, setGeneralCondition] = useState(
    'Alert, oriented x3, resting comfortably in bed with stable respirations.'
  )
  const [activitiesCare, setActivitiesCare] = useState(
    'Assisted with morning bath, oral hygiene, bed linen change, and repositioning.'
  )
  const [foodFluidIntake, setFoodFluidIntake] = useState(
    'Ate 90% of soft diet breakfast. Fluid intake 650ml water and juice.'
  )
  const [elimination, setElimination] = useState(
    'Voided clear amber urine x3. Bowel movement soft, formed once.'
  )
  const [sleep, setSleep] = useState('Slept approximately 6.5 hours uninterrupted.')
  const [behaviorMood, setBehaviorMood] = useState('Pleasant, cooperative with care routines.')
  const [incidents, setIncidents] = useState(false)
  const [incidentDescription, setIncidentDescription] = useState('')

  // Confirmation Summary & Feedback
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Live Out-of-Threshold Checks
  const thresholdAlerts = useMemo(() => {
    const alerts: Record<string, string | null> = {}

    if (vitals.bp_systolic < thresholds.bp_systolic_min || vitals.bp_systolic > thresholds.bp_systolic_max) {
      alerts.bp_systolic = `Outside the doctor's set range (${thresholds.bp_systolic_min}-${thresholds.bp_systolic_max} mmHg)`
    }
    if (vitals.bp_diastolic < thresholds.bp_diastolic_min || vitals.bp_diastolic > thresholds.bp_diastolic_max) {
      alerts.bp_diastolic = `Outside the doctor's set range (${thresholds.bp_diastolic_min}-${thresholds.bp_diastolic_max} mmHg)`
    }
    if (vitals.pulse_rate < thresholds.pulse_rate_min || vitals.pulse_rate > thresholds.pulse_rate_max) {
      alerts.pulse_rate = `Outside the doctor's set range (${thresholds.pulse_rate_min}-${thresholds.pulse_rate_max} bpm)`
    }
    if (vitals.respiratory_rate < thresholds.respiratory_rate_min || vitals.respiratory_rate > thresholds.respiratory_rate_max) {
      alerts.respiratory_rate = `Outside the doctor's set range (${thresholds.respiratory_rate_min}-${thresholds.respiratory_rate_max}/min)`
    }
    if (vitals.temperature_c < thresholds.temperature_min || vitals.temperature_c > thresholds.temperature_max) {
      alerts.temperature_c = `Outside the doctor's set range (${thresholds.temperature_min}-${thresholds.temperature_max} °C)`
    }
    if (vitals.spo2 < thresholds.spo2_min) {
      alerts.spo2 = `Outside the doctor's set range (< ${thresholds.spo2_min}%)`
    }

    return alerts
  }, [vitals, thresholds])

  const hasAnyOutliers = Object.values(thresholdAlerts).some(Boolean)

  const handleReviewSummary = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setShowConfirmation(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFinalSubmit = async () => {
    setShowConfirmation(false)
    setFeedback(null)

    startTransition(async () => {
      const payload: SubmitShiftReportPayload = {
        patientId,
        shift,
        vitals: {
          bp_systolic: Number(vitals.bp_systolic),
          bp_diastolic: Number(vitals.bp_diastolic),
          pulse_rate: Number(vitals.pulse_rate),
          respiratory_rate: Number(vitals.respiratory_rate),
          temperature_c: Number(vitals.temperature_c),
          spo2: Number(vitals.spo2),
          blood_glucose: vitals.blood_glucose ? Number(vitals.blood_glucose) : null,
        },
        generalCondition,
        activitiesCare,
        foodFluidIntake,
        elimination,
        sleep,
        behaviorMood,
        incidents,
        incidentDescription: incidents ? incidentDescription : undefined,
      }

      const res = await submitShiftReportAction(payload)

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        const msg = res.abnormalAlertSent
          ? 'Shift report submitted successfully. An urgent critical alert has been dispatched to the physician and administrator due to out-of-range vitals.'
          : 'Shift report submitted successfully. Record saved to patient history.'
        setFeedback({ type: 'success', message: msg })
        setTimeout(() => {
          router.push('/caregiver')
        }, 2500)
      }
    })
  }

  const selectedPatient = assignedPatients.find((p) => p.id === patientId)

  return (
    <div className="space-y-6 pb-28 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <Link
            href="/caregiver"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5B5FE8] transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1E2243] tracking-tight">
              Submit Shift Report
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
              Figure 15
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Tender Touch Home Care Services – Bedside Clinical Documentation
          </p>
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

      {/* CONFIRMATION SUMMARY MODAL / BANNER */}
      {showConfirmation && (
        <div className="rounded-2xl border-2 border-[#5B5FE8] bg-white p-6 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CheckCircle2 className="h-6 w-6 text-[#5B5FE8]" />
            <div>
              <h2 className="text-lg font-black text-[#1E2243]">Confirm Shift Report Submission</h2>
              <p className="text-xs text-slate-500 font-medium">
                Please verify all recorded clinical information before final transmission.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Patient</span>
              <span className="font-bold text-slate-900">{selectedPatient?.full_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Shift</span>
              <span className="font-bold text-slate-900">{shift} Shift</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Blood Pressure</span>
              <span className="font-bold text-slate-900">{vitals.bp_systolic}/{vitals.bp_diastolic} mmHg</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">SpO2 Saturation</span>
              <span className={`font-bold ${vitals.spo2 < 95 ? 'text-rose-600' : 'text-slate-900'}`}>
                {vitals.spo2}% {vitals.spo2 < 95 && '(Low)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Heart Rate</span>
              <span className="font-bold text-slate-900">{vitals.pulse_rate} bpm</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Temperature</span>
              <span className="font-bold text-slate-900">{vitals.temperature_c} °C</span>
            </div>
          </div>

          {hasAnyOutliers && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Threshold Alert Warning</p>
                <p className="text-rose-800 mt-0.5">
                  One or more vitals are outside the physician&apos;s configured threshold. A HIGH-priority notification will be automatically delivered to the doctor upon submission.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-[#5B5FE8] hover:bg-[#4A4ED4] text-white text-xs font-black shadow-sm disabled:opacity-50"
            >
              {isPending ? 'Submitting...' : 'Confirm & Finalize Report'}
            </button>
          </div>
        </div>
      )}

      {/* SHIFT REPORT FORM (8 SECTIONS IN STRICT ORDER) */}
      <form onSubmit={handleReviewSummary} className="space-y-6">
        {/* Top Selectors: Patient & Shift */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Patient *
              </label>
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              >
                {assignedPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.diagnosis || 'Active'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Shift *
              </label>
              <select
                required
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              >
                <option value="Morning">Morning Shift (6:00 AM - 2:00 PM)</option>
                <option value="Afternoon">Afternoon Shift (2:00 PM - 10:00 PM)</option>
                <option value="Night">Night Shift (10:00 PM - 6:00 AM)</option>
                <option value="Day">Day Coverage (General)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 1: VITAL SIGNS (With Live Threshold Highlighting) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-[#5B5FE8]" />
              <h2 className="text-base font-extrabold text-[#1E2243]">
                1. Vital Signs
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500">Live threshold validation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* Blood Pressure (Systolic) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Systolic BP (mmHg) *
              </label>
              <input
                type="number"
                required
                min={50}
                max={260}
                value={vitals.bp_systolic}
                onChange={(e) => setVitals({ ...vitals, bp_systolic: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold ${
                  thresholdAlerts.bp_systolic
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-rose-500/20'
                    : 'border-slate-200 text-slate-900 focus:border-[#5B5FE8]'
                }`}
              />
              {thresholdAlerts.bp_systolic ? (
                <span className="text-[10px] font-bold text-rose-600 mt-1 block">
                  {thresholdAlerts.bp_systolic}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 block">Normal: 90–140 mmHg</span>
              )}
            </div>

            {/* Blood Pressure (Diastolic) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Diastolic BP (mmHg) *
              </label>
              <input
                type="number"
                required
                min={30}
                max={180}
                value={vitals.bp_diastolic}
                onChange={(e) => setVitals({ ...vitals, bp_diastolic: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold ${
                  thresholdAlerts.bp_diastolic
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-rose-500/20'
                    : 'border-slate-200 text-slate-900 focus:border-[#5B5FE8]'
                }`}
              />
              {thresholdAlerts.bp_diastolic ? (
                <span className="text-[10px] font-bold text-rose-600 mt-1 block">
                  {thresholdAlerts.bp_diastolic}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 block">Normal: 60–90 mmHg</span>
              )}
            </div>

            {/* Pulse Rate */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pulse Rate (bpm) *
              </label>
              <input
                type="number"
                required
                min={30}
                max={220}
                value={vitals.pulse_rate}
                onChange={(e) => setVitals({ ...vitals, pulse_rate: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold ${
                  thresholdAlerts.pulse_rate
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900'
                    : 'border-slate-200 text-slate-900'
                }`}
              />
              {thresholdAlerts.pulse_rate ? (
                <span className="text-[10px] font-bold text-rose-600 mt-1 block">
                  {thresholdAlerts.pulse_rate}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 block">Normal: 60–100 bpm</span>
              )}
            </div>

            {/* Respiratory Rate */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Respiratory Rate (/min) *
              </label>
              <input
                type="number"
                required
                min={6}
                max={60}
                value={vitals.respiratory_rate}
                onChange={(e) => setVitals({ ...vitals, respiratory_rate: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold ${
                  thresholdAlerts.respiratory_rate
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900'
                    : 'border-slate-200 text-slate-900'
                }`}
              />
              {thresholdAlerts.respiratory_rate ? (
                <span className="text-[10px] font-bold text-rose-600 mt-1 block">
                  {thresholdAlerts.respiratory_rate}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 block">Normal: 12–20 /min</span>
              )}
            </div>

            {/* Temperature */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Temperature (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                min={30}
                max={45}
                value={vitals.temperature_c}
                onChange={(e) => setVitals({ ...vitals, temperature_c: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold ${
                  thresholdAlerts.temperature_c
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900'
                    : 'border-slate-200 text-slate-900'
                }`}
              />
              {thresholdAlerts.temperature_c ? (
                <span className="text-[10px] font-bold text-rose-600 mt-1 block">
                  {thresholdAlerts.temperature_c}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 block">Normal: 36.1–37.5 °C</span>
              )}
            </div>

            {/* SpO2 Oxygen Saturation */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Oxygen Saturation (SpO2 %) *
              </label>
              <input
                type="number"
                required
                min={50}
                max={100}
                value={vitals.spo2}
                onChange={(e) => setVitals({ ...vitals, spo2: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold ${
                  thresholdAlerts.spo2
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900'
                    : 'border-slate-200 text-slate-900'
                }`}
              />
              {thresholdAlerts.spo2 ? (
                <span className="text-[10px] font-bold text-rose-600 mt-1 block">
                  {thresholdAlerts.spo2}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 block">Normal: ≥ 95%</span>
              )}
            </div>

            {/* Blood Glucose (Optional) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Blood Glucose (mg/dL) (Optional)
              </label>
              <input
                type="number"
                value={vitals.blood_glucose}
                onChange={(e) => setVitals({ ...vitals, blood_glucose: e.target.value })}
                placeholder="e.g. 110"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Normal fasting: 70–140 mg/dL</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: GENERAL CONDITION AND OBSERVATIONS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 text-xs">
          <label className="block font-extrabold text-[#1E2243] uppercase tracking-wider">
            2. General Condition and Observations *
          </label>
          <textarea
            required
            rows={2}
            value={generalCondition}
            onChange={(e) => setGeneralCondition(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
          />
        </div>

        {/* SECTION 3: ACTIVITIES AND CARE PROVIDED */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 text-xs">
          <label className="block font-extrabold text-[#1E2243] uppercase tracking-wider">
            3. Activities and Care Provided *
          </label>
          <textarea
            required
            rows={2}
            value={activitiesCare}
            onChange={(e) => setActivitiesCare(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
          />
        </div>

        {/* SECTION 4: FOOD AND FLUID INTAKE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 text-xs">
          <label className="block font-extrabold text-[#1E2243] uppercase tracking-wider">
            4. Food and Fluid Intake *
          </label>
          <textarea
            required
            rows={2}
            value={foodFluidIntake}
            onChange={(e) => setFoodFluidIntake(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
          />
        </div>

        {/* SECTION 5: ELIMINATION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 text-xs">
          <label className="block font-extrabold text-[#1E2243] uppercase tracking-wider">
            5. Elimination *
          </label>
          <textarea
            required
            rows={2}
            value={elimination}
            onChange={(e) => setElimination(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
          />
        </div>

        {/* SECTION 6: SLEEP */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 text-xs">
          <label className="block font-extrabold text-[#1E2243] uppercase tracking-wider">
            6. Sleep Patterns *
          </label>
          <textarea
            required
            rows={2}
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
          />
        </div>

        {/* SECTION 7: BEHAVIOR / MOOD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 text-xs">
          <label className="block font-extrabold text-[#1E2243] uppercase tracking-wider">
            7. Behavior / Mood *
          </label>
          <textarea
            required
            rows={2}
            value={behaviorMood}
            onChange={(e) => setBehaviorMood(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
          />
        </div>

        {/* SECTION 8: INCIDENTS (YES / NO) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-extrabold text-[#1E2243] uppercase tracking-wider">
              8. Incidents or Adverse Events
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                <input
                  type="radio"
                  name="incidents"
                  checked={!incidents}
                  onChange={() => setIncidents(false)}
                />
                <span>No Incidents</span>
              </label>
              <label className="flex items-center gap-1.5 font-bold text-rose-600 cursor-pointer">
                <input
                  type="radio"
                  name="incidents"
                  checked={incidents}
                  onChange={() => setIncidents(true)}
                />
                <span>Yes, Incident Occurred</span>
              </label>
            </div>
          </div>

          {incidents && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block font-bold text-rose-700 uppercase tracking-wider">
                Incident Description *
              </label>
              <textarea
                required={incidents}
                rows={2}
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                placeholder="Describe what occurred, time, action taken, and notify administrator..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50/40 text-rose-950 font-medium"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#5B5FE8] hover:bg-[#4A4ED4] text-white font-extrabold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>Review &amp; Submit Shift Report</span>
          </button>
        </div>
      </form>
    </div>
  )
}
