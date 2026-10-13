import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type PatientRow = Tables<'patients'>
export type PatientInsert = TablesInsert<'patients'>
export type PatientUpdate = TablesUpdate<'patients'>

export type PatientWithAccount = PatientRow & {
  user?: Tables<'users'> | null
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string; details?: string }

export const patientsService = {
  /**
   * Fetch all patient records with linked account information.
   */
  async getAllPatients(): Promise<ServiceResult<PatientWithAccount[]>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          user:users!patients_user_id_fkey(*)
        `)
        .order('full_name', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: (data as unknown as PatientWithAccount[]) || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching patients'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch a single patient by ID.
   */
  async getPatientById(id: string): Promise<ServiceResult<PatientWithAccount>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          user:users!patients_user_id_fkey(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as unknown as PatientWithAccount, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching patient'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch the patient record linked to a specific user login ID (for role = 'patient').
   */
  async getPatientByUserId(userId: string): Promise<ServiceResult<PatientRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Patient record not found for this account' }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching patient by user ID'
      return { data: null, error: message }
    }
  },

  /**
   * Create a new patient profile (Admin only).
   */
  async createPatient(payload: PatientInsert): Promise<ServiceResult<PatientRow>> {
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('patients')
        .insert(payload)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating patient'
      return { data: null, error: message }
    }
  },

  /**
   * Link a patient profile to a user account (1:1 link).
   */
  async linkUserAccount(patientId: string, userId: string): Promise<ServiceResult<PatientRow>> {
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('patients')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('id', patientId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error linking patient account'
      return { data: null, error: message }
    }
  },
}
