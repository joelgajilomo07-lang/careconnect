'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/roleGuard'
import { usersService } from '@/services/usersService'
import { careTeamsService } from '@/services/careTeamsService'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

interface InviteUserParams {
  email: string
  fullName: string
  role: UserRole
  phone?: string
  // For patients
  dateOfBirth?: string
  sex?: string
  primaryCondition?: string
}

export async function inviteUserAction(params: InviteUserParams) {
  // 1. Enforce that only admins can call this action
  await requireRole(['admin'])

  const adminAuthClient = createAdminClient()

  // 2. Create the user in auth.users using Supabase Admin API
  // This sends an invite email by default and securely instantiates their auth identity.
  const { data: authData, error: authError } = await adminAuthClient.auth.admin.inviteUserByEmail(params.email)

  if (authError || !authData.user) {
    return { error: `Failed to invite user: ${authError?.message || 'Unknown error'}` }
  }

  const userId = authData.user.id

  // 3. Atomically insert into `public.users` and (if patient) `public.patient_profiles`
  // We use a custom Postgres RPC to ensure the creation is transacted together.
  const { error: rpcError } = await adminAuthClient.rpc('admin_create_user_profile', {
    p_user_id: userId,
    p_email: params.email,
    p_full_name: params.fullName,
    p_role: params.role,
    p_phone: params.phone || null,
    p_dob: params.dateOfBirth || null,
    p_sex: params.sex || null,
    p_condition: params.primaryCondition || null
  })

  if (rpcError) {
    // If our profile transaction failed, hard-delete the auth.users row to avoid a dangling identity
    await adminAuthClient.auth.admin.deleteUser(userId)
    
    return {
      error: `Invitation email was sent, but profile creation failed (${rpcError.message}). Please ask the recipient to disregard that email and try again.`
    }
  }

  return { success: true, userId }
}

export interface AssignCareTeamParams {
  patientId: string
  memberId: string
  memberRole: 'doctor' | 'caregiver' | 'family_member'
  relationshipLabel?: string
}

export async function assignCareTeamMemberAction(params: AssignCareTeamParams) {
  // 1. Enforce that only admins can call this action
  await requireRole(['admin'])

  if (!params.patientId || !params.memberId || !params.memberRole) {
    return { error: 'Patient, care team member, and role are required.' }
  }

  // 2. Validate that target member exists and their actual users.role matches params.memberRole
  const memberRes = await usersService.getById(params.memberId)
  if (memberRes.error || !memberRes.data) {
    return { error: `Care team member not found: ${memberRes.error || 'Unknown user'}` }
  }

  const member = memberRes.data
  if (member.role !== params.memberRole) {
    return {
      error: `Role mismatch: Selected user "${member.full_name}" has role "${member.role}", but is being assigned as "${params.memberRole}". Please select a matching role or user.`,
    }
  }

  // 3. Call careTeamsService.assignMember (handles normal insert or reactivation)
  const result = await careTeamsService.assignMember({
    patient_id: params.patientId,
    member_id: params.memberId,
    member_role: params.memberRole,
    relationship_label: params.relationshipLabel?.trim() || null,
    is_active: true,
  })

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath('/care-teams')
  revalidatePath('/admin')
  return { success: true, data: result.data }
}

export async function removeCareTeamMemberAction(careTeamId: string) {
  // 1. Enforce that only admins can call this action
  await requireRole(['admin'])

  if (!careTeamId) {
    return { error: 'Care team assignment ID is required.' }
  }

  const result = await careTeamsService.removeMember(careTeamId)
  if (result.error) {
    return { error: result.error }
  }

  revalidatePath('/care-teams')
  revalidatePath('/admin')
  return { success: true, data: result.data }
}

