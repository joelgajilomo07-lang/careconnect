'use server'

import { vitalsLogsService } from '@/services/vitalsLogsService'
import type { VitalsLogInsert } from '@/services/vitalsLogsService'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getUserRole'

export async function submitVitalsLog(payload: Omit<VitalsLogInsert, 'caregiver_id'>) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: 'Unauthorized: You must be logged in to record vitals.' }
  }

  const role = await getUserRole(user.id)
  if (role !== 'caregiver') {
    return { data: null, error: 'Forbidden: Only caregivers are authorized to log vitals.' }
  }

  // Fetch verified user full_name from public.users table or auth metadata
  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const recordedByName =
    userData?.full_name ||
    user.user_metadata?.full_name ||
    payload.recorded_by_name ||
    'Bedside Caregiver'

  const staffIdCode =
    payload.staff_id_code ||
    `STF-${user.id.slice(0, 8).toUpperCase()}`

  const enrichedPayload: Omit<VitalsLogInsert, 'caregiver_id'> = {
    ...payload,
    recorded_by_name: recordedByName,
    staff_id_code: staffIdCode,
    measured_at: payload.measured_at || new Date().toISOString(),
  }

  const result = await vitalsLogsService.create(enrichedPayload)
  if (!result.error) revalidatePath('/history')
  return result
}
