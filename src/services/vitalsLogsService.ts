import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database, Tables, TablesInsert } from '@/types/database.types'

export type VitalsLogRow = Tables<'vitals_logs'>
export type VitalsLogInsert = TablesInsert<'vitals_logs'>

export interface VitalsLogWithCaregiver extends VitalsLogRow {
  caregiver: {
    id: string
    full_name: string
  } | null
}

export interface VitalsLogDetail extends VitalsLogRow {
  patient: {
    id: string
    full_name: string
    patient_profile: {
      primary_condition: string | null
      current_status: Database['public']['Enums']['patient_status'] | null
      date_of_birth: string | null
      sex: string | null
    } | null
  } | null
  caregiver: {
    id: string
    full_name: string
  } | null
  medical_reviews: Array<{
    id: string
    reviewed_at: string
    new_status: Database['public']['Enums']['patient_status']
    is_urgent: boolean
    feedback_notes: string | null
    doctor: {
      id: string
      full_name: string
    } | null
  }>
}

export interface TriageQueueItem extends VitalsLogRow {
  patient: {
    id: string
    full_name: string
    is_active: boolean
    patient_profile: {
      primary_condition: string | null
      current_status: Database['public']['Enums']['patient_status'] | null
    } | null
  } | null
  caregiver: {
    id: string
    full_name: string
  } | null
  medical_reviews: Array<{
    id: string
    reviewed_at: string
    new_status: Database['public']['Enums']['patient_status']
    is_urgent: boolean
  }>
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string; details?: string }

export const vitalsLogsService = {
  /**
   * Fetch all vitals logs for a specific patient, ordered newest first,
   * including the logging caregiver's name.
   */
  async getByPatient(patientId: string): Promise<ServiceResult<VitalsLogWithCaregiver[]>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('vitals_logs')
        .select(`
          *,
          caregiver:users!vitals_logs_caregiver_id_fkey(
            id,
            full_name
          )
        `)
        .eq('patient_id', patientId)
        .order('logged_at', { ascending: false })

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: (data as unknown as VitalsLogWithCaregiver[]) || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching vitals logs'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch a single vitals log by its ID.
   */
  async getById(id: string): Promise<ServiceResult<VitalsLogRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('vitals_logs')
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
      const message = err instanceof Error ? err.message : 'Unexpected error fetching vitals log'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch full vitals log detail including patient profile, logging caregiver,
   * and any past reviews. Used for clinical triage & review forms.
   */
  async getDetailById(id: string): Promise<ServiceResult<VitalsLogDetail>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('vitals_logs')
        .select(`
          *,
          patient:patients!vitals_logs_patient_id_fkey(
            id,
            full_name,
            diagnosis,
            birth_date,
            sex
          ),
          caregiver:users!vitals_logs_caregiver_id_fkey(
            id,
            full_name
          ),
          medical_reviews(
            id,
            reviewed_at,
            new_status,
            is_urgent,
            feedback_notes,
            doctor:users!medical_reviews_doctor_id_fkey(
              id,
              full_name
            )
          )
        `)
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

      const row = data as unknown as any
      const transformed: VitalsLogDetail = {
        ...row,
        patient: row.patient
          ? {
              id: row.patient.id,
              full_name: row.patient.full_name,
              patient_profile: {
                primary_condition: row.patient.diagnosis,
                current_status: 'stable' as Database['public']['Enums']['patient_status'],
                date_of_birth: row.patient.birth_date,
                sex: row.patient.sex,
              },
            }
          : null,
      }

      return { data: transformed, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching vitals log detail'
      return { data: null, error: message }
    }
  },

  /**
   * Create a new vitals log record.
   * Derives caregiver_id server-side from the authenticated session for defense-in-depth,
   * while letting Postgres RLS and notification triggers execute in the caller's context.
   */
  async create(payload: Omit<VitalsLogInsert, 'caregiver_id'> & { caregiver_id?: string }): Promise<ServiceResult<VitalsLogRow>> {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return { data: null, error: 'Unauthorized: User not authenticated' }
      }

      const insertPayload: VitalsLogInsert = {
        ...payload,
        caregiver_id: user.id, // Strictly bind identity server-side
      }

      const { data, error } = await supabase
        .from('vitals_logs')
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
      const message = err instanceof Error ? err.message : 'Unexpected error creating vitals log'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch all vitals logs across all patients on the authenticated doctor's active care teams.
   * Scoped securely at the database level by PostgreSQL RLS (policy vitals_select_doctor_own_patient).
   */
  async getTriageQueueForDoctor(options?: { limit?: number; daysBack?: number }): Promise<ServiceResult<TriageQueueItem[]>> {
    try {
      const limit = options?.limit ?? 50
      const supabase = await createClient()
      let query = supabase
        .from('vitals_logs')
        .select(`
          *,
          patient:patients!vitals_logs_patient_id_fkey(
            id,
            full_name,
            diagnosis
          ),
          caregiver:users!vitals_logs_caregiver_id_fkey(
            id,
            full_name
          ),
          medical_reviews(
            id,
            reviewed_at,
            new_status,
            is_urgent
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (options?.daysBack) {
        const cutoff = new Date(Date.now() - options.daysBack * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', cutoff)
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

      const rows = (data || []) as unknown as any[]
      const transformed: TriageQueueItem[] = rows.map((r) => ({
        ...r,
        patient: r.patient
          ? {
              id: r.patient.id,
              full_name: r.patient.full_name,
              is_active: true,
              patient_profile: {
                primary_condition: r.patient.diagnosis,
                current_status: 'stable' as Database['public']['Enums']['patient_status'],
              },
            }
          : null,
      }))

      return { data: transformed, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching doctor triage queue'
      return { data: null, error: message }
    }
  },

  // Note on update() / delete():
  // Vitals logs are intentionally immutable clinical audit records (enforced by RLS with no UPDATE/DELETE policies).
  // Therefore, no update() or delete() methods are exposed in this service.
}
