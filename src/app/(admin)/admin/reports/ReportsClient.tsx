'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  FileText,
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartPulse,
  Pill,
  ClipboardList,
  Sparkles,
  RefreshCw,
  Stethoscope,
  Shield,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  generatePatientCareSummaryAction,
  generateShiftReportComplianceAction,
  generateMedicationAdministrationRecordAction,
  type PatientCareSummaryReport,
  type ShiftReportComplianceItem,
  type MedicationAdministrationRecordReport,
} from '@/app/actions/reports'

interface Props {
  patients: Array<{ id: string; full_name: string; diagnosis: string | null }>
  caregivers: Array<{ id: string; full_name: string }>
}

type ReportType = 'patient_care_summary' | 'shift_compliance' | 'mar'

export function ReportsClient({ patients, caregivers }: Props) {
  const [reportType, setReportType] = useState<ReportType>('patient_care_summary')
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '')
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string>('all')

  // Date range (defaults to past 14 days)
  const defaultStart = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const defaultEnd = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Report Results
  const [careSummaryData, setCareSummaryData] = useState<PatientCareSummaryReport | null>(null)
  const [complianceData, setComplianceData] = useState<ShiftReportComplianceItem[] | null>(null)
  const [marData, setMarData] = useState<MedicationAdministrationRecordReport | null>(null)

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      if (reportType === 'patient_care_summary') {
        if (!selectedPatientId) {
          setError('Please select a patient.')
          return
        }
        const res = await generatePatientCareSummaryAction({
          patientId: selectedPatientId,
          startDate,
          endDate,
        })
        if (res.error) {
          setError(res.error)
        } else {
          setCareSummaryData(res.data)
        }
      } else if (reportType === 'shift_compliance') {
        const res = await generateShiftReportComplianceAction({
          caregiverId: selectedCaregiverId,
          startDate,
          endDate,
        })
        if (res.error) {
          setError(res.error)
        } else {
          setComplianceData(res.data)
        }
      } else if (reportType === 'mar') {
        if (!selectedPatientId) {
          setError('Please select a patient.')
          return
        }
        const res = await generateMedicationAdministrationRecordAction({
          patientId: selectedPatientId,
          startDate,
          endDate,
        })
        if (res.error) {
          setError(res.error)
        } else {
          setMarData(res.data)
        }
      }
    })
  }

  // Export PDF (clean print dialog)
  const handlePrintPdf = () => {
    window.print()
  }

  // Export CSV
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    let filename = `careconnect_report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`

    if (reportType === 'patient_care_summary' && careSummaryData) {
      csvContent += 'Tender Touch Home Care Services - Patient Care Summary\n'
      csvContent += `Patient,${careSummaryData.patient.full_name}\n`
      csvContent += `Diagnosis,${careSummaryData.patient.diagnosis || 'None'}\n\n`
      csvContent += 'VITAL SIGNS HISTORY\n'
      csvContent += 'Timestamp,Systolic BP,Diastolic BP,Heart Rate,Resp Rate,Temp C,SpO2 %,Blood Glucose,Caregiver\n'
      careSummaryData.vitalSigns.forEach((v) => {
        csvContent += `"${v.logged_at}",${v.systolic_bp || ''},${v.diastolic_bp || ''},${v.heart_rate || ''},${v.respiratory_rate || ''},${v.temperature_c || ''},${v.oxygen_saturation || ''},${v.blood_glucose || ''},"${v.caregiver_name}"\n`
      })
    } else if (reportType === 'shift_compliance' && complianceData) {
      csvContent += 'Tender Touch Home Care Services - Shift Report Compliance Report\n'
      csvContent += `Date Range,${startDate} to ${endDate}\n\n`
      csvContent += 'Caregiver,Assigned Patients,Shifts Expected,Reports Submitted,Compliance Rate %\n'
      complianceData.forEach((c) => {
        csvContent += `"${c.caregiver_name}",${c.assigned_patients_count},${c.shifts_expected},${c.reports_submitted},${c.compliance_rate}%\n`
      })
    } else if (reportType === 'mar' && marData) {
      csvContent += 'Tender Touch Home Care Services - Medication Administration Record (MAR)\n'
      csvContent += `Patient,${marData.patient.full_name}\n`
      csvContent += `Date Range,${startDate} to ${endDate}\n\n`
      csvContent += 'Medication,Dosage,Route,Scheduled Time,Status,Administered At,Caregiver,Remarks\n'
      marData.logs.forEach((l) => {
        csvContent += `"${l.medication_name}","${l.dosage}","${l.route || ''}","${l.scheduled_time}","${l.status}","${l.administered_at || ''}","${l.caregiver_name}","${l.remarks || ''}"\n`
      })
    } else {
      alert('Please generate the report on screen before exporting.')
      return
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasData =
    (reportType === 'patient_care_summary' && careSummaryData) ||
    (reportType === 'shift_compliance' && complianceData) ||
    (reportType === 'mar' && marData)

  return (
    <div className="space-y-8 pb-20 print:p-0 print:space-y-4">
      {/* Top Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5B5FE8] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Admin Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2243] tracking-tight">
              Clinical &amp; Compliance Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
              Figure 13 Task B
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Generate printable clinical summaries, caregiver compliance metrics, and Medication Administration Records.
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!hasData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-[#5B5FE8] hover:text-[#5B5FE8] text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            disabled={!hasData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Export PDF / Print</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS - Hidden on Print */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs print:hidden">
        <form onSubmit={handleGenerateReport} className="space-y-4">
          {/* Report Type Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setReportType('patient_care_summary')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all ${
                  reportType === 'patient_care_summary'
                    ? 'bg-white text-[#1E2243] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-4 w-4 text-[#5B5FE8]" />
                <span>Patient Care Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('shift_compliance')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all ${
                  reportType === 'shift_compliance'
                    ? 'bg-white text-[#1E2243] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="h-4 w-4 text-teal-600" />
                <span>Shift Report Compliance</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('mar')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all ${
                  reportType === 'mar'
                    ? 'bg-white text-[#1E2243] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pill className="h-4 w-4 text-amber-600" />
                <span>Medication Record (MAR)</span>
              </button>
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Conditional Patient or Caregiver Selector */}
            {reportType === 'shift_compliance' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Caregiver
                </label>
                <select
                  value={selectedCaregiverId}
                  onChange={(e) => setSelectedCaregiverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                >
                  <option value="all">All Active Caregivers</option>
                  {caregivers.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.full_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Patient *
                </label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                >
                  <option value="">-- Choose patient record --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.diagnosis || 'Active'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              <span>Generate Report</span>
            </button>
          </div>
        </form>
      </section>

      {/* ============================================================== */}
      {/* OFFICIAL REPORT DOCUMENT VIEW (Visible on screen and on print) */}
      {/* ============================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Tender Touch Agency Formal Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#1E2243] tracking-tight uppercase">
                Tender Touch Home Care Services
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Dumaguete City, Negros Oriental, Philippines • RA 10173 Compliant
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              CareConnect Web Reporting &amp; Vital Sign Monitoring System
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Report Generated
            </div>
            <div className="text-xs font-extrabold text-slate-900">
              {format(new Date(), 'MMMM d, yyyy h:mm a')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Range: {startDate} to {endDate}
            </div>
          </div>
        </div>

        {/* REPORT TYPE 1: PATIENT CARE SUMMARY */}
        {reportType === 'patient_care_summary' && (
          <div>
            {!careSummaryData ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-600">No Report Generated Yet</p>
                <p className="text-xs">
                  Select a patient and date range above, then click &quot;Generate Report&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Patient Information Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                        Patient Name
                      </span>
                      <span className="font-black text-sm text-[#1E2243]">
                        {careSummaryData.patient.full_name}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                        Diagnosis
                      </span>
                      <span className="font-bold text-slate-900">
                        {careSummaryData.patient.diagnosis || 'None recorded'}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                        Allergies
                      </span>
                      <span className="font-bold text-rose-700">
                        {careSummaryData.patient.allergies || 'NKDA'}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                        Emergency Contact
                      </span>
                      <span className="font-medium text-slate-900">
                        {careSummaryData.patient.emergency_contact_name} (
                        {careSummaryData.patient.emergency_contact_phone})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section A: Vital Signs History */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-[#5B5FE8]" />
                    <h3 className="text-sm font-extrabold text-[#1E2243] uppercase tracking-wider">
                      1. Vital Signs History ({careSummaryData.vitalSigns.length} records)
                    </h3>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/75 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-3">Date &amp; Time</th>
                          <th className="py-2.5 px-3">BP (mmHg)</th>
                          <th className="py-2.5 px-3">Heart Rate</th>
                          <th className="py-2.5 px-3">Resp Rate</th>
                          <th className="py-2.5 px-3">Temp (°C)</th>
                          <th className="py-2.5 px-3">SpO2 (%)</th>
                          <th className="py-2.5 px-3">Glucose</th>
                          <th className="py-2.5 px-3">Logged By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {careSummaryData.vitalSigns.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-slate-400">
                              No vital signs recorded in this date range.
                            </td>
                          </tr>
                        ) : (
                          careSummaryData.vitalSigns.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium whitespace-nowrap">
                                {format(new Date(v.logged_at), 'MMM d, yyyy h:mm a')}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {v.systolic_bp && v.diastolic_bp
                                  ? `${v.systolic_bp}/${v.diastolic_bp}`
                                  : '—'}
                              </td>
                              <td className="py-2 px-3">{v.heart_rate ? `${v.heart_rate} bpm` : '—'}</td>
                              <td className="py-2 px-3">{v.respiratory_rate ? `${v.respiratory_rate}/min` : '—'}</td>
                              <td className="py-2 px-3">{v.temperature_c ? `${v.temperature_c} °C` : '—'}</td>
                              <td className="py-2 px-3">
                                {v.oxygen_saturation ? (
                                  <span
                                    className={`font-bold ${
                                      v.oxygen_saturation < 95 ? 'text-rose-600 font-black' : 'text-slate-900'
                                    }`}
                                  >
                                    {v.oxygen_saturation}%
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-2 px-3">{v.blood_glucose ? `${v.blood_glucose} mg/dL` : '—'}</td>
                              <td className="py-2 px-3 text-slate-600">{v.caregiver_name}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section B: Shift Reports Summary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-teal-600" />
                    <h3 className="text-sm font-extrabold text-[#1E2243] uppercase tracking-wider">
                      2. Shift Reports Timeline ({careSummaryData.shiftReports.length} reports)
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {careSummaryData.shiftReports.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                        No shift reports submitted in this period.
                      </div>
                    ) : (
                      careSummaryData.shiftReports.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">{s.shift} Shift</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600">
                                {format(new Date(s.submitted_at), 'MMMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">
                              Caregiver: {s.caregiver_name}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1">
                            <div>
                              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block">
                                General Condition &amp; Observations
                              </span>
                              <p className="mt-0.5">{s.general_condition || 'None reported'}</p>
                            </div>
                            <div>
                              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block">
                                Care &amp; Activities Provided
                              </span>
                              <p className="mt-0.5">{s.activities_care || 'Standard routine care'}</p>
                            </div>
                          </div>

                          {s.incidents && (
                            <div className="mt-1 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                              <span className="font-bold">Incident Logged:</span> {s.incident_description}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Section C: Doctor Care Notes */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-extrabold text-[#1E2243] uppercase tracking-wider">
                      3. Clinical Care Notes &amp; Instructions ({careSummaryData.careNotes.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {careSummaryData.careNotes.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                        No physician care notes recorded in this period.
                      </div>
                    ) : (
                      careSummaryData.careNotes.map((n) => (
                        <div
                          key={n.id}
                          className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-950">{n.doctor_name}</span>
                            <span className="text-slate-500 text-[11px]">
                              {format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORT TYPE 2: SHIFT REPORT COMPLIANCE */}
        {reportType === 'shift_compliance' && (
          <div>
            {!complianceData ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <ClipboardList className="h-10 w-10 mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-600">No Compliance Report Generated</p>
                <p className="text-xs">Select dates and click &quot;Generate Report&quot;.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Active Caregivers Monitored
                    </span>
                    <span className="text-2xl font-black text-[#1E2243]">
                      {complianceData.length}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Reports Submitted
                    </span>
                    <span className="text-2xl font-black text-teal-700">
                      {complianceData.reduce((acc, c) => acc + c.reports_submitted, 0)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Average Shift Compliance
                    </span>
                    <span className="text-2xl font-black text-[#5B5FE8]">
                      {complianceData.length > 0
                        ? Math.round(
                            complianceData.reduce((acc, c) => acc + c.compliance_rate, 0) /
                              complianceData.length
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                {/* Compliance Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/75 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4">Caregiver</th>
                        <th className="py-2.5 px-4">Assigned Patients</th>
                        <th className="py-2.5 px-4">Shifts Expected</th>
                        <th className="py-2.5 px-4">Reports Submitted</th>
                        <th className="py-2.5 px-4">Compliance Rate</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {complianceData.map((c) => (
                        <tr key={c.caregiver_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{c.caregiver_name}</div>
                            <div className="text-[10px] text-slate-400">{c.caregiver_email}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {c.assigned_patients_count} patients
                          </td>
                          <td className="py-3 px-4 text-slate-600">{c.shifts_expected} shifts</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {c.reports_submitted}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    c.compliance_rate >= 80
                                      ? 'bg-emerald-500'
                                      : c.compliance_rate >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${c.compliance_rate}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-800">{c.compliance_rate}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {c.compliance_rate >= 80 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Compliant
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Pending Reports
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORT TYPE 3: MEDICATION ADMINISTRATION RECORD (MAR) */}
        {reportType === 'mar' && (
          <div>
            {!marData ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Pill className="h-10 w-10 mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-600">No MAR Record Generated</p>
                <p className="text-xs">
                  Select a patient and date range, then click &quot;Generate Report&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Patient Header Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                        Patient Name
                      </span>
                      <span className="font-black text-sm text-[#1E2243]">
                        {marData.patient.full_name}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                        Diagnosis
                      </span>
                      <span className="font-bold text-slate-900">
                        {marData.patient.diagnosis || 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                        Allergies
                      </span>
                      <span className="font-bold text-rose-700">
                        {marData.patient.allergies || 'NKDA'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* MAR Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Scheduled
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      {marData.stats.total_doses}
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Given
                    </span>
                    <span className="text-xl font-black text-emerald-800">
                      {marData.stats.given}
                    </span>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                      Missed
                    </span>
                    <span className="text-xl font-black text-amber-800">
                      {marData.stats.missed}
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                      Refused
                    </span>
                    <span className="text-xl font-black text-rose-800">
                      {marData.stats.refused}
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Adherence Rate
                    </span>
                    <span className="text-xl font-black text-indigo-900">
                      {marData.stats.compliance_rate}%
                    </span>
                  </div>
                </div>

                {/* MAR Log Grid */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/75 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">Medication</th>
                        <th className="py-2.5 px-3">Dosage &amp; Route</th>
                        <th className="py-2.5 px-3">Scheduled Time</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Administered At</th>
                        <th className="py-2.5 px-3">Caregiver</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {marData.logs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No medication doses recorded in this date range.
                          </td>
                        </tr>
                      ) : (
                        marData.logs.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {l.medication_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {l.dosage} ({l.route || 'Oral'})
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {format(new Date(l.scheduled_time), 'MMM d, h:mm a')}
                            </td>
                            <td className="py-2.5 px-3">
                              {l.status.toLowerCase() === 'given' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Given
                                </span>
                              )}
                              {l.status.toLowerCase() === 'missed' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Missed
                                </span>
                              )}
                              {l.status.toLowerCase() === 'refused' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Refused
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {l.administered_at
                                ? format(new Date(l.administered_at), 'MMM d, h:mm a')
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              {l.caregiver_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 italic">
                              {l.remarks || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Official Document Footer (Visible on print and screen) */}
        <div className="pt-8 border-t border-slate-200 mt-8 grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-700">Tender Touch Home Care Services</p>
            <p className="text-[11px] mt-0.5">
              Certified medical transcription and caregiver reporting records. Confidential medical document.
            </p>
          </div>

          <div className="text-right space-y-4">
            <div className="inline-block border-b border-slate-400 w-48 mb-1"></div>
            <p className="text-[11px] font-bold text-slate-700 uppercase">
              Attending Physician / Supervising Nurse Signature
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
