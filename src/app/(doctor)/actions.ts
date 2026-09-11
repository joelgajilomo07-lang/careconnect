'use server'

import { medicalReviewsService } from '@/services/medicalReviewsService'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getUserRole'
import type { Database } from '@/types/database.types'

export interface SubmitMedicalReviewPayload {
  vitals_log_id: string
  new_status: Database['public']['Enums']['patient_status']
  feedback_notes: string
  is_urgent: boolean
}

export async function submitMedicalReviewAction(payload: SubmitMedicalReviewPayload) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: 'Unauthorized: You must be logged in to submit a medical review.' }
  }

  const role = await getUserRole(user.id)
  if (role !== 'doctor') {
    return { data: null, error: 'Forbidden: Only licensed doctors are authorized to submit medical reviews.' }
  }

  if (!payload.vitals_log_id) {
    return { data: null, error: 'Missing vital log reference.' }
  }

  // Derive patient_id server-side directly from the vitals log row in PostgreSQL.
  // Defense-in-depth: Never trust a client-supplied patient_id to match vitals_log_id.
  const { data: vitalsLog, error: vitalsError } = await supabase
    .from('vitals_logs')
    .select('id, patient_id')
    .eq('id', payload.vitals_log_id)
    .single()

  if (vitalsError || !vitalsLog) {
    return { data: null, error: 'The referenced vitals log does not exist or access is restricted by care team RLS.' }
  }

  const verifiedPatientId = vitalsLog.patient_id

  if (!payload.feedback_notes || payload.feedback_notes.trim().length === 0) {
    return { data: null, error: 'Clinical feedback and instructions are required.' }
  }

  const validStatuses: Database['public']['Enums']['patient_status'][] = ['stable', 'warning', 'critical']
  if (!validStatuses.includes(payload.new_status)) {
    return { data: null, error: 'Invalid clinical status. Must be Stable, Warning, or Critical.' }
  }

  // Call service layer (which strictly injects doctor_id = user.id from auth.getUser())
  const result = await medicalReviewsService.create({
    vitals_log_id: payload.vitals_log_id,
    patient_id: verifiedPatientId,
    new_status: payload.new_status,
    feedback_notes: payload.feedback_notes.trim(),
    is_urgent: payload.is_urgent,
  })

  if (!result.error) {
    revalidatePath('/triage')
    revalidatePath(`/patients/${verifiedPatientId}`)
    revalidatePath('/history')
  }

  return result
}
