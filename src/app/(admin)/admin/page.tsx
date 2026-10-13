import { requireRole } from '@/lib/auth/roleGuard'
import Link from 'next/link'
import { adminDashboardService } from '@/services/adminDashboardService'
import {
  Users,
  Stethoscope,
  HeartPulse,
  UserCheck,
  FileCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserPlus,
  User,
  Shield,
  FileText,
  ClipboardList,
  AlertCircle,
  Pill,
  Calendar,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const metadata = {
  title: 'Administrator Dashboard | CareConnect',
  description: 'Tender Touch Home Care Services – System Administration and Clinical Oversight',
}

export default async function AdminDashboardPage() {
  await requireRole(['admin'])

  const [metrics, pendingReports, recentAlerts] = await Promise.all([
    adminDashboardService.getMetrics(),
    adminDashboardService.getPendingReports(),
    adminDashboardService.getRecentAlerts(),
  ])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical_alert':
        return <AlertTriangle className="h-4 w-4 text-[#F25F5C] shrink-0" />
      case 'urgent_update':
        return <AlertCircle className="h-4 w-4 text-[#F25F5C] shrink-0" />
      case 'medication_alert':
        return <Pill className="h-4 w-4 text-[#F5A524] shrink-0" />
      default:
        return <AlertTriangle className="h-4 w-4 text-[#F25F5C] shrink-0" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2243] tracking-tight">
              Administrator Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
              Tender Touch Agency
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Clinical reporting compliance, care assignments, and system-wide alerts in Dumaguete City.
          </p>
        </div>

        {/* Quick Links Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add User</span>
          </Link>
          <Link
            href="/admin/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#5B5FE8] hover:border-[#5B5FE8] text-xs font-bold shadow-xs transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            <span>Add Patient</span>
          </Link>
          <Link
            href="/admin/audit-logs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#5B5FE8] hover:border-[#5B5FE8] text-xs font-bold shadow-xs transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Audit Logs</span>
          </Link>
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#5B5FE8] hover:border-[#5B5FE8] text-xs font-bold shadow-xs transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Reports</span>
          </Link>
        </div>
      </div>

      {/* 1. Summary Cards (5 Key Metrics) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          1. System Directory & Accounts
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Active Patients */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-[#5B5FE8]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Patients
              </span>
              <div className="h-8 w-8 rounded-xl bg-teal-50 text-[#2DD4BF] flex items-center justify-center">
                <HeartPulse className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#1E2243] mt-2">
              {metrics.activePatients}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Enrolled in home care
            </p>
          </div>

          {/* Caregivers */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-[#5B5FE8]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Caregivers
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#EEF0FF] text-[#5B5FE8] flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#1E2243] mt-2">
              {metrics.caregivers}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Active bedside staff
            </p>
          </div>

          {/* Doctors */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-[#5B5FE8]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Doctors
              </span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Stethoscope className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#1E2243] mt-2">
              {metrics.doctors}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Attending physicians
            </p>
          </div>

          {/* Patient Accounts */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-[#5B5FE8]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Patient Accounts
              </span>
              <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#1E2243] mt-2">
              {metrics.patientAccounts}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Linked patient logins
            </p>
          </div>

          {/* Family Members */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-[#5B5FE8]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Family Members
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-[#F5A524] flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#1E2243] mt-2">
              {metrics.familyMembers}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Authorized portal access
            </p>
          </div>
        </div>
      </div>

      {/* 2. Today's Reporting Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          2. Today's Reporting Compliance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Shift Reports Submitted Today */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  Completed
                </span>
                <span className="text-xs font-semibold text-slate-500">Current Day</span>
              </div>
              <h3 className="text-lg font-bold text-[#1E2243] mt-2">
                Shift Reports Submitted Today
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Caregiver shift logs recorded and synced to doctor triage.
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-black text-emerald-700">
                {metrics.reportsSubmittedToday}
              </span>
              <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center justify-end gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>On file</span>
              </p>
            </div>
          </div>

          {/* Pending Reports */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-amber-100 text-amber-800">
                  Action Required
                </span>
                <span className="text-xs font-semibold text-slate-500">Due This Shift</span>
              </div>
              <h3 className="text-lg font-bold text-[#1E2243] mt-2">
                Pending Reports
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Assigned caregiver-patient pairs awaiting shift report submission.
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-black text-amber-700">
                {metrics.pendingReportsCount}
              </span>
              <p className="text-xs font-semibold text-amber-600 mt-1 flex items-center justify-end gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Awaiting log</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Layout: Pending Reports Table + Recent Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Column: Pending Reports Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#1E2243]">
                Pending Reports (Current Shift)
              </h2>
              <p className="text-xs text-slate-500">
                Caregivers with assigned patients who have not submitted a report for the current shift.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {pendingReports.length} Pending
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {pendingReports.length === 0 ? (
              <div className="p-10 text-center">
                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1E2243]">
                  All Shift Reports Submitted
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  100% compliance: all active caregiver-patient pairs have logged their current shift reports.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Caregiver</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Shift</th>
                      <th className="py-3 px-4">Time Elapsed</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingReports.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#1E2243]">{item.caregiverName}</p>
                          {item.caregiverEmail && (
                            <p className="text-[10px] text-slate-400">{item.caregiverEmail}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/patients/${item.patientId}`}
                            className="font-bold text-[#5B5FE8] hover:underline"
                          >
                            {item.patientName}
                          </Link>
                          {item.diagnosis && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {item.diagnosis}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.shift}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            {item.timeSinceStartFormatted}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Alerts Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#1E2243]">
                Recent Clinical Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Latest 10 high-priority alerts across all patients.
              </p>
            </div>
            <Link
              href="/notifications"
              className="text-xs font-bold text-[#5B5FE8] hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {recentAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-[#1E2243]">No active clinical alerts</p>
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.link || '/notifications'}
                  className="p-3.5 flex items-start gap-3 hover:bg-rose-50/50 transition-colors group block"
                >
                  <div className="mt-0.5 rounded-xl bg-rose-100 p-2 shrink-0 group-hover:scale-105 transition-transform">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-[#F25F5C] truncate">
                        {alert.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {alert.patientName && (
                      <p className="text-[11px] font-bold text-[#1E2243] mt-0.5">
                        Patient: {alert.patientName}
                      </p>
                    )}

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-0.5">
                      {alert.message}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}