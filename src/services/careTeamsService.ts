import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type CareTeamRow = Tables<'care_teams'>
export type CareTeamInsert = TablesInsert<'care_teams'>
export type CareTeamUpdate = TablesUpdate<'care_teams'>

export type CareTeamMemberWithUser = CareTeamRow & {
  member: Tables<'users'> | null
}

export interface FamilyPatientItem {
  patientId: string
  fullName: string
  primaryCondition: string | null
  currentStatus: Database['public']['Enums']['patient_status'] | null
  relationshipLabel: string | null
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string; details?: string }

export const careTeamsService = {
  /**
   * Fetch all care team members for a given patient with joined member profile data.
   */
  async getTeamForPatient(patientId: string): Promise<ServiceResult<CareTeamMemberWithUser[]>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('care_teams')
        .select(`
          *,
          member:users!care_teams_member_id_fkey(*)
        `)
        .eq('patient_id', patientId)
        .order('assigned_at', { ascending: false })

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: (data as unknown as CareTeamMemberWithUser[]) || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching care team'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch all active care team assignments for a specific member (caregiver/doctor/family).
   */
  async getAssignmentsForMember(memberId: string): Promise<ServiceResult<CareTeamRow[]>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('care_teams')
        .select('*')
        .eq('member_id', memberId)
        .eq('is_active', true)

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: data || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching member assignments'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch assigned active patients for a caregiver with joined user and patient profile information.
   * If caregiverId is omitted, derives it server-side from session.
   */
  async getPatientsForCaregiver(caregiverId?: string): Promise<ServiceResult<Array<{
    patientId: string
    fullName: string
    primaryCondition: string | null
    currentStatus: Database['public']['Enums']['patient_status'] | null
    relationshipLabel: string | null
  }>>> {
    try {
      const supabase = await createClient()
      let memberId = caregiverId

      if (!memberId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { data: null, error: 'Unauthorized: User not authenticated' }
        memberId = user.id
      }

      const { data, error } = await supabase
        .from('care_teams')
        .select(`
          patient_id,
          relationship_label,
          patient:users!care_teams_patient_id_fkey(
            id,
            full_name,
            is_active,
            patient_profile:patient_profiles!patient_profiles_user_id_fkey(
              primary_condition,
              current_status
            )
          )
        `)
        .eq('member_id', memberId)
        .eq('is_active', true)

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      const result = (data || [])
        .filter((row: any) => row.patient && row.patient.is_active === true)
        .map((row: any) => ({
          patientId: row.patient_id,
          fullName: row.patient?.full_name || 'Unnamed Patient',
          primaryCondition: row.patient?.patient_profile?.primary_condition || null,
          currentStatus: row.patient?.patient_profile?.current_status || null,
          relationshipLabel: row.relationship_label || null,
        }))

      return { data: result, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching caregiver patients'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch assigned active patients for a family member with joined user and patient profile information.
   * If familyMemberId is omitted, derives it server-side from session.
   */
  async getPatientsForFamilyMember(familyMemberId?: string): Promise<ServiceResult<Array<{
    patientId: string
    fullName: string
    primaryCondition: string | null
    currentStatus: Database['public']['Enums']['patient_status'] | null
    relationshipLabel: string | null
  }>>> {
    try {
      const supabase = await createClient()
      let memberId = familyMemberId

      if (!memberId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { data: null, error: 'Unauthorized: User not authenticated' }
        memberId = user.id
      }

      const { data, error } = await supabase
        .from('care_teams')
        .select(`
          patient_id,
          relationship_label,
          patient:users!care_teams_patient_id_fkey(
            id,
            full_name,
            is_active,
            patient_profile:patient_profiles!patient_profiles_user_id_fkey(
              primary_condition,
              current_status
            )
          )
        `)
        .eq('member_id', memberId)
        .eq('is_active', true)

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      const result = (data || [])
        .filter((row: any) => row.patient && row.patient.is_active === true)
        .map((row: any) => ({
          patientId: row.patient_id,
          fullName: row.patient?.full_name || 'Unnamed Patient',
          primaryCondition: row.patient?.patient_profile?.primary_condition || null,
          currentStatus: row.patient?.patient_profile?.current_status || null,
          relationshipLabel: row.relationship_label || null,
        }))

      return { data: result, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching family member patients'
      return { data: null, error: message }
    }
  },

  /**
   * Assign a member to a patient's care team (Admin only).
   * Automatically enforces trigger trigger_enforce_care_team_role to match users.role.
   * Gracefully handles reactivations if a previously deactivated pairing exists.
   */
  async assignMember(payload: CareTeamInsert): Promise<ServiceResult<CareTeamRow>> {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Check if a pairing record already exists for this (patient_id, member_id, member_role)
      const { data: existing, error: checkError } = await supabase
        .from('care_teams')
        .select('*')
        .eq('patient_id', payload.patient_id)
        .eq('member_id', payload.member_id)
        .eq('member_role', payload.member_role)
        .maybeSingle()

      if (checkError) {
        return { data: null, error: checkError.message, code: checkError.code }
      }

      // If already active, return friendly validation error
      if (existing && existing.is_active) {
        return { data: null, error: 'This care team pairing is already active.' }
      }

      // If previously deactivated, reactivate it seamlessly
      if (existing && !existing.is_active) {
        const { data: reactivated, error: updateError } = await supabase
          .from('care_teams')
          .update({
            is_active: true,
            relationship_label: payload.relationship_label ?? existing.relationship_label,
            assigned_by: user?.id || existing.assigned_by,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) {
          return { data: null, error: updateError.message, code: updateError.code }
        }

        return { data: reactivated, error: null }
      }

      // 2. Otherwise perform new insert
      const insertPayload: CareTeamInsert = {
        ...payload,
        assigned_by: payload.assigned_by || user?.id || null,
      }

      const { data, error } = await supabase
        .from('care_teams')
        .insert(insertPayload)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error assigning care team member'
      return { data: null, error: message }
    }
  },

  /**
   * Update care team assignment status or relationship label (Admin only).
   */
  async updateAssignment(id: string, payload: CareTeamUpdate): Promise<ServiceResult<CareTeamRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('care_teams')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error updating care team assignment'
      return { data: null, error: message }
    }
  },

  /**
   * Remove a member from active assignment (soft-delete by marking is_active = false).
   * Preserves historical assignment records for clinical audit trails.
   */
  async removeMember(id: string): Promise<ServiceResult<CareTeamRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('care_teams')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error deactivating care team member'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch all care team assignments across all patients (Admin only).
   */
  async getAllCareTeams(): Promise<ServiceResult<Array<CareTeamRow & {
    patient: Tables<'users'> | null
    member: Tables<'users'> | null
  }>>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('care_teams')
        .select(`
          *,
          patient:users!care_teams_patient_id_fkey(*),
          member:users!care_teams_member_id_fkey(*)
        `)
        .order('assigned_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message, code: error.code, details: error.details }
      }

      return { data: (data as unknown as Array<CareTeamRow & { patient: Tables<'users'> | null; member: Tables<'users'> | null }>) || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching all care teams'
      return { data: null, error: message }
    }
  },
}
