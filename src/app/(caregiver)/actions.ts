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

  const result = await vitalsLogsService.create(payload)
  if (!result.error) revalidatePath('/history')
  return result
}
