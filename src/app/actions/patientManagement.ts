'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { auditService } from '@/services/auditService'

export interface PatientRecord {
  id: string
  full_name: string
  birth_date: string | null
  sex: string | null
  address: string | null
  diagnosis: string | null
  medical_history: string | null
  allergies: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  user_id: string | null
  created_at: string
  updated_at: string
  user?: {
    id: string
    full_name: string
    email: string
    role: string
    is_active: boolean
  } | null
  doctor?: {
    id: string
    assignment_id: string
    full_name: string
    email: string
    relationship_label: string | null
    assigned_at: string
  } | null
  caregivers: Array<{
    id: string
    assignment_id: string
    full_name: string
    email: string
    relationship_label: string | null
    assigned_at: string
  }>
  familyMembers: Array<{
    id: string
    assignment_id: string
    full_name: string
    email: string
    relationship_label: string | null
    assigned_at: string
  }>
}

export interface CandidateUser {
  id: string
  full_name: string
  email: string
  role: string
}

export interface PatientManagementData {
  patients: PatientRecord[]
  candidateDoctors: CandidateUser[]
  candidateCaregivers: CandidateUser[]
  candidateFamilyMembers: CandidateUser[]
  unlinkedPatientAccounts: CandidateUser[]
}

/**
 * Fetch all patients with linked user account, active care assignments, and candidate users.
 */
export async function getPatientManagementDataAction(): Promise<{
  data: PatientManagementData | null
  error: string | null
}> {
  try {
    await requireRole(['admin'])
    const adminClient = createAdminClient()

    // 1. Fetch all patients
    const { data: rawPatients, error: pError } = await adminClient
      .from('patients')
      .select(`
        *,
        user:users!patients_user_id_fkey(
          id,
          full_name,
          email,
          role,
          is_active
        )
      `)
      .order('full_name', { ascending: true })

    if (pError) {
      return { data: null, error: `Failed to load patients: ${pError.message}` }
    }

    // 2. Fetch all active care team assignments
    const { data: rawAssignments, error: aError } = await adminClient
      .from('care_teams')
      .select(`
        id,
        patient_id,
        member_id,
        member_role,
        relationship_label,
        assigned_at,
        is_active,
        member:users!care_teams_member_id_fkey(
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('is_active', true)

    if (aError) {
      return { data: null, error: `Failed to load care teams: ${aError.message}` }
    }

    // 3. Fetch candidate users for assignments and patient account linking
    const { data: rawUsers, error: uError } = await adminClient
      .from('users')
      .select('id, full_name, email, role, is_active')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (uError) {
      return { data: null, error: `Failed to load users: ${uError.message}` }
    }

    // Group active assignments by patient_id
    const assignmentsByPatient = new Map<
      string,
      {
        doctor: PatientRecord['doctor']
        caregivers: PatientRecord['caregivers']
        familyMembers: PatientRecord['familyMembers']
      }
    >()

    for (const p of rawPatients || []) {
      assignmentsByPatient.set(p.id, {
        doctor: null,
        caregivers: [],
        familyMembers: [],
      })
    }

    for (const a of rawAssignments || []) {
      const group = assignmentsByPatient.get(a.patient_id)
      if (!group) continue

      const member = a.member as unknown as CandidateUser | null
      if (!member) continue

      const item = {
        id: member.id,
        assignment_id: a.id,
        full_name: member.full_name,
        email: member.email,
        relationship_label: a.relationship_label,
        assigned_at: a.assigned_at,
      }

      if (a.member_role === 'doctor') {
        group.doctor = item
      } else if (a.member_role === 'caregiver') {
        group.caregivers.push(item)
      } else if (a.member_role === 'family_member') {
        group.familyMembers.push(item)
      }
    }

    const patients: PatientRecord[] = (rawPatients || []).map((p) => {
      const group = assignmentsByPatient.get(p.id) || {
        doctor: null,
        caregivers: [],
        familyMembers: [],
      }

      return {
        id: p.id,
        full_name: p.full_name,
        birth_date: p.birth_date,
        sex: p.sex,
        address: p.address,
        diagnosis: p.diagnosis,
        medical_history: p.medical_history,
        allergies: p.allergies,
        emergency_contact_name: p.emergency_contact_name,
        emergency_contact_phone: p.emergency_contact_phone,
        user_id: p.user_id,
        created_at: p.created_at,
        updated_at: p.updated_at,
        user: p.user as unknown as PatientRecord['user'],
        doctor: group.doctor,
        caregivers: group.caregivers,
        familyMembers: group.familyMembers,
      }
    })

    // Filter candidate users by role
    const candidateDoctors: CandidateUser[] = []
    const candidateCaregivers: CandidateUser[] = []
    const candidateFamilyMembers: CandidateUser[] = []
    const candidatePatientAccounts: CandidateUser[] = []

    const linkedUserIds = new Set(
      patients.map((p) => p.user_id).filter(Boolean) as string[]
    )

    for (const u of rawUsers || []) {
      if (u.role === 'doctor') candidateDoctors.push(u)
      else if (u.role === 'caregiver') candidateCaregivers.push(u)
      else if (u.role === 'family_member') candidateFamilyMembers.push(u)
      else if (u.role === 'patient') {
        if (!linkedUserIds.has(u.id)) {
          candidatePatientAccounts.push(u)
        }
      }
    }

    return {
      data: {
        patients,
        candidateDoctors,
        candidateCaregivers,
        candidateFamilyMembers,
        unlinkedPatientAccounts: candidatePatientAccounts,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}

export interface SavePatientPayload {
  id?: string
  full_name: string
  birth_date: string
  sex: string
  address: string
  diagnosis: string
  medical_history?: string
  allergies: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

/**
 * Create or update a patient profile with required-field validation.
 */
export async function savePatientAction(payload: SavePatientPayload): Promise<{
  data: PatientRecord | null
  error: string | null
}> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    // Required-field validation
    const fullName = payload.full_name?.trim()
    const birthDate = payload.birth_date?.trim()
    const sex = payload.sex?.trim()
    const address = payload.address?.trim()
    const diagnosis = payload.diagnosis?.trim()
    const allergies = payload.allergies?.trim()
    const emergencyName = payload.emergency_contact_name?.trim()
    const emergencyPhone = payload.emergency_contact_phone?.trim()

    if (!fullName) return { data: null, error: 'Full Name is required.' }
    if (!birthDate) return { data: null, error: 'Birth Date is required.' }
    if (!sex) return { data: null, error: 'Sex is required.' }
    if (!address) return { data: null, error: 'Home Address is required.' }
    if (!diagnosis) return { data: null, error: 'Primary Diagnosis is required.' }
    if (!allergies) return { data: null, error: 'Allergies field is required (use "NKDA" if none known).' }
    if (!emergencyName) return { data: null, error: 'Emergency Contact Name is required.' }
    if (!emergencyPhone) return { data: null, error: 'Emergency Contact Phone is required.' }

    const isUpdate = Boolean(payload.id)

    if (isUpdate && payload.id) {
      const { data: updated, error: updateError } = await adminClient
        .from('patients')
        .update({
          full_name: fullName,
          birth_date: birthDate,
          sex,
          address,
          diagnosis,
          medical_history: payload.medical_history?.trim() || null,
          allergies,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id)
        .select()
        .single()

      if (updateError) {
        return { data: null, error: `Failed to update patient: ${updateError.message}` }
      }

      await auditService.record({
        userId: adminUser.id,
        action: 'PATIENT_UPDATE',
        recordType: 'patients',
        recordId: payload.id,
        details: {
          full_name: fullName,
          diagnosis,
        },
      })

      revalidatePath('/admin/patients')
      revalidatePath('/care-teams')
      revalidatePath('/admin')

      return { data: updated as unknown as PatientRecord, error: null }
    } else {
      const { data: created, error: insertError } = await adminClient
        .from('patients')
        .insert({
          full_name: fullName,
          birth_date: birthDate,
          sex,
          address,
          diagnosis,
          medical_history: payload.medical_history?.trim() || null,
          allergies,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
        })
        .select()
        .single()

      if (insertError) {
        return { data: null, error: `Failed to create patient: ${insertError.message}` }
      }

      await auditService.record({
        userId: adminUser.id,
        action: 'PATIENT_CREATE',
        recordType: 'patients',
        recordId: created.id,
        details: {
          full_name: fullName,
          diagnosis,
        },
      })

      revalidatePath('/admin/patients')
      revalidatePath('/care-teams')
      revalidatePath('/admin')

      return { data: created as unknown as PatientRecord, error: null }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}

/**
 * Assign or update a caregiver to a patient.
 */
export async function assignCaregiverAction(params: {
  patientId: string
  caregiverId: string
  startDate?: string
  shiftLabel?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    if (!params.patientId || !params.caregiverId) {
      return { success: false, error: 'Patient and caregiver are required.' }
    }

    // Verify caregiver user
    const { data: caregiver, error: cErr } = await adminClient
      .from('users')
      .select('id, full_name, role')
      .eq('id', params.caregiverId)
      .single()

    if (cErr || !caregiver || caregiver.role !== 'caregiver') {
      return { success: false, error: 'Selected user is not an active caregiver.' }
    }

    const { data: patient } = await adminClient
      .from('patients')
      .select('full_name')
      .eq('id', params.patientId)
      .single()

    const assignedAt = params.startDate
      ? new Date(params.startDate).toISOString()
      : new Date().toISOString()

    // Check existing pairing
    const { data: existing } = await adminClient
      .from('care_teams')
      .select('id, is_active')
      .eq('patient_id', params.patientId)
      .eq('member_id', params.caregiverId)
      .eq('member_role', 'caregiver')
      .maybeSingle()

    let assignmentId: string

    if (existing) {
      const { data: updated, error: uErr } = await adminClient
        .from('care_teams')
        .update({
          is_active: true,
          assigned_at: assignedAt,
          assigned_by: adminUser.id,
          relationship_label: params.shiftLabel?.trim() || 'Bedside Caregiver',
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (uErr) return { success: false, error: uErr.message }
      assignmentId = updated.id
    } else {
      const { data: inserted, error: iErr } = await adminClient
        .from('care_teams')
        .insert({
          patient_id: params.patientId,
          member_id: params.caregiverId,
          member_role: 'caregiver',
          relationship_label: params.shiftLabel?.trim() || 'Bedside Caregiver',
          is_active: true,
          assigned_by: adminUser.id,
          assigned_at: assignedAt,
        })
        .select()
        .single()

      if (iErr) return { success: false, error: iErr.message }
      assignmentId = inserted.id
    }

    await auditService.record({
      userId: adminUser.id,
      action: 'CARE_ASSIGNMENT_ADD',
      recordType: 'care_teams',
      recordId: assignmentId,
      details: {
        patient_id: params.patientId,
        patient_name: patient?.full_name,
        member_id: caregiver.id,
        member_name: caregiver.full_name,
        role: 'caregiver',
        shift: params.shiftLabel,
      },
    })

    revalidatePath('/admin/patients')
    revalidatePath('/care-teams')
    revalidatePath('/caregiver')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Assign primary doctor to a patient. Soft-deactivates previous doctor if replacing.
 */
export async function assignDoctorAction(params: {
  patientId: string
  doctorId: string
  relationshipLabel?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    if (!params.patientId || !params.doctorId) {
      return { success: false, error: 'Patient and physician are required.' }
    }

    // Verify doctor user
    const { data: doctor, error: dErr } = await adminClient
      .from('users')
      .select('id, full_name, role')
      .eq('id', params.doctorId)
      .single()

    if (dErr || !doctor || doctor.role !== 'doctor') {
      return { success: false, error: 'Selected user is not an active doctor.' }
    }

    const { data: patient } = await adminClient
      .from('patients')
      .select('full_name')
      .eq('id', params.patientId)
      .single()

    // 1. Soft-deactivate any other active doctor for this patient
    await adminClient
      .from('care_teams')
      .update({ is_active: false })
      .eq('patient_id', params.patientId)
      .eq('member_role', 'doctor')
      .neq('member_id', params.doctorId)

    // 2. Upsert the target doctor
    const { data: existing } = await adminClient
      .from('care_teams')
      .select('id')
      .eq('patient_id', params.patientId)
      .eq('member_id', params.doctorId)
      .eq('member_role', 'doctor')
      .maybeSingle()

    let assignmentId: string

    if (existing) {
      const { data: updated, error: uErr } = await adminClient
        .from('care_teams')
        .update({
          is_active: true,
          assigned_at: new Date().toISOString(),
          assigned_by: adminUser.id,
          relationship_label: params.relationshipLabel?.trim() || 'Primary Attending Physician',
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (uErr) return { success: false, error: uErr.message }
      assignmentId = updated.id
    } else {
      const { data: inserted, error: iErr } = await adminClient
        .from('care_teams')
        .insert({
          patient_id: params.patientId,
          member_id: params.doctorId,
          member_role: 'doctor',
          relationship_label: params.relationshipLabel?.trim() || 'Primary Attending Physician',
          is_active: true,
          assigned_by: adminUser.id,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (iErr) return { success: false, error: iErr.message }
      assignmentId = inserted.id
    }

    await auditService.record({
      userId: adminUser.id,
      action: 'CARE_ASSIGNMENT_ADD',
      recordType: 'care_teams',
      recordId: assignmentId,
      details: {
        patient_id: params.patientId,
        patient_name: patient?.full_name,
        member_id: doctor.id,
        member_name: doctor.full_name,
        role: 'doctor',
      },
    })

    revalidatePath('/admin/patients')
    revalidatePath('/care-teams')
    revalidatePath('/doctor')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Link a family member account to a patient.
 */
export async function assignFamilyMemberAction(params: {
  patientId: string
  familyUserId: string
  relationshipLabel?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    if (!params.patientId || !params.familyUserId) {
      return { success: false, error: 'Patient and family member are required.' }
    }

    // Verify family user
    const { data: familyUser, error: fErr } = await adminClient
      .from('users')
      .select('id, full_name, role')
      .eq('id', params.familyUserId)
      .single()

    if (fErr || !familyUser || familyUser.role !== 'family_member') {
      return { success: false, error: 'Selected user is not an active family member.' }
    }

    const { data: patient } = await adminClient
      .from('patients')
      .select('full_name')
      .eq('id', params.patientId)
      .single()

    const { data: existing } = await adminClient
      .from('care_teams')
      .select('id')
      .eq('patient_id', params.patientId)
      .eq('member_id', params.familyUserId)
      .eq('member_role', 'family_member')
      .maybeSingle()

    let assignmentId: string

    if (existing) {
      const { data: updated, error: uErr } = await adminClient
        .from('care_teams')
        .update({
          is_active: true,
          assigned_at: new Date().toISOString(),
          assigned_by: adminUser.id,
          relationship_label: params.relationshipLabel?.trim() || 'Family Member',
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (uErr) return { success: false, error: uErr.message }
      assignmentId = updated.id
    } else {
      const { data: inserted, error: iErr } = await adminClient
        .from('care_teams')
        .insert({
          patient_id: params.patientId,
          member_id: params.familyUserId,
          member_role: 'family_member',
          relationship_label: params.relationshipLabel?.trim() || 'Family Member',
          is_active: true,
          assigned_by: adminUser.id,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (iErr) return { success: false, error: iErr.message }
      assignmentId = inserted.id
    }

    await auditService.record({
      userId: adminUser.id,
      action: 'CARE_ASSIGNMENT_ADD',
      recordType: 'care_teams',
      recordId: assignmentId,
      details: {
        patient_id: params.patientId,
        patient_name: patient?.full_name,
        member_id: familyUser.id,
        member_name: familyUser.full_name,
        role: 'family_member',
        relationship: params.relationshipLabel,
      },
    })

    revalidatePath('/admin/patients')
    revalidatePath('/care-teams')
    revalidatePath('/family')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Remove an active care team assignment (soft-delete is_active = false).
 */
export async function removeCareAssignmentAction(params: {
  careTeamId: string
  patientId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    if (!params.careTeamId) {
      return { success: false, error: 'Care team assignment ID is required.' }
    }

    const { data: assignment, error: aErr } = await adminClient
      .from('care_teams')
      .select(`
        id,
        patient_id,
        member_id,
        member_role,
        member:users!care_teams_member_id_fkey(full_name),
        patient:patients!care_teams_patient_id_fkey(full_name)
      `)
      .eq('id', params.careTeamId)
      .single()

    if (aErr || !assignment) {
      return { success: false, error: 'Assignment not found.' }
    }

    const { error: updateErr } = await adminClient
      .from('care_teams')
      .update({ is_active: false })
      .eq('id', params.careTeamId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    const memberName = (assignment.member as unknown as { full_name: string } | null)?.full_name
    const patientName = (assignment.patient as unknown as { full_name: string } | null)?.full_name

    await auditService.record({
      userId: adminUser.id,
      action: 'CARE_ASSIGNMENT_REMOVE',
      recordType: 'care_teams',
      recordId: params.careTeamId,
      details: {
        patient_id: assignment.patient_id,
        patient_name: patientName,
        member_id: assignment.member_id,
        member_name: memberName,
        role: assignment.member_role,
      },
    })

    revalidatePath('/admin/patients')
    revalidatePath('/care-teams')
    revalidatePath('/caregiver')
    revalidatePath('/doctor')
    revalidatePath('/family')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Link an existing user with role = 'patient' to a patient profile (1:1 link).
 */
export async function linkPatientAccountAction(params: {
  patientId: string
  userId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    if (!params.patientId || !params.userId) {
      return { success: false, error: 'Patient ID and User Account ID are required.' }
    }

    // Verify user role = 'patient'
    const { data: targetUser, error: uErr } = await adminClient
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', params.userId)
      .single()

    if (uErr || !targetUser || targetUser.role !== 'patient') {
      return { success: false, error: 'Selected account must have the "patient" role.' }
    }

    // Check if this user account is already linked to another patient (1:1 rule)
    const { data: existingLink } = await adminClient
      .from('patients')
      .select('id, full_name')
      .eq('user_id', params.userId)
      .neq('id', params.patientId)
      .maybeSingle()

    if (existingLink) {
      return {
        success: false,
        error: `This account is already linked to patient "${existingLink.full_name}". Patient accounts must be strictly one-to-one.`,
      }
    }

    const { error: linkErr } = await adminClient
      .from('patients')
      .update({
        user_id: params.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.patientId)

    if (linkErr) {
      return { success: false, error: linkErr.message }
    }

    await auditService.record({
      userId: adminUser.id,
      action: 'PATIENT_ACCOUNT_LINK',
      recordType: 'patients',
      recordId: params.patientId,
      details: {
        linked_user_id: targetUser.id,
        linked_user_email: targetUser.email,
        linked_user_name: targetUser.full_name,
      },
    })

    revalidatePath('/admin/patients')
    revalidatePath('/care-teams')
    revalidatePath('/patient')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Unlink the patient portal login account from a patient profile.
 */
export async function unlinkPatientAccountAction(patientId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    if (!patientId) {
      return { success: false, error: 'Patient ID is required.' }
    }

    const { data: patient } = await adminClient
      .from('patients')
      .select('id, full_name, user_id')
      .eq('id', patientId)
      .single()

    if (!patient || !patient.user_id) {
      return { success: false, error: 'Patient has no linked account to unlink.' }
    }

    const oldUserId = patient.user_id

    const { error: unlinkErr } = await adminClient
      .from('patients')
      .update({
        user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)

    if (unlinkErr) {
      return { success: false, error: unlinkErr.message }
    }

    await auditService.record({
      userId: adminUser.id,
      action: 'PATIENT_ACCOUNT_UNLINK',
      recordType: 'patients',
      recordId: patientId,
      details: {
        unlinked_user_id: oldUserId,
        patient_name: patient.full_name,
      },
    })

    revalidatePath('/admin/patients')
    revalidatePath('/care-teams')
    revalidatePath('/patient')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Create a new user with role = 'patient' and immediately link it to the patient profile (1:1).
 */
export async function createAndLinkPatientAccountAction(params: {
  patientId: string
  fullName: string
  email: string
  password: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: adminUser } = await requireRole(['admin'])
    const adminClient = createAdminClient()

    const email = params.email?.trim().toLowerCase()
    const fullName = params.fullName?.trim()
    const password = params.password?.trim()

    if (!params.patientId) return { success: false, error: 'Patient ID is required.' }
    if (!email) return { success: false, error: 'Email is required.' }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' }
    }

    // Verify patient exists
    const { data: patient, error: pErr } = await adminClient
      .from('patients')
      .select('id, full_name, user_id')
      .eq('id', params.patientId)
      .single()

    if (pErr || !patient) {
      return { success: false, error: 'Patient not found.' }
    }

    if (patient.user_id) {
      return { success: false, error: 'This patient already has a linked portal login account.' }
    }

    // Check email uniqueness in public.users
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return { success: false, error: 'An account with this email address already exists.' }
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'patient' },
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create auth identity' }
    }

    const authUserId = authData.user.id

    // 2. Insert into public.users
    const { error: userInsertErr } = await adminClient.from('users').insert({
      id: authUserId,
      email,
      full_name: fullName,
      role: 'patient',
      is_active: true,
    })

    if (userInsertErr) {
      await adminClient.auth.admin.deleteUser(authUserId)
      return { success: false, error: `Failed to create user record: ${userInsertErr.message}` }
    }

    // 3. Link to patient
    const { error: linkErr } = await adminClient
      .from('patients')
      .update({
        user_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.patientId)

    if (linkErr) {
      return { success: false, error: `Account created, but linking failed: ${linkErr.message}` }
    }

    // 4. Log audit events
    await auditService.record({
      userId: adminUser.id,
      action: 'USER_CREATE',
      recordType: 'users',
      recordId: authUserId,
      details: {
        email,
        full_name: fullName,
        role: 'patient',
        created_via: 'patient_profile_management',
      },
    })

    await auditService.record({
      userId: adminUser.id,
      action: 'PATIENT_ACCOUNT_LINK',
      recordType: 'patients',
      recordId: params.patientId,
      details: {
        linked_user_id: authUserId,
        linked_user_email: email,
        linked_user_name: fullName,
      },
    })

    revalidatePath('/admin/patients')
    revalidatePath('/care-teams')
    revalidatePath('/patient')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
