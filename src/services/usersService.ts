import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type UserRow = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type PatientProfileRow = Tables<'patient_profiles'>
export type PatientProfileInsert = TablesInsert<'patient_profiles'>
export type PatientProfileUpdate = TablesUpdate<'patient_profiles'>

export type PatientWithProfile = UserRow & {
  patient_profile: PatientProfileRow | null
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string; details?: string }

export const usersService = {
  /**
   * Fetch current authenticated user's profile from public.users.
   */
  async getCurrentUserProfile(): Promise<ServiceResult<UserRow | null>> {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return { data: null, error: 'Unauthorized: User not authenticated' }
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
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
      const message = err instanceof Error ? err.message : 'Unexpected error fetching current user profile'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch user by ID.
   */
  async getById(id: string): Promise<ServiceResult<UserRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
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
      const message = err instanceof Error ? err.message : 'Unexpected error fetching user by ID'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch all users by role (Admin or Doctor).
   */
  async getByRole(role: Database['public']['Enums']['user_role']): Promise<ServiceResult<UserRow[]>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name', { ascending: true })

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
      const message = err instanceof Error ? err.message : 'Unexpected error fetching users by role'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch all patients with their joined patient_profiles data.
   */
  async getPatientsWithProfiles(): Promise<ServiceResult<PatientWithProfile[]>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          patient_profile:patient_profiles!patient_profiles_user_id_fkey(*)
        `)
        .eq('role', 'patient')
        .order('full_name', { ascending: true })

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: (data as unknown as PatientWithProfile[]) || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching patients with profiles'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch a single patient with profile by user ID.
   */
  async getPatientWithProfile(idOrUserId: string): Promise<ServiceResult<PatientWithProfile>> {
    try {
      const supabase = await createClient()

      // 1. Try finding in patients table first (by id or user_id)
      const { data: patientRecord } = await supabase
        .from('patients')
        .select(`
          *,
          user:users!patients_user_id_fkey(*)
        `)
        .or(`id.eq.${idOrUserId},user_id.eq.${idOrUserId}`)
        .maybeSingle()

      if (patientRecord) {
        const shaped: PatientWithProfile = {
          id: patientRecord.id,
          full_name: patientRecord.full_name,
          email: patientRecord.user?.email || '',
          role: 'patient',
          is_active: patientRecord.user?.is_active ?? true,
          created_at: patientRecord.created_at,
          updated_at: patientRecord.updated_at,
          phone: patientRecord.emergency_contact_phone,
          avatar_url: null,
          failed_login_attempts: 0,
          locked_until: null,
          patient_profile: {
            user_id: patientRecord.user_id || patientRecord.id,
            created_at: patientRecord.created_at,
            updated_at: patientRecord.updated_at,
            current_status: 'stable',
            primary_condition: patientRecord.diagnosis,
            date_of_birth: patientRecord.birth_date,
            sex: patientRecord.sex,
            room_bed: null,
            status_updated_at: null,
            status_updated_by: null,
          },
        }
        return { data: shaped, error: null }
      }

      // 2. Fallback to existing users + patient_profiles lookup
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          patient_profile:patient_profiles!patient_profiles_user_id_fkey(*)
        `)
        .eq('id', idOrUserId)
        .eq('role', 'patient')
        .single()

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: data as unknown as PatientWithProfile, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching patient profile'
      return { data: null, error: message }
    }
  },

  /**
   * Update user profile data (e.g. name, phone, avatar, is_active).
   */
  async updateProfile(id: string, payload: UserUpdate): Promise<ServiceResult<UserRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('users')
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
      const message = err instanceof Error ? err.message : 'Unexpected error updating user profile'
      return { data: null, error: message }
    }
  },

  /**
   * Update patient clinical profile fields (e.g. date_of_birth, sex, primary_condition).
   * Note: current_status updates are managed by doctor medical reviews, but profile metadata updates run here.
   */
  async updatePatientProfile(userId: string, payload: PatientProfileUpdate): Promise<ServiceResult<PatientProfileRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('patient_profiles')
        .update(payload)
        .eq('user_id', userId)
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
      const message = err instanceof Error ? err.message : 'Unexpected error updating patient profile'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch all registered users, optionally filtered to active users.
   */
  async getAllUsers(options?: { activeOnly?: boolean }): Promise<ServiceResult<UserRow[]>> {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })

      if (options?.activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

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
      const message = err instanceof Error ? err.message : 'Unexpected error fetching all users'
      return { data: null, error: message }
    }
  },
}
