'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ManagedUser, UnlinkedPatient, UserRole } from '@/app/actions/userManagement'
import {
  createUserAction,
  updateUserAction,
  toggleUserStatusAction,
  resetUserPasswordAction,
} from '@/app/actions/userManagement'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  KeyRound,
  Shield,
  Stethoscope,
  HeartPulse,
  User,
  ShieldAlert,
  Loader2,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Check,
} from 'lucide-react'
import { format } from 'date-fns'

interface UsersManagementClientProps {
  initialUsers: ManagedUser[]
  unlinkedPatients: UnlinkedPatient[]
  currentAdminId: string
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; badge: string; icon: typeof User }
> = {
  admin: {
    label: 'Administrator',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Shield,
  },
  doctor: {
    label: 'Doctor',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Stethoscope,
  },
  caregiver: {
    label: 'Caregiver',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: HeartPulse,
  },
  family_member: {
    label: 'Family Member',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Users,
  },
  patient: {
    label: 'Patient',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: User,
  },
}

export function UsersManagementClient({
  initialUsers,
  unlinkedPatients,
  currentAdminId,
}: UsersManagementClientProps) {
  const router = useRouter()
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [isPending, startTransition] = useTransition()

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [passwordResetUser, setPasswordResetUser] = useState<ManagedUser | null>(null)
  const [confirmStatusUser, setConfirmStatusUser] = useState<{
    user: ManagedUser
    newStatus: boolean
  } | null>(null)

  // Add User Form State
  const [addFullName, setAddFullName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<UserRole>('caregiver')
  const [addPassword, setAddPassword] = useState('')
  const [addShowPassword, setAddShowPassword] = useState(false)
  const [addLinkPatientId, setAddLinkPatientId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('caregiver')
  const [editPhone, setEditPhone] = useState('')
  const [editLinkPatientId, setEditLinkPatientId] = useState('')

  // Password Reset State
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  // Action error toast
  const [actionError, setActionError] = useState<string | null>(null)

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRole = roleFilter === 'all' || u.role === roleFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  // Open Edit Modal
  const handleOpenEdit = (u: ManagedUser) => {
    setEditingUser(u)
    setEditFullName(u.full_name)
    setEditRole(u.role)
    setEditPhone(u.phone || '')
    setEditLinkPatientId(u.linkedPatient?.id || '')
    setFormError(null)
  }

  // Submit Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!addFullName.trim() || !addEmail.trim()) {
      setFormError('Full name and email are required.')
      return
    }

    if (!addPassword || addPassword.length < 8) {
      setFormError('Temporary password must be at least 8 characters long.')
      return
    }

    startTransition(async () => {
      const res = await createUserAction({
        fullName: addFullName,
        email: addEmail,
        role: addRole,
        password: addPassword,
        linkPatientId: addRole === 'patient' && addLinkPatientId ? addLinkPatientId : undefined,
      })

      if (res.error) {
        setFormError(res.error)
      } else {
        setFormSuccess(`User ${addFullName} created successfully!`)
        setTimeout(() => {
          setIsAddModalOpen(false)
          setAddFullName('')
          setAddEmail('')
          setAddPassword('')
          setAddRole('caregiver')
          setAddLinkPatientId('')
          setFormSuccess(null)
          router.refresh()
        }, 1200)
      }
    })
  }

  // Submit Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setFormError(null)

    startTransition(async () => {
      const res = await updateUserAction({
        userId: editingUser.id,
        fullName: editFullName,
        role: editRole,
        phone: editPhone,
        linkPatientId: editRole === 'patient' && editLinkPatientId ? editLinkPatientId : undefined,
      })

      if (res.error) {
        setFormError(res.error)
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  full_name: editFullName,
                  role: editRole,
                  phone: editPhone,
                }
              : u
          )
        )
        setEditingUser(null)
        router.refresh()
      }
    })
  }

  // Confirm Toggle Status (Deactivate / Reactivate)
  const handleConfirmToggleStatus = async () => {
    if (!confirmStatusUser) return
    const { user, newStatus } = confirmStatusUser
    setActionError(null)

    if (user.id === currentAdminId && !newStatus) {
      setActionError('An administrator cannot deactivate their own account.')
      setConfirmStatusUser(null)
      return
    }

    startTransition(async () => {
      const res = await toggleUserStatusAction(user.id, newStatus)
      if (res.error) {
        setActionError(res.error)
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
        )
        setConfirmStatusUser(null)
        router.refresh()
      }
    })
  }

  // Submit Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordResetUser) return
    setResetError(null)
    setResetSuccess(null)

    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.')
      return
    }

    startTransition(async () => {
      const res = await resetUserPasswordAction(passwordResetUser.id, newPassword)
      if (res.error) {
        setResetError(res.error)
      } else {
        setResetSuccess('Password has been reset successfully.')
        setTimeout(() => {
          setPasswordResetUser(null)
          setNewPassword('')
          setResetSuccess(null)
        }, 1200)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2243] tracking-tight">
              User Account Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
              5 Roles
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Provision, edit, and deactivate accounts for administrators, doctors, caregivers, patients, and family members.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true)
            setFormError(null)
            setFormSuccess(null)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] font-bold text-xs uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-700 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30 focus:border-[#5B5FE8]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30"
            >
              <option value="all">All Roles ({users.length})</option>
              <option value="admin">Administrator</option>
              <option value="doctor">Doctor</option>
              <option value="caregiver">Caregiver</option>
              <option value="family_member">Family Member</option>
              <option value="patient">Patient</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-[#1E2243]">No users found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your search criteria or role filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role] || {
                    label: u.role,
                    badge: 'bg-slate-100 text-slate-800 border-slate-200',
                    icon: User,
                  }
                  const RoleIcon = roleConfig.icon
                  const isCurrentAdmin = u.id === currentAdminId

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        !u.is_active ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              u.is_active
                                ? 'bg-[#EEF0FF] text-[#5B5FE8]'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {u.full_name[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-[#1E2243] text-xs sm:text-sm">
                                {u.full_name}
                              </p>
                              {isCurrentAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{u.email}</p>
                            {u.linkedPatient && (
                              <p className="text-[10px] font-semibold text-[#5B5FE8] mt-0.5 flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                <span>Linked Patient: {u.linkedPatient.full_name}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${roleConfig.badge}`}
                        >
                          <RoleIcon className="h-3 w-3 shrink-0" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Date Created */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#5B5FE8] hover:border-[#5B5FE8] hover:bg-[#EEF0FF] transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Reset Password button */}
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordResetUser(u)
                              setNewPassword('')
                              setResetError(null)
                              setResetSuccess(null)
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          {/* Deactivate / Reactivate button */}
                          {u.is_active ? (
                            <button
                              type="button"
                              disabled={isCurrentAdmin}
                              onClick={() =>
                                setConfirmStatusUser({ user: u, newStatus: false })
                              }
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isCurrentAdmin
                                  ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                                  : 'border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 cursor-pointer'
                              }`}
                              title={
                                isCurrentAdmin
                                  ? 'Cannot deactivate your own account'
                                  : 'Deactivate Account'
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmStatusUser({ user: u, newStatus: true })
                              }
                              className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Reactivate Account"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-[#EEF0FF] text-[#5B5FE8] flex items-center justify-center font-bold">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E2243]">Add New User</h3>
                  <p className="text-xs text-slate-400">Provision a new account across the 5 roles</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4 pt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30 focus:border-[#5B5FE8]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. msantos@tendertouch.ph"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30 focus:border-[#5B5FE8]"
                />
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  System Role *
                </label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30"
                >
                  <option value="caregiver">Caregiver (Bedside Care Staff)</option>
                  <option value="doctor">Doctor (Attending Physician)</option>
                  <option value="family_member">Family Member (Linked Portal Access)</option>
                  <option value="patient">Patient (Patient Health Portal)</option>
                  <option value="admin">Administrator (System Admin)</option>
                </select>
              </div>

              {/* Optional: Link to Patient Record if Role = Patient */}
              {addRole === 'patient' && (
                <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-1.5">
                  <label className="block text-xs font-bold text-sky-900">
                    Link to existing patient record (Optional):
                  </label>
                  <select
                    value={addLinkPatientId}
                    onChange={(e) => setAddLinkPatientId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="">Create new standalone patient record</option>
                    {unlinkedPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} {p.diagnosis ? `(${p.diagnosis})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-sky-700">
                    Fills `patients.user_id` so the patient logs in directly into their record.
                  </p>
                </div>
              )}

              {/* Temporary Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Temporary Password *
                </label>
                <div className="relative">
                  <input
                    type={addShowPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30 focus:border-[#5B5FE8]"
                  />
                  <button
                    type="button"
                    onClick={() => setAddShowPassword(!addShowPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {addShowPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Password strength: min 8 characters. The user can reset upon first login.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E2243]">Edit User Account</h3>
                  <p className="text-xs text-slate-400">{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0917-123-4567"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Role *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30"
                >
                  <option value="caregiver">Caregiver</option>
                  <option value="doctor">Doctor</option>
                  <option value="family_member">Family Member</option>
                  <option value="patient">Patient</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Patient link if patient role */}
              {editRole === 'patient' && (
                <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-1.5">
                  <label className="block text-xs font-bold text-sky-900">
                    Linked Patient Record:
                  </label>
                  <select
                    value={editLinkPatientId}
                    onChange={(e) => setEditLinkPatientId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="">Keep current link or unlinked</option>
                    {unlinkedPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} {p.diagnosis ? `(${p.diagnosis})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password Modal */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E2243]">Reset User Password</h3>
                  <p className="text-xs text-slate-400">{passwordResetUser.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Resets password and clears failed attempt lockouts immediately.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Set New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Deactivate / Reactivate Confirmation Dialog */}
      {confirmStatusUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${
                confirmStatusUser.newStatus
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {confirmStatusUser.newStatus ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-[#1E2243]">
                {confirmStatusUser.newStatus
                  ? `Reactivate ${confirmStatusUser.user.full_name}?`
                  : `Deactivate ${confirmStatusUser.user.full_name}?`}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {confirmStatusUser.newStatus
                  ? 'The user will regain immediate access to sign in to CareConnect.'
                  : 'The user will be immediately logged out and blocked from signing in.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmStatusUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors ${
                  confirmStatusUser.newStatus
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : confirmStatusUser.newStatus ? (
                  'Reactivate Account'
                ) : (
                  'Deactivate Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
