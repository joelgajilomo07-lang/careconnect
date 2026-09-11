'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const setPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters long'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export async function setPasswordAction(payload: { password: string; confirmPassword: string }) {
  const parseResult = setPasswordSchema.safeParse(payload)
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message || 'Invalid password submission' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required. Please use your invitation or recovery link again.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parseResult.data.password,
  })

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}
