'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitVitalsLog } from '@/app/(caregiver)/actions'
import { vitalsLogSchema } from '@/lib/validations/vitals'
import { Activity, Heart, Thermometer, Droplets, FileText, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react'

interface AssignedPatient {
  patientId: string
  fullName: string
  primaryCondition: string | null
  currentStatus: 'stable' | 'warning' | 'critical' | 'unassessed' | null
  relationshipLabel: string | null
}

interface LogVitalsFormProps {
  patients: AssignedPatient[]
  defaultPatientId?: string
}

function getPatientDisplayName(patient: AssignedPatient): string {
  const name = patient.fullName.trim()
  if (/\(.*\)/.test(name)) {
    return name
  }

  if (patient.relationshipLabel) {
    const roleLower = patient.relationshipLabel.toLowerCase()
    const isCaregiverStaffRole = [
      'home health aide',
      'primary day caregiver',
      'night shift nurse',
      'physical therapy assistant',
      'caregiver',
      'nurse',
      'aide',
    ].some((role) => roleLower.includes(role))

    if (!isCaregiverStaffRole) {
      return `${name} (${patient.relationshipLabel})`
    }
  }

  return name
}

function PatientCareOverviewCard({ patient }: { patient: AssignedPatient }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100/80 text-teal-700">
            <User className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
              Patient Care Overview
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {getPatientDisplayName(patient)}
            </h3>
            {patient.relationshipLabel && (
              <p className="text-xs text-slate-500">
                Care assignment: {patient.relationshipLabel}
              </p>
            )}
          </div>
        </div>

        {patient.currentStatus && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
              patient.currentStatus === 'critical'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : patient.currentStatus === 'warning'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : patient.currentStatus === 'stable'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                patient.currentStatus === 'critical'
                  ? 'bg-rose-500'
                  : patient.currentStatus === 'warning'
                  ? 'bg-amber-500'
                  : patient.currentStatus === 'stable'
                  ? 'bg-emerald-500'
                  : 'bg-slate-400'
              }`}
            />
            {patient.currentStatus.charAt(0).toUpperCase() + patient.currentStatus.slice(1)}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
        <span>Routine health observations active</span>
        <span>Ready for vitals entry</span>
      </div>
    </div>
  )
}

export function LogVitalsForm({ patients, defaultPatientId }: LogVitalsFormProps) {
  const router = useRouter()

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    defaultPatientId || (patients.length > 0 ? patients[0].patientId : '')
  )

  const [formData, setFormData] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    heart_rate: '',
    temperature_c: '',
    spo2: '',
    notes: '',
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedPatient = patients.find(p => p.patientId === selectedPatientId)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear field-specific validation error on edit
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setSuccessMessage(null)
    setValidationErrors({})

    if (!selectedPatientId) {
      setServerError('Please select an assigned patient to log vitals for.')
      return
    }

    // 1. Client-side Zod validation mirroring Postgres check constraints
    const validationResult = vitalsLogSchema.safeParse({
      patient_id: selectedPatientId,
      bp_systolic: formData.bp_systolic,
      bp_diastolic: formData.bp_diastolic,
      heart_rate: formData.heart_rate,
      temperature_c: formData.temperature_c,
      spo2: formData.spo2,
      notes: formData.notes,
    })

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {}
      validationResult.error.issues.forEach(issue => {
        const path = issue.path[0] as string
        fieldErrors[path] = issue.message
      })
      setValidationErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    // 2. Submit via Server Action submitVitalsLog()
    const validatedData = validationResult.data
    const res = await submitVitalsLog({
      patient_id: validatedData.patient_id,
      bp_systolic: validatedData.bp_systolic,
      bp_diastolic: validatedData.bp_diastolic,
      heart_rate: validatedData.heart_rate,
      temperature_c: validatedData.temperature_c,
      spo2: validatedData.spo2,
      notes: validatedData.notes || null,
    })

    setIsSubmitting(false)

    if (res.error) {
      // Surface raw Postgres error message inline
      setServerError(`Database Error (${res.code || 'RLS'}): ${res.error}${res.details ? ` — ${res.details}` : ''}`)
      return
    }

    // Success: reset form fields and notify user
    setSuccessMessage(`Vitals successfully logged for ${selectedPatient ? getPatientDisplayName(selectedPatient) : 'patient'}!`)
    setFormData({
      bp_systolic: '',
      bp_diastolic: '',
      heart_rate: '',
      temperature_c: '',
      spo2: '',
      notes: '',
    })

    router.refresh()
  }

  if (patients.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-600" />
        <h3 className="mt-3 text-lg font-semibold text-amber-900">No Assigned Patients</h3>
        <p className="mt-1 text-sm text-amber-700">
          You are not currently assigned to any active patient care teams. Please contact an administrator to assign you to a patient.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient Selector for Multi-patient Caregivers */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <label htmlFor="patient_id" className="block text-sm font-bold text-gray-900">
          Select Patient
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Choose from your {patients.length} actively assigned patient{patients.length > 1 ? 's' : ''}:
        </p>

        {patients.length > 1 ? (
          <>
            <select
              id="patient_id"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {patients.map(p => (
                <option key={p.patientId} value={p.patientId}>
                  {getPatientDisplayName(p)}
                </option>
              ))}
            </select>

            {/* Patient Care Overview Summary Card below dropdown */}
            {selectedPatient && <PatientCareOverviewCard patient={selectedPatient} />}
          </>
        ) : (
          /* Single Assigned Patient View */
          selectedPatient && <PatientCareOverviewCard patient={selectedPatient} />
        )}
      </div>

      {/* Inline Feedback Alerts */}
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Submission Failed</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Vitals Entry Grid (Mobile-First Large Touch Targets) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Vital Signs Measurements
        </h2>

        {/* Blood Pressure Duo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Blood Pressure (mmHg)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-500 font-medium">Systolic (Top)</span>
              <input
                type="number"
                name="bp_systolic"
                inputMode="numeric"
                placeholder="120"
                value={formData.bp_systolic}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-lg border px-4 py-3.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 ${
                  validationErrors.bp_systolic ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {validationErrors.bp_systolic && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.bp_systolic}</p>
              )}
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium">Diastolic (Bottom)</span>
              <input
                type="number"
                name="bp_diastolic"
                inputMode="numeric"
                placeholder="80"
                value={formData.bp_diastolic}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-lg border px-4 py-3.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 ${
                  validationErrors.bp_diastolic ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {validationErrors.bp_diastolic && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.bp_diastolic}</p>
              )}
            </div>
          </div>
        </div>

        {/* Heart Rate & SpO2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="heart_rate" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
              <Heart className="h-4 w-4 text-rose-500" />
              Heart Rate (bpm)
            </label>
            <input
              id="heart_rate"
              type="number"
              name="heart_rate"
              inputMode="numeric"
              placeholder="72 (0–300)"
              value={formData.heart_rate}
              onChange={handleChange}
              className={`block w-full rounded-lg border px-4 py-3.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 ${
                validationErrors.heart_rate ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {validationErrors.heart_rate && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.heart_rate}</p>
            )}
          </div>

          <div>
            <label htmlFor="spo2" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
              <Droplets className="h-4 w-4 text-cyan-600" />
              Oxygen Saturation SpO2 (%)
            </label>
            <input
              id="spo2"
              type="number"
              name="spo2"
              inputMode="numeric"
              placeholder="98 (0–100)"
              value={formData.spo2}
              onChange={handleChange}
              className={`block w-full rounded-lg border px-4 py-3.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 ${
                validationErrors.spo2 ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {validationErrors.spo2 && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.spo2}</p>
            )}
          </div>
        </div>

        {/* Temperature */}
        <div>
          <label htmlFor="temperature_c" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
            <Thermometer className="h-4 w-4 text-amber-600" />
            Body Temperature (°C)
          </label>
          <input
            id="temperature_c"
            type="number"
            step="0.1"
            name="temperature_c"
            inputMode="decimal"
            placeholder="36.8"
            value={formData.temperature_c}
            onChange={handleChange}
            className={`block w-full rounded-lg border px-4 py-3.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 ${
              validationErrors.temperature_c ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {validationErrors.temperature_c && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.temperature_c}</p>
          )}
        </div>

        {/* Observations & Notes */}
        <div>
          <label htmlFor="notes" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
            <FileText className="h-4 w-4 text-gray-500" />
            Clinical Notes & Observations
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Patient reported mild dizziness after morning medication..."
            value={formData.notes}
            onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {validationErrors.notes && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.notes}</p>
          )}
        </div>
      </div>

      {/* Mobile-friendly Large Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[48px] rounded-xl bg-blue-600 py-4 px-6 text-center text-base font-bold text-white shadow-md hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Submitting Vitals...
          </>
        ) : (
          <>
            <Activity className="h-5 w-5" />
            Submit Vitals Log
          </>
        )}
      </button>
    </form>
  )
}
