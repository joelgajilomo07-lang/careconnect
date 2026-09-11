'use client'

import { useState, useTransition } from 'react'
import { removeCareTeamMemberAction } from '@/app/(admin)/actions'
import type { Tables } from '@/types/database.types'
import { format } from 'date-fns'
import {
  Users,
  UserX,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
} from 'lucide-react'

type CareTeamRow = Tables<'care_teams'>

export interface CareTeamAssignmentWithUsers extends CareTeamRow {
  patient: Tables<'users'> | null
  member: Tables<'users'> | null
}

interface CareTeamsTableProps {
  assignments: CareTeamAssignmentWithUsers[]
}

export function CareTeamsTable({ assignments }: CareTeamsTableProps) {
  const [isPending, startTransition] = useTransition()
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'caregiver' | 'family_member'>('all')
  const [activeOnly, setActiveOnly] = useState(false)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const roleStyles = {
    doctor: 'bg-purple-50 text-purple-700 border-purple-200',
    caregiver: 'bg-blue-50 text-blue-700 border-blue-200',
    family_member: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    if (activeOnly && a.is_active !== true) return false
    if (roleFilter !== 'all' && a.member_role !== roleFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const patientMatch = a.patient?.full_name?.toLowerCase().includes(q)
      const memberMatch = a.member?.full_name?.toLowerCase().includes(q)
      const labelMatch = a.relationship_label?.toLowerCase().includes(q)
      if (!patientMatch && !memberMatch && !labelMatch) return false
    }
    return true
  })

  function handleDeactivate(id: string) {
    setErrorMsg(null)
    setSuccessMsg(null)
    setDeactivatingId(id)

    startTransition(async () => {
      const res = await removeCareTeamMemberAction(id)
      setDeactivatingId(null)
      setConfirmingId(null)

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Care team assignment soft-deactivated. Historical audit trail preserved.')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            All Care Team Pairings
          </h2>
          <p className="text-xs text-gray-500">
            Active pairings establish database visibility across triage queues, charts, and alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient, staff, or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-gray-300 pl-8 pr-3 py-1.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 w-44 sm:w-56"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="caregiver">Caregivers</option>
            <option value="family_member">Family</option>
          </select>

          {/* Active Only Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Active only</span>
          </label>
        </div>
      </div>

      {/* Feedback alerts */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table & Mobile Cards */}
      {filteredAssignments.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          No care team pairings match your search/filter criteria.
        </div>
      ) : (
        <>
          {/* Mobile Card View (< sm) */}
          <div className="block sm:hidden space-y-3">
            {filteredAssignments.map((assignment) => {
              const isDeactivating = deactivatingId === assignment.id
              const isConfirming = confirmingId === assignment.id

              return (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Patient</span>
                      <h4 className="font-bold text-gray-900 text-sm">{assignment.patient?.full_name || 'Patient'}</h4>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                        roleStyles[assignment.member_role as keyof typeof roleStyles] ||
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {assignment.member_role.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Assigned Member</span>
                    <div className="font-semibold text-gray-800">{assignment.member?.full_name || 'Member'}</div>
                    <div className="text-[11px] text-gray-500 font-mono truncate">{assignment.member?.email}</div>
                    {assignment.relationship_label && (
                      <div className="text-[11px] text-gray-600 italic mt-0.5">Role label: {assignment.relationship_label}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-gray-500">
                    <div>
                      {assignment.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                          Inactive
                        </span>
                      )}
                    </div>

                    <div>
                      {assignment.is_active ? (
                        isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-[11px] text-red-600 font-medium">Confirm?</span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDeactivate(assignment.id)}
                              className="min-h-[44px] px-3 rounded-lg bg-red-600 font-bold text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors duration-150"
                            >
                              {isDeactivating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Yes'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              className="min-h-[44px] px-3 rounded-lg border border-gray-300 font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 transition-colors duration-150"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingId(assignment.id)}
                            className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors duration-150"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Deactivate</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Archived</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop / Tablet Table View (sm+) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Team Member</th>
                  <th className="py-2.5 px-3">Member Role</th>
                  <th className="py-2.5 px-3">Relationship Label</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assigned Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssignments.map((assignment) => {
                  const isDeactivating = deactivatingId === assignment.id
                  const isConfirming = confirmingId === assignment.id

                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50/70 transition-colors duration-150">
                      <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                        {assignment.patient?.full_name || 'Patient'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {assignment.member?.full_name || 'Member'}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {assignment.member?.email}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                            roleStyles[assignment.member_role as keyof typeof roleStyles] ||
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {assignment.member_role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {assignment.relationship_label || '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {assignment.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                        {format(new Date(assignment.assigned_at), 'MMM dd, yyyy · HH:mm')}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {assignment.is_active ? (
                          isConfirming ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[11px] text-red-600 font-medium">Deactivate?</span>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeactivate(assignment.id)}
                                className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors duration-150"
                              >
                                {isDeactivating ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Yes'
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className="rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 transition-colors duration-150"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingId(assignment.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors duration-150"
                            >
                              <UserX className="h-3 w-3" />
                              <span>Deactivate</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Archived</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
