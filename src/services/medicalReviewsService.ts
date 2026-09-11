import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Tables, TablesInsert } from '@/types/database.types'

export type MedicalReviewRow = Tables<'medical_reviews'>
export type MedicalReviewInsert = TablesInsert<'medical_reviews'>

export interface MedicalReviewWithDoctor extends MedicalReviewRow {
  doctor: {
    id: string
    full_name: string
  } | null
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string; details?: string }

export const medicalReviewsService = {
  /**
   * Fetch all medical reviews for a specific patient, ordered newest first,
   * including the reviewing doctor's name.
   */
  async getByPatient(patientId: string): Promise<ServiceResult<MedicalReviewWithDoctor[]>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('medical_reviews')
        .select(`
          *,
          doctor:users!medical_reviews_doctor_id_fkey(
            id,
            full_name
          )
        `)
        .eq('patient_id', patientId)
        .order('reviewed_at', { ascending: false })

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: (data as unknown as MedicalReviewWithDoctor[]) || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching medical reviews'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch a medical review by its ID.
   */
  async getById(id: string): Promise<ServiceResult<MedicalReviewRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('medical_reviews')
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
      const message = err instanceof Error ? err.message : 'Unexpected error fetching medical review'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch the review corresponding to a specific vitals log (if one exists).
   */
  async getByVitalsLogId(vitalsLogId: string): Promise<ServiceResult<MedicalReviewRow | null>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('medical_reviews')
        .select('*')
        .eq('vitals_log_id', vitalsLogId)
        .maybeSingle()

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
      const message = err instanceof Error ? err.message : 'Unexpected error fetching medical review for vitals log'
      return { data: null, error: message }
    }
  },

  /**
   * Create a new medical review record.
   * Derives doctor_id server-side from the authenticated session for defense-in-depth.
   * This insert triggers the database trigger that updates patient_profiles.current_status
   * and fans out notifications (including critical_alert when new_status = 'critical').
   */
  async create(payload: Omit<MedicalReviewInsert, 'doctor_id'> & { doctor_id?: string }): Promise<ServiceResult<MedicalReviewRow>> {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return { data: null, error: 'Unauthorized: User not authenticated' }
      }

      const insertPayload: MedicalReviewInsert = {
        ...payload,
        doctor_id: user.id, // Strictly bind doctor identity server-side
      }

      const { data, error } = await supabase
        .from('medical_reviews')
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
      const message = err instanceof Error ? err.message : 'Unexpected error creating medical review'
      return { data: null, error: message }
    }
  },

  // Note on update() / delete():
  // Medical reviews are immutable clinical decisions (enforced by RLS with no UPDATE/DELETE policies).
  // Therefore, no update() or delete() methods are exposed in this service.
}
