'use client'

import { useState, useTransition, useMemo } from 'react'
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
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react'

type CareTeamRow = Tables<'care_teams'>

export interface CareTeamAssignmentWithUsers extends CareTeamRow {
  patient: Tables<'users'> | null
  member: Tables<'users'> | null
}

interface CareTeamsTableProps {
  assignments: CareTeamAssignmentWithUsers[]
}

interface PatientGroup {
  patientId: string
  patientName: string
  patient: Tables<'users'> | null
  assignments: CareTeamAssignmentWithUsers[]
  counts: {
    total: number
    doctors: number
    caregivers: number
    family: number
    active: number
  }
}

export function CareTeamsTable({ assignments }: CareTeamsTableProps) {
  const [isPending, startTransition] = useTransition()
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'caregiver' | 'family_member'>('all')
  const [activeOnly, setActiveOnly] = useState(false)

  // Track expanded state per patient
  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({})

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const roleStyles = {
    doctor: 'bg-purple-50 text-purple-700 border-purple-200',
    caregiver: 'bg-blue-50 text-blue-700 border-blue-200',
    family_member: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  // Filter assignments based on search query, role filter, and active status
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
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
  }, [assignments, activeOnly, roleFilter, searchQuery])

  // Group filtered assignments by patient
  const patientGroups = useMemo(() => {
    const groupsMap = new Map<string, PatientGroup>()

    for (const a of filteredAssignments) {
      const pId = a.patient_id || a.patient?.id || 'unknown'
      const pName = a.patient?.full_name || 'Unnamed Patient'

      if (!groupsMap.has(pId)) {
        groupsMap.set(pId, {
          patientId: pId,
          patientName: pName,
          patient: a.patient,
          assignments: [],
          counts: {
            total: 0,
            doctors: 0,
            caregivers: 0,
            family: 0,
            active: 0,
          },
        })
      }

      const group = groupsMap.get(pId)!
      group.assignments.push(a)
      group.counts.total += 1
      if (a.is_active) group.counts.active += 1
      if (a.member_role === 'doctor') group.counts.doctors += 1
      else if (a.member_role === 'caregiver') group.counts.caregivers += 1
      else if (a.member_role === 'family_member') group.counts.family += 1
    }

    return Array.from(groupsMap.values())
  }, [filteredAssignments])

  // Determine if a patient accordion is expanded
  // Auto-expands when an active search query is present unless explicitly closed
  const isPatientExpanded = (patientId: string) => {
    if (searchQuery.trim()) {
      return expandedPatients[patientId] !== false
    }
    return expandedPatients[patientId] ?? false
  }

  const allExpanded = patientGroups.length > 0 && patientGroups.every((g) => isPatientExpanded(g.patientId))

  const toggleAll = () => {
    const nextState = !allExpanded
    const updated: Record<string, boolean> = {}
    patientGroups.forEach((g) => {
      updated[g.patientId] = nextState
    })
    setExpandedPatients(updated)
  }

  const togglePatient = (patientId: string) => {
    setExpandedPatients((prev) => {
      const current = isPatientExpanded(patientId)
      return {
        ...prev,
        [patientId]: !current,
      }
    })
  }

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#1E2243] flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            All Care Team Pairings
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Active pairings establish database visibility across triage queues, charts, and alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient, staff, or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 w-52 sm:w-64"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as 'all' | 'doctor' | 'caregiver' | 'family_member')
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="caregiver">Caregivers</option>
            <option value="family_member">Family</option>
          </select>

          {/* Active Only Toggle */}
          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span>Active only</span>
          </label>

          {/* Expand All / Collapse All Toggle Button */}
          {patientGroups.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer select-none"
              title={allExpanded ? 'Collapse all patient groups' : 'Expand all patient groups'}
            >
              {allExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                  <span>Expand All</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Feedback alerts */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Patient Grouped Accordions */}
      {patientGroups.length === 0 ? (
        <div className="py-8 text-center text-sm font-medium text-gray-400">
          No care team pairings match your search/filter criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {patientGroups.map((group) => {
            const expanded = isPatientExpanded(group.patientId)

            return (
              <div
                key={group.patientId}
                className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden transition-all duration-150"
              >
                {/* Collapsible Patient Header (Dropdown Bar) */}
                <div
                  onClick={() => togglePatient(group.patientId)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50/70 hover:bg-gray-100/80 cursor-pointer select-none transition-colors border-b border-gray-100"
                >
                  {/* Patient Name & Composition */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-[#1E2243] text-sm sm:text-base truncate">
                        {group.patientName}
                      </h3>
                      <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                        {group.counts.total} Assigned Member{group.counts.total !== 1 ? 's' : ''}
                        {' • '}
                        {group.counts.active} Active
                      </p>
                    </div>
                  </div>

                  {/* Composition Pills & Expand/Collapse Icon */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                    {/* Role count pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                      {group.counts.doctors > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold border bg-purple-50 text-purple-700 border-purple-200">
                          {group.counts.doctors} Doctor{group.counts.doctors > 1 ? 's' : ''}
                        </span>
                      )}
                      {group.counts.caregivers > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold border bg-blue-50 text-blue-700 border-blue-200">
                          {group.counts.caregivers} Caregiver{group.counts.caregivers > 1 ? 's' : ''}
                        </span>
                      )}
                      {group.counts.family > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold border bg-amber-50 text-amber-700 border-amber-200">
                          {group.counts.family} Family
                        </span>
                      )}
                    </div>

                    {/* Expand/Collapse Chevron Button */}
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={expanded ? `Collapse ${group.patientName} care team` : `Expand ${group.patientName} care team`}
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePatient(group.patientId)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Dropdown Body (Team Roster) */}
                {expanded && (
                  <div className="p-3 sm:p-4 bg-white space-y-3">
                    {/* Mobile View (< sm) */}
                    <div className="block sm:hidden space-y-3">
                      {group.assignments.map((assignment) => {
                        const isDeactivating = deactivatingId === assignment.id
                        const isConfirming = confirmingId === assignment.id

                        return (
                          <div
                            key={assignment.id}
                            className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                              <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                  Team Member
                                </span>
                                <h4 className="font-bold text-[#1E2243] text-sm sm:text-base mt-0.5">
                                  {assignment.member?.full_name || 'Member'}
                                </h4>
                                <p className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
                                  {assignment.member?.email}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold border capitalize ${
                                  roleStyles[assignment.member_role as keyof typeof roleStyles] ||
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {assignment.member_role.replace('_', ' ')}
                              </span>
                            </div>

                            {assignment.relationship_label && (
                              <div className="text-slate-700 text-sm">
                                <span className="font-bold">Specialty / Role:</span>{' '}
                                <span className="italic">{assignment.relationship_label}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-slate-600">
                              <div>
                                {assignment.is_active ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 font-bold">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 font-bold">
                                    <span className="h-2 w-2 rounded-full bg-gray-300" />
                                    Inactive
                                  </span>
                                )}
                              </div>

                              <div>
                                {assignment.is_active ? (
                                  isConfirming ? (
                                    <div className="inline-flex items-center gap-2">
                                      <span className="text-xs sm:text-sm text-red-600 font-bold">Confirm?</span>
                                      <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => handleDeactivate(assignment.id)}
                                        className="min-h-[40px] px-3 rounded-lg bg-red-600 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors"
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
                                        className="min-h-[40px] px-3 rounded-lg border border-gray-300 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingId(assignment.id)}
                                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-lg border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
                                    >
                                      <UserX className="h-4 w-4" />
                                      <span>Deactivate</span>
                                    </button>
                                  )
                                ) : (
                                  <span className="text-xs sm:text-sm text-slate-400 italic">Archived</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Desktop / Tablet Table View (sm+) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50/80 text-slate-500 font-bold text-xs uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Team Member</th>
                            <th className="py-3 px-4">Member Role</th>
                            <th className="py-3 px-4">Relationship / Specialty</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Assigned Date</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.assignments.map((assignment) => {
                            const isDeactivating = deactivatingId === assignment.id
                            const isConfirming = confirmingId === assignment.id

                            return (
                              <tr
                                key={assignment.id}
                                className="hover:bg-gray-50/70 transition-colors duration-150"
                              >
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="font-bold text-[#1E2243] text-sm sm:text-base">
                                    {assignment.member?.full_name || 'Member'}
                                  </div>
                                  <div className="text-xs sm:text-sm text-slate-500 font-mono">
                                    {assignment.member?.email}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold border capitalize ${
                                      roleStyles[assignment.member_role as keyof typeof roleStyles] ||
                                      'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {assignment.member_role.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap text-sm">
                                  {assignment.relationship_label || '—'}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {assignment.is_active ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 font-bold">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 font-bold">
                                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                                      Inactive
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap text-xs sm:text-sm">
                                  {format(new Date(assignment.assigned_at), 'MMM dd, yyyy · HH:mm')}
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {assignment.is_active ? (
                                    isConfirming ? (
                                      <div className="inline-flex items-center gap-2">
                                        <span className="text-xs sm:text-sm text-red-600 font-bold">
                                          Deactivate?
                                        </span>
                                        <button
                                          type="button"
                                          disabled={isPending}
                                          onClick={() => handleDeactivate(assignment.id)}
                                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors"
                                        >
                                          {isDeactivating ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            'Yes'
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmingId(null)}
                                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmingId(assignment.id)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
                                      >
                                        <UserX className="h-3.5 w-3.5" />
                                        <span>Deactivate</span>
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-xs sm:text-sm text-slate-400 italic">Archived</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
