'use client'

import { useState, useTransition, useMemo } from 'react'
import { assignCareTeamMemberAction } from '@/app/(admin)/actions'
import {
  UserPlus,
  Stethoscope,
  HeartHandshake,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'

interface CandidateMember {
  id: string
  full_name: string
  role: string
  email: string
}

interface PatientOption {
  id: string
  full_name: string
}

interface CareTeamAssignmentFormProps {
  patients: PatientOption[]
  candidateMembers: CandidateMember[]
}

type CareTeamRole = 'doctor' | 'caregiver' | 'family_member'

export function CareTeamAssignmentForm({
  patients,
  candidateMembers,
}: CareTeamAssignmentFormProps) {
  const [isPending, startTransition] = useTransition()

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '')
  const [selectedRole, setSelectedRole] = useState<CareTeamRole>('doctor')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [relationshipLabel, setRelationshipLabel] = useState('')

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filter candidates dynamically based on selectedRole
  const eligibleMembers = useMemo(() => {
    return candidateMembers.filter((m) => m.role === selectedRole)
  }, [candidateMembers, selectedRole])

  // Role-aware relationship label presets
  const rolePresets: Record<CareTeamRole, string[]> = {
    doctor: [
      'Primary Attending',
      'Consulting Cardiologist',
      'General Practitioner',
      'Oncology Specialist',
    ],
    caregiver: [
      'Primary Day Caregiver',
      'Night Shift Nurse',
      'Home Health Aide',
      'Physical Therapy Assistant',
    ],
    family_member: [
      'Daughter / Primary Contact',
      'Healthcare Proxy',
      'Spouse',
      'Son / Guardian',
      'Emergency Kin',
    ],
  }

  // When role changes, auto-select first eligible member if current selection invalid
  function handleRoleChange(newRole: CareTeamRole) {
    setSelectedRole(newRole)
    const matching = candidateMembers.filter((m) => m.role === newRole)
    setSelectedMemberId(matching[0]?.id || '')
    setRelationshipLabel('')
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!selectedPatientId) {
      setErrorMsg('Please select an enrolled patient.')
      return
    }

    if (!selectedMemberId) {
      setErrorMsg(`Please select an active ${selectedRole.replace('_', ' ')} to assign.`)
      return
    }

    startTransition(async () => {
      const res = await assignCareTeamMemberAction({
        patientId: selectedPatientId,
        memberId: selectedMemberId,
        memberRole: selectedRole,
        relationshipLabel: relationshipLabel.trim() || undefined,
      })

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        const memberName = eligibleMembers.find((m) => m.id === selectedMemberId)?.full_name || 'Member'
        const patientName = patients.find((p) => p.id === selectedPatientId)?.full_name || 'Patient'
        setSuccessMsg(`Care team assignment configured: ${memberName} assigned to ${patientName}.`)
        setRelationshipLabel('')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          Assign Care Team Member
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Establish clinical relationships between patients and certified staff or family members.
        </p>
      </div>

      {/* Success Feedback */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Error Feedback */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Patient Selector */}
          <div className="space-y-1.5">
            <label htmlFor="patient" className="text-xs font-semibold text-gray-700">
              1. Enrolled Patient *
            </label>
            <select
              id="patient"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {patients.length === 0 ? (
                <option value="">No enrolled patients found</option>
              ) : (
                patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Care Team Role Selector */}
          <div className="space-y-1.5">
            <label htmlFor="memberRole" className="text-xs font-semibold text-gray-700">
              2. Care Team Role *
            </label>
            <select
              id="memberRole"
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value as CareTeamRole)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="doctor">Doctor (Attending Physician)</option>
              <option value="caregiver">Caregiver (Bedside Care)</option>
              <option value="family_member">Family Member (Kin Contact)</option>
            </select>
          </div>

          {/* Team Member Selector (Filtered strictly to matching role) */}
          <div className="space-y-1.5">
            <label htmlFor="member" className="text-xs font-semibold text-gray-700">
              3. Assign Candidate ({selectedRole.replace('_', ' ')}) *
            </label>
            <select
              id="member"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {eligibleMembers.length === 0 ? (
                <option value="">No active {selectedRole.replace('_', ' ')}s available</option>
              ) : (
                <>
                  <option value="">-- Choose {selectedRole.replace('_', ' ')} --</option>
                  {eligibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Relationship Label & Role-Aware Presets */}
        <div className="space-y-2 rounded-xl bg-gray-50/70 p-3.5 border border-gray-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label htmlFor="label" className="text-xs font-semibold text-gray-700">
              Relationship / Specialty Label (Optional)
            </label>
            <span className="text-[11px] text-gray-400">
              Click preset or enter custom clinical focus
            </span>
          </div>

          <input
            id="label"
            type="text"
            placeholder={`e.g. ${rolePresets[selectedRole][0]}`}
            value={relationshipLabel}
            onChange={(e) => setRelationshipLabel(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Presets:
            </span>
            {rolePresets[selectedRole].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRelationshipLabel(preset)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                  relationshipLabel === preset
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Form Submission */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending || !selectedPatientId || !selectedMemberId}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Pairing Team...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                <span>Save Care Team Pairing</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
