'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  HeartPulse,
  User,
  Users,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  Calendar,
  Fingerprint,
} from 'lucide-react'

export interface RegisteredUser {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'doctor' | 'caregiver' | 'patient' | 'family_member'
  is_active: boolean
  created_at: string
}

interface RegisteredUsersTableProps {
  users: RegisteredUser[]
}

type UserRole = RegisteredUser['role']

interface RoleDefinition {
  key: UserRole
  title: string
  labelSingular: string
  labelPlural: string
  icon: typeof Stethoscope
  badgeStyle: string
  headerBg: string
  iconColor: string
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: 'doctor',
    title: 'Attending Physicians (Doctors)',
    labelSingular: 'Doctor',
    labelPlural: 'Doctors',
    icon: Stethoscope,
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
    headerBg: 'hover:bg-purple-50/40',
    iconColor: 'text-purple-600 bg-purple-100',
  },
  {
    key: 'caregiver',
    title: 'Bedside Staff (Caregivers)',
    labelSingular: 'Caregiver',
    labelPlural: 'Caregivers',
    icon: HeartPulse,
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    headerBg: 'hover:bg-blue-50/40',
    iconColor: 'text-blue-600 bg-blue-100',
  },
  {
    key: 'patient',
    title: 'Enrolled Patients',
    labelSingular: 'Patient',
    labelPlural: 'Patients',
    icon: User,
    badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200',
    headerBg: 'hover:bg-teal-50/40',
    iconColor: 'text-teal-600 bg-teal-100',
  },
  {
    key: 'family_member',
    title: 'Family Contacts',
    labelSingular: 'Family Contact',
    labelPlural: 'Family Contacts',
    icon: Users,
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
    headerBg: 'hover:bg-amber-50/40',
    iconColor: 'text-amber-600 bg-amber-100',
  },
  {
    key: 'admin',
    title: 'System Administrators',
    labelSingular: 'Admin',
    labelPlural: 'Administrators',
    icon: ShieldCheck,
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    headerBg: 'hover:bg-slate-100/60',
    iconColor: 'text-slate-700 bg-slate-200',
  },
]

export function RegisteredUsersTable({ users }: RegisteredUsersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Track expanded state for each role accordion (default open)
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({
    doctor: true,
    caregiver: true,
    patient: true,
    family_member: true,
    admin: true,
  })

  // Track expanded state for individual user rows
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({})

  // Filter users by full_name or email
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  // Group filtered users by role
  const groupedUsers = useMemo(() => {
    const groups: Record<UserRole, RegisteredUser[]> = {
      doctor: [],
      caregiver: [],
      patient: [],
      family_member: [],
      admin: [],
    }

    for (const u of filteredUsers) {
      if (groups[u.role]) {
        groups[u.role].push(u)
      }
    }

    return groups
  }, [filteredUsers])

  // Determine if a role accordion is open.
  // If an active search query is present, auto-expand any role that has matching users.
  const isRoleExpanded = (role: UserRole) => {
    if (searchQuery.trim()) {
      return expandedRoles[role] !== false
    }
    return expandedRoles[role] ?? true
  }

  const allRolesExpanded = ROLE_DEFINITIONS.every((def) => isRoleExpanded(def.key))

  const toggleAllRoles = () => {
    const nextState = !allRolesExpanded
    const updated: Record<string, boolean> = {}
    ROLE_DEFINITIONS.forEach((def) => {
      updated[def.key] = nextState
    })
    setExpandedRoles(updated)
  }

  const toggleRole = (role: UserRole) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [role]: !isRoleExpanded(role),
    }))
  }

  const toggleUserRow = (userId: string) => {
    setExpandedUserIds((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Directory Header with Quick Search Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#1E2243]">Registered System Users</h2>
          <p className="text-sm font-medium text-slate-500">
            All provisioned accounts with database roles and active status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-gray-300 pl-9 pr-8 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 w-56 sm:w-72"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Expand All / Collapse All Button */}
          <button
            type="button"
            onClick={toggleAllRoles}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer select-none"
            title={allRolesExpanded ? 'Collapse all role groups' : 'Expand all role groups'}
          >
            {allRolesExpanded ? (
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
        </div>
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <Search className="mx-auto h-8 w-8 text-gray-300" />
          <p className="text-base font-bold text-gray-800">No matching users found</p>
          <p className="text-sm font-medium text-gray-500">
            No accounts matched &ldquo;{searchQuery}&rdquo;. Try clearing your search term.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear search filter</span>
          </button>
        </div>
      ) : (
        /* Role Accordions */
        <div className="space-y-3">
          {ROLE_DEFINITIONS.map((def) => {
            const roleUsers = groupedUsers[def.key]
            const isExpanded = isRoleExpanded(def.key)
            const count = roleUsers.length

            // If a search query is active and this group has 0 matches, hide the group
            if (searchQuery.trim() && count === 0) {
              return null
            }

            const RoleIcon = def.icon

            return (
              <div
                key={def.key}
                className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden transition-all duration-150"
              >
                {/* Role Group Accordion Header */}
                <div
                  onClick={() => toggleRole(def.key)}
                  className={`flex items-center justify-between p-3.5 sm:p-4 bg-gray-50/60 cursor-pointer select-none transition-colors border-b border-gray-100 ${def.headerBg}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${def.iconColor}`}
                    >
                      <RoleIcon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#1E2243] text-sm sm:text-base flex items-center gap-2">
                        <span>{def.title}</span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* User Count Pill */}
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold border ${def.badgeStyle}`}
                    >
                      {count} {count === 1 ? def.labelSingular : def.labelPlural}
                    </span>

                    {/* Chevron Toggle Button */}
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? `Collapse ${def.title}` : `Expand ${def.title}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRole(def.key)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Role Group Content */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {count === 0 ? (
                      <div className="py-4 text-center text-sm font-medium text-gray-400">
                        No {def.labelPlural.toLowerCase()} registered in the system yet.
                      </div>
                    ) : (
                      roleUsers.map((u) => {
                        const isUserRowOpen = !!expandedUserIds[u.id]

                        return (
                          <div key={u.id} className="transition-colors hover:bg-gray-50/60">
                            {/* User Row (Clickable) */}
                            <div
                              onClick={() => toggleUserRow(u.id)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm shrink-0 border border-slate-200">
                                  {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-[#1E2243] text-sm sm:text-base truncate">
                                    {u.full_name}
                                  </p>
                                  <p className="font-mono text-xs sm:text-sm text-slate-500 truncate">
                                    {u.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-auto w-full sm:w-auto">
                                <div className="flex items-center gap-3">
                                  {/* Status Pill */}
                                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600">
                                    <span
                                      className={`h-2 w-2 rounded-full ${
                                        u.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                                      }`}
                                    />
                                    {u.is_active ? 'Active' : 'Inactive'}
                                  </span>

                                  {/* Created Date */}
                                  <span className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap hidden sm:inline-block">
                                    Joined {format(new Date(u.created_at), 'MMM dd, yyyy')}
                                  </span>
                                </div>

                                {/* Row Chevron Indicator */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleUserRow(u.id)
                                  }}
                                  aria-expanded={isUserRowOpen}
                                  aria-label={isUserRowOpen ? `Collapse ${u.full_name} details` : `Expand ${u.full_name} details`}
                                  className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  {isUserRowOpen ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Expanded User Details Drawer */}
                            {isUserRowOpen && (
                              <div className="bg-slate-50/70 p-4 sm:px-6 border-t border-slate-100/80 text-sm space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                                  {/* User UUID */}
                                  <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm">
                                    <Fingerprint className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="text-slate-400 select-none">ID:</span>
                                    <span className="truncate text-slate-800 font-medium">{u.id}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(u.id)}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                                      title="Copy User ID"
                                    >
                                      {copiedId === u.id ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>

                                  {/* Joined Full Date */}
                                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 font-medium">
                                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span>Created: {format(new Date(u.created_at), 'PPP pp')}</span>
                                  </div>
                                </div>

                                {/* Quick Action Links */}
                                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2.5">
                                  {u.role === 'patient' && (
                                    <>
                                      <Link
                                        href={`/patients/${u.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-teal-700 transition"
                                      >
                                        <span>View Patient Chart</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </Link>
                                      <Link
                                        href="/care-teams"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                                      >
                                        <span>Manage Care Circle</span>
                                      </Link>
                                    </>
                                  )}

                                  {(u.role === 'caregiver' || u.role === 'doctor') && (
                                    <Link
                                      href="/care-teams"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-blue-700 transition"
                                    >
                                      <span>Manage Assignments</span>
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                  )}

                                  {u.role === 'family_member' && (
                                    <Link
                                      href="/care-teams"
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                                    >
                                      <span>Assign to Patient</span>
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                  )}

                                  {u.role === 'admin' && (
                                    <span className="text-xs sm:text-sm text-slate-500 font-medium italic">
                                      System Administrator • Full audit and provisioning access
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
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
