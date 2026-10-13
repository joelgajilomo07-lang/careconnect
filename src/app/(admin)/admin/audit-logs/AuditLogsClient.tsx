'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  ArrowLeft,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  User,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Lock,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { getAuditLogsAction, type AuditLogItem } from '@/app/actions/auditLogs'

interface Props {
  initialLogs: AuditLogItem[]
  totalLogs: number
  users: Array<{ id: string; full_name: string; role: string; email: string }>
}

export function AuditLogsClient({ initialLogs, totalLogs, users }: Props) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs)
  const [total, setTotal] = useState<number>(totalLogs)
  const [isPending, startTransition] = useTransition()

  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedAction, setSelectedAction] = useState('all')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  // Details Modal
  const [activeDetailLog, setActiveDetailLog] = useState<AuditLogItem | null>(null)

  const fetchLogs = (
    newPage = 1,
    currentFilters: {
      startDate?: string
      endDate?: string
      selectedRole?: string
      selectedAction?: string
      selectedUserId?: string
    } = {}
  ) => {
    startTransition(async () => {
      const res = await getAuditLogsAction({
        startDate: currentFilters.startDate ?? (startDate || undefined),
        endDate: currentFilters.endDate ?? (endDate || undefined),
        userRole: currentFilters.selectedRole ?? (selectedRole !== 'all' ? selectedRole : undefined),
        action: currentFilters.selectedAction ?? (selectedAction !== 'all' ? selectedAction : undefined),
        userId: currentFilters.selectedUserId ?? (selectedUserId || undefined),
        limit: pageSize,
        offset: (newPage - 1) * pageSize,
      })

      if (res.data) {
        setLogs(res.data)
        setTotal(res.total)
        setPage(newPage)
      }
    })
  }

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs(1)
  }

  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedRole('all')
    setSelectedAction('all')
    setSelectedUserId('')
    fetchLogs(1, {
      startDate: undefined,
      endDate: undefined,
      selectedRole: undefined,
      selectedAction: undefined,
      selectedUserId: undefined,
    })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    fetchLogs(newPage)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const getActionBadgeColor = (action: string) => {
    const a = action.toUpperCase()
    if (a.includes('LOGIN') && !a.includes('FAIL')) {
      return 'bg-blue-50 text-blue-700 border-blue-200'
    }
    if (a.includes('FAIL') || a.includes('LOCKOUT') || a.includes('DEACTIVATE') || a.includes('REMOVE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200'
    }
    if (a.includes('CREATE') || a.includes('LINK') || a.includes('REACTIVATE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
    if (a.includes('UPDATE') || a.includes('RESET')) {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF0FF] text-[#5B5FE8]">Admin</span>
      case 'doctor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">Doctor</span>
      case 'caregiver':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">Caregiver</span>
      case 'family_member':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">Family</span>
      case 'patient':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">Patient</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">System</span>
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
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
              System Audit Logs
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
              Figure 13 Task A
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Immutable clinical trail, authentication events, user operations, and care team assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>Read-Only Audit Trail</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS PANEL */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E2243] uppercase tracking-wider">
              <Filter className="h-4 w-4 text-[#5B5FE8]" />
              <span>Filter Logs</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-slate-500 hover:text-[#5B5FE8] transition-colors"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              />
            </div>

            {/* User Role */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="doctor">Doctor</option>
                <option value="caregiver">Caregiver</option>
                <option value="family_member">Family Member</option>
                <option value="patient">Patient</option>
              </select>
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Action Type
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              >
                <option value="all">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="FAILED_LOGIN">FAILED_LOGIN</option>
                <option value="ACCOUNT_LOCKOUT">ACCOUNT_LOCKOUT</option>
                <option value="USER_CREATE">USER_CREATE</option>
                <option value="USER_UPDATE">USER_UPDATE</option>
                <option value="USER_DEACTIVATE">USER_DEACTIVATE</option>
                <option value="USER_REACTIVATE">USER_REACTIVATE</option>
                <option value="PASSWORD_RESET">PASSWORD_RESET</option>
                <option value="PATIENT_CREATE">PATIENT_CREATE</option>
                <option value="PATIENT_UPDATE">PATIENT_UPDATE</option>
                <option value="CARE_ASSIGNMENT_ADD">CARE_ASSIGNMENT_ADD</option>
                <option value="CARE_ASSIGNMENT_REMOVE">CARE_ASSIGNMENT_REMOVE</option>
                <option value="PATIENT_ACCOUNT_LINK">PATIENT_ACCOUNT_LINK</option>
                <option value="PATIENT_ACCOUNT_UNLINK">PATIENT_ACCOUNT_UNLINK</option>
                <option value="SHIFT_REPORT_SUBMIT">SHIFT_REPORT_SUBMIT</option>
                <option value="ADDENDUM_ADD">ADDENDUM_ADD</option>
              </select>
            </div>

            {/* User */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Specific User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </section>

      {/* AUDIT LOGS TABLE */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span> total audit entries
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isPending}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isPending}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Record Type</th>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No audit log records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const createdAt = new Date(log.created_at)
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {format(createdAt, 'MMM d, yyyy h:mm:ss a')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatDistanceToNow(createdAt, { addSuffix: true })}
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {log.user_name || 'System / Unauthenticated'}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getRoleBadge(log.user_role)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Record Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {log.record_type || '—'}
                      </td>

                      {/* Record ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {log.record_id ? `${log.record_id.slice(0, 8)}...` : '—'}
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {log.details ? (
                          <button
                            type="button"
                            onClick={() => setActiveDetailLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-[#5B5FE8] hover:text-[#5B5FE8] text-[11px] font-bold transition-colors"
                          >
                            <Info className="h-3 w-3" />
                            <span>Inspect</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DETAIL INSPECT MODAL */}
      {activeDetailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#5B5FE8]" />
                <h3 className="text-lg font-bold text-[#1E2243]">Audit Event Detail</h3>
              </div>
              <button
                onClick={() => setActiveDetailLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                  Action
                </span>
                <span className="font-extrabold text-slate-900">{activeDetailLog.action}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                  User
                </span>
                <span className="font-medium text-slate-900">
                  {activeDetailLog.user_name || 'System'} ({activeDetailLog.user_role || 'none'})
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                  Timestamp
                </span>
                <span className="font-medium text-slate-900">
                  {format(new Date(activeDetailLog.created_at), 'MMM d, yyyy h:mm:ss a')}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                  Record Type / ID
                </span>
                <span className="font-mono text-slate-900">
                  {activeDetailLog.record_type || '—'}: {activeDetailLog.record_id || '—'}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Event Payload &amp; Metadata
              </span>
              <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60">
                {JSON.stringify(activeDetailLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDetailLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
