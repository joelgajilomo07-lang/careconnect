'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCheck,
  Stethoscope,
  HeartPulse,
  UserPlus,
  Shield,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Unlink,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  ArrowLeft,
  X,
  Lock,
  Mail,
  User,
  Heart,
  ChevronRight,
  Activity,
} from 'lucide-react'
import {
  savePatientAction,
  assignCaregiverAction,
  assignDoctorAction,
  assignFamilyMemberAction,
  removeCareAssignmentAction,
  linkPatientAccountAction,
  unlinkPatientAccountAction,
  createAndLinkPatientAccountAction,
  getPatientManagementDataAction,
  type PatientRecord,
  type CandidateUser,
  type PatientManagementData,
} from '@/app/actions/patientManagement'

interface Props {
  initialData: PatientManagementData
}

export function PatientsManagementClient({ initialData }: Props) {
  const router = useRouter()
  const [data, setData] = useState<PatientManagementData>(initialData)
  const [isPending, startTransition] = useTransition()

  // Directory filter & search
  const [searchQuery, setSearchQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState<'all' | 'linked' | 'unlinked'>('all')

  // Selected Patient for Profile & Care Team Editing
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialData.patients.length > 0 ? initialData.patients[0].id : null
  )
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Status & notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Patient Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    birth_date: '',
    sex: 'Male',
    address: '',
    diagnosis: '',
    allergies: 'NKDA (No Known Drug Allergies)',
    medical_history: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  })

  // Caregiver assignment form state
  const [caregiverForm, setCaregiverForm] = useState({
    caregiverId: '',
    startDate: new Date().toISOString().slice(0, 10),
    shiftLabel: 'Bedside Caregiver',
  })

  // Doctor assignment form state
  const [doctorForm, setDoctorForm] = useState({
    doctorId: '',
    relationshipLabel: 'Primary Attending Physician',
  })

  // Family member assignment form state
  const [familyForm, setFamilyForm] = useState({
    familyUserId: '',
    relationshipLabel: 'Primary Family Contact',
  })

  // Account linking state
  const [accountMode, setAccountMode] = useState<'link' | 'create'>('link')
  const [linkExistingUserId, setLinkExistingUserId] = useState('')
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountPassword, setNewAccountPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)

  // Current selected patient object
  const selectedPatient = useMemo(() => {
    if (isCreatingNew) return null
    return data.patients.find((p) => p.id === selectedPatientId) || null
  }, [data.patients, selectedPatientId, isCreatingNew])

  // Sync profile form when selected patient changes
  const handleSelectPatient = (patient: PatientRecord) => {
    setIsCreatingNew(false)
    setSelectedPatientId(patient.id)
    setFeedback(null)
    setProfileForm({
      full_name: patient.full_name || '',
      birth_date: patient.birth_date ? patient.birth_date.slice(0, 10) : '',
      sex: patient.sex || 'Male',
      address: patient.address || '',
      diagnosis: patient.diagnosis || '',
      allergies: patient.allergies || 'NKDA (No Known Drug Allergies)',
      medical_history: patient.medical_history || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
    })

    // Pre-fill doctor form with current or first candidate
    setDoctorForm({
      doctorId: patient.doctor?.id || (data.candidateDoctors[0]?.id || ''),
      relationshipLabel: patient.doctor?.relationship_label || 'Primary Attending Physician',
    })
  }

  const handleStartCreateNew = () => {
    setIsCreatingNew(true)
    setSelectedPatientId(null)
    setFeedback(null)
    setProfileForm({
      full_name: '',
      birth_date: '',
      sex: 'Female',
      address: 'Dumaguete City, Negros Oriental',
      diagnosis: '',
      allergies: 'NKDA (No Known Drug Allergies)',
      medical_history: '',
      emergency_contact_name: '',
      emergency_contact_phone: '+63 9',
    })
  }

  // Refresh data from server
  const refreshData = async () => {
    const res = await getPatientManagementDataAction()
    if (res.data) {
      setData(res.data)
      if (selectedPatientId) {
        const stillExists = res.data.patients.find((p) => p.id === selectedPatientId)
        if (!stillExists && res.data.patients.length > 0) {
          handleSelectPatient(res.data.patients[0])
        }
      }
    }
  }

  // Calculate age helper
  const calculateAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return null
    const birth = new Date(birthDateStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? age : null
  }

  // Filtered patients for directory
  const filteredPatients = useMemo(() => {
    return data.patients.filter((p) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(q)) ||
        (p.doctor && p.doctor.full_name.toLowerCase().includes(q))

      const matchesAccount =
        accountFilter === 'all' ||
        (accountFilter === 'linked' && Boolean(p.user_id)) ||
        (accountFilter === 'unlinked' && !p.user_id)

      return matchesSearch && matchesAccount
    })
  }, [data.patients, searchQuery, accountFilter])

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    startTransition(async () => {
      const res = await savePatientAction({
        id: isCreatingNew ? undefined : (selectedPatientId || undefined),
        full_name: profileForm.full_name,
        birth_date: profileForm.birth_date,
        sex: profileForm.sex,
        address: profileForm.address,
        diagnosis: profileForm.diagnosis,
        allergies: profileForm.allergies,
        medical_history: profileForm.medical_history,
        emergency_contact_name: profileForm.emergency_contact_name,
        emergency_contact_phone: profileForm.emergency_contact_phone,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else if (res.data) {
        setFeedback({
          type: 'success',
          message: isCreatingNew
            ? `Successfully registered new patient "${res.data.full_name}". Now configure care team assignments below.`
            : `Patient profile for "${res.data.full_name}" updated successfully.`,
        })
        setIsCreatingNew(false)
        setSelectedPatientId(res.data.id)
        await refreshData()
        router.refresh()
      }
    })
  }

  const handleAssignCaregiver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !caregiverForm.caregiverId) return
    setFeedback(null)

    startTransition(async () => {
      const res = await assignCaregiverAction({
        patientId: selectedPatientId,
        caregiverId: caregiverForm.caregiverId,
        startDate: caregiverForm.startDate,
        shiftLabel: caregiverForm.shiftLabel,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({ type: 'success', message: 'Caregiver assigned to care team successfully.' })
        setCaregiverForm((prev) => ({ ...prev, caregiverId: '' }))
        await refreshData()
        router.refresh()
      }
    })
  }

  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !doctorForm.doctorId) return
    setFeedback(null)

    startTransition(async () => {
      const res = await assignDoctorAction({
        patientId: selectedPatientId,
        doctorId: doctorForm.doctorId,
        relationshipLabel: doctorForm.relationshipLabel,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({ type: 'success', message: 'Primary attending physician updated successfully.' })
        await refreshData()
        router.refresh()
      }
    })
  }

  const handleAssignFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !familyForm.familyUserId) return
    setFeedback(null)

    startTransition(async () => {
      const res = await assignFamilyMemberAction({
        patientId: selectedPatientId,
        familyUserId: familyForm.familyUserId,
        relationshipLabel: familyForm.relationshipLabel,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({ type: 'success', message: 'Family member linked to patient care team.' })
        setFamilyForm((prev) => ({ ...prev, familyUserId: '' }))
        await refreshData()
        router.refresh()
      }
    })
  }

  const handleRemoveAssignment = async (careTeamId: string, memberName: string) => {
    if (!selectedPatientId) return
    const confirmed = window.confirm(`Are you sure you want to remove "${memberName}" from this patient's care team?`)
    if (!confirmed) return
    setFeedback(null)

    startTransition(async () => {
      const res = await removeCareAssignmentAction({
        careTeamId,
        patientId: selectedPatientId,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({ type: 'success', message: `Removed "${memberName}" from care team.` })
        await refreshData()
        router.refresh()
      }
    })
  }

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !linkExistingUserId) return
    setFeedback(null)

    startTransition(async () => {
      const res = await linkPatientAccountAction({
        patientId: selectedPatientId,
        userId: linkExistingUserId,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({ type: 'success', message: 'Patient account linked successfully (1:1 link active).' })
        setLinkExistingUserId('')
        await refreshData()
        router.refresh()
      }
    })
  }

  const handleCreateAndLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !selectedPatient) return
    setFeedback(null)

    startTransition(async () => {
      const res = await createAndLinkPatientAccountAction({
        patientId: selectedPatientId,
        fullName: selectedPatient.full_name,
        email: newAccountEmail,
        password: newAccountPassword,
      })

      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({
          type: 'success',
          message: `Created patient login account "${newAccountEmail}" and linked 1:1 with patient record.`,
        })
        setNewAccountEmail('')
        setNewAccountPassword('password123')
        await refreshData()
        router.refresh()
      }
    })
  }

  const handleUnlinkAccount = async () => {
    if (!selectedPatientId) return
    const confirmed = window.confirm('Are you sure you want to unlink this login account from the patient record?')
    if (!confirmed) return
    setFeedback(null)

    startTransition(async () => {
      const res = await unlinkPatientAccountAction(selectedPatientId)
      if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({ type: 'success', message: 'Patient account unlinked successfully.' })
        await refreshData()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Top Breadcrumb & Actions Bar */}
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
              Patient Management &amp; Care Assignment
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FF] text-[#5B5FE8] border border-[#5B5FE8]/20">
              Figure 12
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Tender Touch Home Care Services – Patient Demographics, Clinical Records, and Multidisciplinary Care Teams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartCreateNew}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors ${
              isCreatingNew
                ? 'bg-slate-900 text-white'
                : 'bg-[#5B5FE8] text-white hover:bg-[#4A4ED4]'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Add New Patient</span>
          </button>
        </div>
      </div>

      {/* Global Alert Notification Banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium flex items-start justify-between gap-3 shadow-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <p>{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Enrolled Patients
            </span>
            <div className="h-8 w-8 rounded-lg bg-[#EEF0FF] text-[#5B5FE8] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#1E2243]">{data.patients.length}</div>
          <p className="text-xs font-medium text-slate-500 mt-1">Active patient records</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Doctor Assignments
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#1E2243]">
            {data.patients.filter((p) => Boolean(p.doctor)).length}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">Patients with primary physician</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Caregiver Coverage
            </span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#1E2243]">
            {data.patients.reduce((acc, p) => acc + p.caregivers.length, 0)}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">Active caregiver pairings</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Patient Portal Accounts
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#1E2243]">
            {data.patients.filter((p) => Boolean(p.user_id)).length}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">1:1 linked logins ({data.patients.filter((p) => !p.user_id).length} unlinked)</p>
        </div>
      </div>

      {/* SECTION 1: PATIENT DIRECTORY TABLE WITH SEARCH */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1E2243]">Patient Directory</h2>
            <p className="text-xs font-medium text-slate-500">
              Select any patient to review clinical records, edit profiles, and configure multidisciplinary care assignments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Bar */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, diagnosis, doctor..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
              />
            </div>

            {/* Account Status Filter */}
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAccountFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  accountFilter === 'all'
                    ? 'bg-white text-[#1E2243] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({data.patients.length})
              </button>
              <button
                type="button"
                onClick={() => setAccountFilter('linked')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  accountFilter === 'linked'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Has Account
              </button>
              <button
                type="button"
                onClick={() => setAccountFilter('unlinked')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  accountFilter === 'unlinked'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                No Account
              </button>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Patient Name &amp; Demographics</th>
                <th className="py-3 px-4">Diagnosis &amp; Allergies</th>
                <th className="py-3 px-4">Primary Doctor</th>
                <th className="py-3 px-4">Caregivers</th>
                <th className="py-3 px-4">Family Members</th>
                <th className="py-3 px-4">Portal Account</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No patients match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = selectedPatientId === p.id && !isCreatingNew
                  const age = calculateAge(p.birth_date)

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-[#EEF0FF]/50 border-l-4 border-l-[#5B5FE8]'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Name & Demographics */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.full_name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {p.sex && <span>{p.sex}</span>}
                          {age !== null && (
                            <>
                              <span>•</span>
                              <span>{age} yrs old</span>
                            </>
                          )}
                          {p.address && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[140px]" title={p.address}>
                                {p.address}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Diagnosis & Allergies */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-medium text-slate-800 truncate" title={p.diagnosis || ''}>
                          {p.diagnosis || 'None recorded'}
                        </div>
                        {p.allergies && (
                          <div className="mt-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.allergies.toLowerCase().includes('nkda')
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                              title={p.allergies}
                            >
                              Allergies: {p.allergies}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-4">
                        {p.doctor ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <Stethoscope className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{p.doctor.full_name}</div>
                              <div className="text-[10px] text-slate-500">Attending Physician</div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="h-3 w-3" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Caregivers */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            {p.caregivers.length} {p.caregivers.length === 1 ? 'Caregiver' : 'Caregivers'}
                          </span>
                        </div>
                        {p.caregivers.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[160px]">
                            {p.caregivers.map((c) => c.full_name).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Family Members */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {p.familyMembers.length} {p.familyMembers.length === 1 ? 'Family' : 'Family'}
                          </span>
                        </div>
                        {p.familyMembers.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[160px]">
                            {p.familyMembers.map((f) => f.full_name).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Portal Account */}
                      <td className="py-3.5 px-4">
                        {p.user_id && p.user ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Linked
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[120px]" title={p.user.email}>
                              {p.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            No Account
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSelectPatient(p)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                            isSelected
                              ? 'bg-[#5B5FE8] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:border-[#5B5FE8] hover:text-[#5B5FE8]'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{isSelected ? 'Managing' : 'Manage'}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: PATIENT PROFILE & CARE ASSIGNMENT WORKSPACE */}
      {(selectedPatient || isCreatingNew) && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Active Patient Header Banner */}
          <div className="bg-[#1E2243] text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">
                <span>{isCreatingNew ? 'New Patient Registration' : 'Active Patient Profile'}</span>
                {!isCreatingNew && selectedPatient && (
                  <>
                    <span>•</span>
                    <span>ID: {selectedPatient.id.slice(0, 8)}...</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-black">
                {isCreatingNew ? 'Register New Patient' : selectedPatient?.full_name}
              </h2>
              {!isCreatingNew && selectedPatient && (
                <p className="text-xs text-indigo-100 mt-1 flex flex-wrap items-center gap-2">
                  <span>Diagnosis: {selectedPatient.diagnosis}</span>
                  <span>•</span>
                  <span>
                    Emergency Contact: {selectedPatient.emergency_contact_name} ({selectedPatient.emergency_contact_phone})
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isCreatingNew && (
                <button
                  type="button"
                  onClick={handleStartCreateNew}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Patient</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: PATIENT PROFILE FORM (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-[#5B5FE8]" />
                    <h3 className="text-lg font-bold text-[#1E2243]">
                      {isCreatingNew ? 'Patient Demographics & Medical Profile' : 'Edit Patient Demographics'}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-400">All marked * are required</span>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      placeholder="e.g. Manuel S. Dumlao"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                    />
                  </div>

                  {/* DOB & Sex */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Birth Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={profileForm.birth_date}
                        onChange={(e) => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Biological Sex *
                      </label>
                      <select
                        required
                        value={profileForm.sex}
                        onChange={(e) => setProfileForm({ ...profileForm, sex: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Home Address (Dumaguete City / Environs) *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="e.g. 142 Real St, Daro, Dumaguete City"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                    />
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Primary Medical Diagnosis *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.diagnosis}
                      onChange={(e) => setProfileForm({ ...profileForm, diagnosis: e.target.value })}
                      placeholder="e.g. Type 2 Diabetes Mellitus, Stage 2 Hypertension"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                    />
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Allergies &amp; Adverse Drug Reactions *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.allergies}
                      onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                      placeholder="e.g. NKDA (No Known Drug Allergies) or Penicillin, Sulfonamides"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                    />
                  </div>

                  {/* Medical History */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Medical &amp; Surgical History
                    </label>
                    <textarea
                      rows={3}
                      value={profileForm.medical_history}
                      onChange={(e) => setProfileForm({ ...profileForm, medical_history: e.target.value })}
                      placeholder="Previous hospitalizations, surgeries, chronic illnesses..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Emergency Contact Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.emergency_contact_name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })
                        }
                        placeholder="e.g. Corazon Dumlao (Daughter)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Emergency Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.emergency_contact_phone}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })
                        }
                        placeholder="e.g. +63 917 123 4567"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-3 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] font-bold text-sm shadow-xs transition-colors disabled:opacity-50"
                    >
                      {isPending
                        ? 'Saving Profile...'
                        : isCreatingNew
                        ? 'Save & Register Patient'
                        : 'Update Patient Profile'}
                    </button>
                  </div>
                </form>
              </div>

              {/* PATIENT PORTAL ACCOUNT SECTION (lg:col-span-6 bottom) */}
              {!isCreatingNew && selectedPatient && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-bold text-[#1E2243]">Patient Portal Account</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      1:1 Linking Guard
                    </span>
                  </div>

                  {selectedPatient.user_id && selectedPatient.user ? (
                    // Currently Linked Account Card
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-emerald-950 text-sm">
                              {selectedPatient.user.full_name}
                            </div>
                            <div className="text-xs text-emerald-700">{selectedPatient.user.email}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Account Active
                        </span>
                      </div>

                      <p className="text-xs text-emerald-800 font-medium">
                        This patient can log in at the portal with this email and directly review their own vital-sign records, shift summaries, and care team messages.
                      </p>

                      <div className="pt-2 border-t border-emerald-200/60 flex justify-end">
                        <button
                          type="button"
                          onClick={handleUnlinkAccount}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                        >
                          <Unlink className="h-3.5 w-3.5" />
                          <span>Unlink Account</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // No Linked Account - Options to Link or Create
                    <div className="space-y-4">
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">No Login Account Linked</p>
                          <p className="text-amber-800 mt-0.5">
                            This patient does not currently have portal credentials. Link an existing unassigned account or provision a new login below.
                          </p>
                        </div>
                      </div>

                      {/* Mode Switcher */}
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                        <button
                          type="button"
                          onClick={() => setAccountMode('link')}
                          className={`py-2 rounded-lg transition-all ${
                            accountMode === 'link'
                              ? 'bg-white text-[#1E2243] shadow-xs'
                              : 'hover:text-slate-900'
                          }`}
                        >
                          Link Existing Account
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountMode('create')}
                          className={`py-2 rounded-lg transition-all ${
                            accountMode === 'create'
                              ? 'bg-white text-[#1E2243] shadow-xs'
                              : 'hover:text-slate-900'
                          }`}
                        >
                          Create New Account
                        </button>
                      </div>

                      {accountMode === 'link' ? (
                        <form onSubmit={handleLinkAccount} className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Select Patient User Account
                            </label>
                            <select
                              required
                              value={linkExistingUserId}
                              onChange={(e) => setLinkExistingUserId(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                            >
                              <option value="">-- Choose unlinked patient account --</option>
                              {data.unlinkedPatientAccounts.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.full_name} ({u.email})
                                </option>
                              ))}
                            </select>
                            {data.unlinkedPatientAccounts.length === 0 && (
                              <p className="text-[11px] text-slate-500 mt-1">
                                No unlinked patient accounts available. Use &quot;Create New Account&quot; tab.
                              </p>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={isPending || !linkExistingUserId}
                            className="w-full py-2.5 rounded-xl bg-[#5B5FE8] text-white hover:bg-[#4A4ED4] font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                          >
                            Link Account to Patient
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleCreateAndLinkAccount} className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Patient Login Email *
                            </label>
                            <input
                              type="email"
                              required
                              value={newAccountEmail}
                              onChange={(e) => setNewAccountEmail(e.target.value)}
                              placeholder="e.g. manuel.dumlao@example.com"
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Temporary Password (min 8 chars) *
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                value={newAccountPassword}
                                onChange={(e) => setNewAccountPassword(e.target.value)}
                                className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/20 focus:border-[#5B5FE8]"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isPending || !newAccountEmail}
                            className="w-full py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                          >
                            Provision &amp; Link Portal Account
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: CARE ASSIGNMENT PANEL (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-6">
              {!isCreatingNew && selectedPatient ? (
                <>
                  {/* PANEL 1: PRIMARY ATTENDING DOCTOR */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-[#1E2243]">1. Primary Physician</h3>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        Clinical Oversight
                      </span>
                    </div>

                    {selectedPatient.doctor ? (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                            MD
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {selectedPatient.doctor.full_name}
                            </div>
                            <div className="text-xs text-indigo-700">
                              {selectedPatient.doctor.relationship_label || 'Primary Attending Physician'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {selectedPatient.doctor.email}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveAssignment(
                              selectedPatient.doctor!.assignment_id,
                              selectedPatient.doctor!.full_name
                            )
                          }
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                        >
                          Unassign
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 mb-4 text-xs font-medium text-amber-900 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>No primary physician currently assigned to this patient.</span>
                      </div>
                    )}

                    {/* Change / Assign Doctor Form */}
                    <form onSubmit={handleAssignDoctor} className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          {selectedPatient.doctor ? 'Change Primary Physician' : 'Assign Primary Physician'}
                        </label>
                        <select
                          required
                          value={doctorForm.doctorId}
                          onChange={(e) => setDoctorForm({ ...doctorForm, doctorId: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="">-- Select licensed doctor --</option>
                          {data.candidateDoctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.full_name} ({doc.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isPending || !doctorForm.doctorId}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        {selectedPatient.doctor ? 'Update Assigned Physician' : 'Assign Physician'}
                      </button>
                    </form>
                  </div>

                  {/* PANEL 2: ASSIGNED CAREGIVERS */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-teal-600" />
                        <h3 className="text-lg font-bold text-[#1E2243]">2. Bedside Caregivers</h3>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                        {selectedPatient.caregivers.length} Active
                      </span>
                    </div>

                    {/* List of active caregivers */}
                    <div className="space-y-2 mb-4">
                      {selectedPatient.caregivers.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                          No caregivers assigned yet. Add one below.
                        </div>
                      ) : (
                        selectedPatient.caregivers.map((cg) => (
                          <div
                            key={cg.assignment_id}
                            className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                                CG
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{cg.full_name}</div>
                                <div className="text-[11px] text-teal-800 font-medium">
                                  {cg.relationship_label || 'Bedside Caregiver'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(cg.assignment_id, cg.full_name)}
                              disabled={isPending}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove Caregiver"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Assign New Caregiver Form */}
                    <form onSubmit={handleAssignCaregiver} className="space-y-3 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Assign Another Caregiver
                        </label>
                        <select
                          required
                          value={caregiverForm.caregiverId}
                          onChange={(e) =>
                            setCaregiverForm({ ...caregiverForm, caregiverId: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        >
                          <option value="">-- Choose caregiver --</option>
                          {data.candidateCaregivers.map((cg) => (
                            <option key={cg.id} value={cg.id}>
                              {cg.full_name} ({cg.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Shift / Assignment Role
                          </label>
                          <select
                            value={caregiverForm.shiftLabel}
                            onChange={(e) =>
                              setCaregiverForm({ ...caregiverForm, shiftLabel: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                          >
                            <option value="Bedside Caregiver">Bedside Caregiver</option>
                            <option value="Morning Shift (6AM - 2PM)">Morning Shift (6AM - 2PM)</option>
                            <option value="Evening Shift (2PM - 10PM)">Evening Shift (2PM - 10PM)</option>
                            <option value="Night Shift (10PM - 6AM)">Night Shift (10PM - 6AM)</option>
                            <option value="Specialized Nursing">Specialized Nursing</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={caregiverForm.startDate}
                            onChange={(e) =>
                              setCaregiverForm({ ...caregiverForm, startDate: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPending || !caregiverForm.caregiverId}
                        className="w-full py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        + Assign Caregiver to Patient
                      </button>
                    </form>
                  </div>

                  {/* PANEL 3: LINKED FAMILY MEMBERS */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-bold text-[#1E2243]">3. Family Member Accounts</h3>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                        {selectedPatient.familyMembers.length} Linked
                      </span>
                    </div>

                    {/* List of active family members */}
                    <div className="space-y-2 mb-4">
                      {selectedPatient.familyMembers.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                          No family members linked yet. Link one below.
                        </div>
                      ) : (
                        selectedPatient.familyMembers.map((fam) => (
                          <div
                            key={fam.assignment_id}
                            className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                FM
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{fam.full_name}</div>
                                <div className="text-[11px] text-purple-800 font-medium">
                                  {fam.relationship_label || 'Family Member'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(fam.assignment_id, fam.full_name)}
                              disabled={isPending}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Unlink Family Member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Link Family Member Form */}
                    <form onSubmit={handleAssignFamily} className="space-y-3 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Link Family Member Account
                        </label>
                        <select
                          required
                          value={familyForm.familyUserId}
                          onChange={(e) =>
                            setFamilyForm({ ...familyForm, familyUserId: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        >
                          <option value="">-- Choose family member user --</option>
                          {data.candidateFamilyMembers.map((fm) => (
                            <option key={fm.id} value={fm.id}>
                              {fm.full_name} ({fm.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Relationship to Patient
                        </label>
                        <input
                          type="text"
                          required
                          value={familyForm.relationshipLabel}
                          onChange={(e) =>
                            setFamilyForm({ ...familyForm, relationshipLabel: e.target.value })
                          }
                          placeholder="e.g. Daughter / Primary Contact, Spouse, Son"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isPending || !familyForm.familyUserId}
                        className="w-full py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        + Link Family Member Account
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 space-y-2">
                  <Shield className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">Save Patient Profile First</p>
                  <p className="text-xs">
                    Please submit the patient demographic form on the left to generate the clinical record, then assign doctors, bedside caregivers, and family members.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
