'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Server Action to sign out the current user.
 * Server Actions run in an action phase where Next.js cookies().set() is fully mutable,
 * allowing @supabase/ssr to clear session cookies reliably across all platforms.
 */
export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
