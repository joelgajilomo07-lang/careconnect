'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  User,
  Heart,
  Droplets,
  Thermometer,
  FileText,
  ChevronRight,
  ShieldCheck,
  Check,
  Filter,
} from 'lucide-react'
import type {
  DoctorDashboardData,
  DoctorPatientItem,
  DoctorAlertItem,
} from '@/app/actions/doctorDashboard'
import { acknowledgeDoctorAlertAction } from '@/app/actions/doctorDashboard'

interface Props {
  initialData: DoctorDashboardData
}

export function DoctorDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DoctorDashboardData>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_alert' | 'needs_attention' | 'normal'>('all')
  const [isPending, startTransition] = useTransition()
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)

  const handleAcknowledgeAlert = (alertId: string) => {
    setAcknowledgingId(alertId)
    startTransition(async () => {
      const res = await acknowledgeDoctorAlertAction(alertId)
      if (res.success) {
        // Find which patient this alert belonged to
        const alertObj = data.unreadAlerts.find((a) => a.id === alertId)
        const patientId = alertObj?.patient_id

        const updatedAlerts = data.unreadAlerts.filter((a) => a.id !== alertId)
        
        // Re-evaluate that patient's status if they have no other open alerts
        const updatedPatients = data.patients.map((p) => {
          if (p.id === patientId) {
            const hasMoreAlerts = updatedAlerts.some((a) => a.patient_id === patientId)
            if (!hasMoreAlerts) {
              // Downgrade from active_alert
              const hasAttention = p.latestVitals && p.latestVitals.spo2 && p.latestVitals.spo2 < 95
              return {
                ...p,
                status: hasAttention ? ('needs_attention' as const) : ('normal' as const),
                alertReason: hasAttention ? 'Borderline SpO2 reading' : null,
              }
            }
          }
          return p
        })

        setData({
          ...data,
          unreadAlerts: updatedAlerts,
          patients: updatedPatients,
        })
      }
      setAcknowledgingId(null)
    })
  }

  // Filter patients
  const filteredPatients = data.patients.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Status counts
  const alertCount = data.patients.filter((p) => p.status === 'active_alert').length
  const attentionCount = data.patients.filter((p) => p.status === 'needs_attention').length
  const normalCount = data.patients.filter((p) => p.status === 'normal').length

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#5B5FE8] bg-[#EEF0FF] px-2.5 py-1 rounded-md">
            Attending Physician Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E2243] mt-2">
            Physician Dashboard · {data.doctorName}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Dumaguete City Clinical Monitoring & Patient Roster
          </p>
        </div>

        {/* Quick Triage Counters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm text-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#F25F5C] animate-pulse" />
            <span className="font-bold text-[#1E2243]">{alertCount}</span>
            <span className="text-xs text-slate-500">Active Alert</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm text-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#F5A524]" />
            <span className="font-bold text-[#1E2243]">{attentionCount}</span>
            <span className="text-xs text-slate-500">Needs Attention</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm text-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#2DD4BF]" />
            <span className="font-bold text-[#1E2243]">{normalCount}</span>
            <span className="text-xs text-slate-500">Normal</span>
          </div>
        </div>
      </div>

      {/* Top Section: Unread Alerts & Recently Submitted Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unread Alerts Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-[#1E2243] flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#F25F5C]" />
                Unread High-Priority Alerts
              </h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                data.unreadAlerts.length > 0
                  ? 'bg-[#F25F5C]/10 text-[#B91C1C] border border-[#F25F5C]/30'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {data.unreadAlerts.length} Open
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {data.unreadAlerts.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <ShieldCheck className="h-8 w-8 mx-auto text-[#2DD4BF] mb-2 opacity-80" />
                  <p className="text-sm font-bold text-slate-600">No unread critical alerts</p>
                  <p className="text-xs text-slate-400 mt-0.5">All clinical vital thresholds and reports are acknowledged.</p>
                </div>
              ) : (
                data.unreadAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-xl border border-[#F25F5C]/30 bg-[#FFF1F2]/60 hover:bg-[#FFF1F2] transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-[#B91C1C] tracking-wide">
                          {alert.patient_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#1E2243] leading-snug">{alert.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{alert.message}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                      <Link
                        href={`/patients/${alert.patient_id}`}
                        className="text-xs font-bold text-[#5B5FE8] hover:underline"
                      >
                        View Patient
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        disabled={acknowledgingId === alert.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Check className="h-3 w-3 text-[#2DD4BF]" />
                        {acknowledgingId === alert.id ? 'Saving...' : 'Acknowledge'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recently Submitted Reports Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-[#1E2243] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#5B5FE8]" />
                Recently Submitted Shift Reports
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {data.recentReports.length} Reports
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {data.recentReports.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">No shift reports filed yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Caregiver submissions will appear here chronologically.</p>
                </div>
              ) : (
                data.recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#1E2243]">{report.patient_name}</span>
                        <span className="text-[11px] font-semibold text-slate-500 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                          {report.shift} shift
                        </span>
                        {report.incidents && (
                          <span className="text-[10px] font-bold text-[#B91C1C] bg-[#FFF1F2] px-1.5 py-0.5 rounded border border-[#F25F5C]/30">
                            Incident Reported
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 italic">
                        Condition: {report.general_condition || 'Stable / No acute changes'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Caregiver: <span className="font-semibold text-slate-600">{report.caregiver_name}</span> ·{' '}
                        {new Date(report.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <Link
                      href={`/patients/${report.patient_id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#5B5FE8] hover:underline shrink-0 pt-1"
                    >
                      Chart <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: "My Patients" List with 3-State Badges */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-[#1E2243] flex items-center gap-2">
              <User className="h-5 w-5 text-[#5B5FE8]" />
              My Assigned Patients ({filteredPatients.length})
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Continuously monitored clinical panel for Tender Touch Home Care
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient name or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8] w-56 sm:w-64"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'all' ? 'bg-white text-[#1E2243] shadow-sm' : 'text-slate-600 hover:text-[#1E2243]'
                }`}
              >
                All ({data.patients.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active_alert')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'active_alert'
                    ? 'bg-[#F25F5C] text-white shadow-sm'
                    : 'text-[#B91C1C] hover:bg-white/50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#F25F5C]" />
                Alerts ({alertCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('needs_attention')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'needs_attention'
                    ? 'bg-[#F5A524] text-white shadow-sm'
                    : 'text-[#B45309] hover:bg-white/50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5A524]" />
                Attention ({attentionCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('normal')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'normal'
                    ? 'bg-[#2DD4BF] text-[#0F766E] shadow-sm'
                    : 'text-[#0F766E] hover:bg-white/50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#2DD4BF]" />
                Normal ({normalCount})
              </button>
            </div>
          </div>
        </div>

        {/* Patients Table / Cards */}
        {filteredPatients.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <User className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-600">No matching patients found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or filter options.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPatients.map((patient) => {
              const vitals = patient.latestVitals
              return (
                <div
                  key={patient.id}
                  className={`rounded-2xl border p-5 transition-all hover:shadow-md flex flex-col justify-between ${
                    patient.status === 'active_alert'
                      ? 'border-[#F25F5C]/40 bg-gradient-to-b from-[#FFF1F2]/40 to-white shadow-sm ring-1 ring-[#F25F5C]/20'
                      : patient.status === 'needs_attention'
                      ? 'border-[#F5A524]/40 bg-gradient-to-b from-[#FFFBEB]/40 to-white shadow-sm ring-1 ring-[#F5A524]/20'
                      : 'border-slate-200/80 bg-white hover:border-[#5B5FE8]/30'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Name + 3-State Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="text-lg font-black text-[#1E2243] hover:text-[#5B5FE8] transition-colors leading-snug line-clamp-1"
                        >
                          {patient.full_name}
                        </Link>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {patient.age !== null ? `${patient.age} yrs old` : 'Age unrecorded'} ·{' '}
                          <span className="text-slate-700 font-bold">{patient.diagnosis || 'General Care'}</span>
                        </p>
                      </div>

                      {/* 3-State Badge */}
                      {patient.status === 'active_alert' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#F25F5C] text-white shadow-sm shrink-0">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Active Alert
                        </span>
                      ) : patient.status === 'needs_attention' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F5A524]/15 text-[#B45309] border border-[#F5A524]/30 shrink-0">
                          <AlertCircle className="h-3.5 w-3.5 text-[#F5A524]" />
                          Needs Attention
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#2DD4BF]/15 text-[#0F766E] border border-[#2DD4BF]/30 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                          Normal
                        </span>
                      )}
                    </div>

                    {/* Alert / Attention Reason if present */}
                    {patient.alertReason && (
                      <div className={`p-2.5 rounded-xl text-xs font-medium ${
                        patient.status === 'active_alert'
                          ? 'bg-[#F25F5C]/10 text-[#B91C1C] border border-[#F25F5C]/20'
                          : 'bg-[#F5A524]/10 text-[#B45309] border border-[#F5A524]/20'
                      }`}>
                        <span className="font-bold">Reason: </span>
                        {patient.alertReason}
                      </div>
                    )}

                    {/* Allergies tag if noted */}
                    {patient.allergies && (
                      <div className="flex items-center gap-1.5 text-xs text-[#B91C1C] bg-[#FFF1F2] px-2.5 py-1 rounded-lg border border-[#F25F5C]/20 font-bold">
                        <span>Allergies:</span>
                        <span>{patient.allergies}</span>
                      </div>
                    )}

                    {/* Latest Vitals Grid */}
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Latest Readings</span>
                        {vitals?.logged_at && (
                          <span className="text-slate-400 font-medium lowercase">
                            {new Date(vitals.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {vitals ? (
                        <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200/70">
                            <span className="text-[10px] text-slate-400 block font-bold">BP</span>
                            <span className="font-black text-[#1E2243]">
                              {vitals.bp_systolic && vitals.bp_diastolic
                                ? `${vitals.bp_systolic}/${vitals.bp_diastolic}`
                                : '—'}
                            </span>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200/70">
                            <span className="text-[10px] text-slate-400 block font-bold">HR</span>
                            <span className="font-black text-[#1E2243]">
                              {vitals.heart_rate ? `${vitals.heart_rate}` : '—'}
                            </span>
                          </div>
                          <div className={`p-1.5 rounded-lg border ${
                            vitals.spo2 && vitals.spo2 < 95
                              ? 'bg-[#FFF1F2] border-[#F25F5C]/40 text-[#B91C1C]'
                              : 'bg-white border-slate-200/70 text-[#1E2243]'
                          }`}>
                            <span className="text-[10px] text-slate-400 block font-bold">SpO2</span>
                            <span className="font-black">
                              {vitals.spo2 ? `${vitals.spo2}%` : '—'}
                            </span>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200/70">
                            <span className="text-[10px] text-slate-400 block font-bold">Temp</span>
                            <span className="font-black text-[#1E2243]">
                              {vitals.temperature_c ? `${vitals.temperature_c}°` : '—'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-1 font-medium">No recorded vitals yet</p>
                      )}
                    </div>

                    {/* Assigned Caregiver Info */}
                    <div className="text-xs text-slate-500 font-medium">
                      <span>Caregivers: </span>
                      <strong className="text-slate-700">
                        {patient.caregivers.length > 0 ? patient.caregivers.join(', ') : 'None assigned'}
                      </strong>
                    </div>
                  </div>

                  {/* Action Link to Patient Chart */}
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">ID: {patient.id.slice(0, 8)}...</span>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] transition-all shadow-sm shadow-[#5B5FE8]/25"
                    >
                      <span>Patient Health Status</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
