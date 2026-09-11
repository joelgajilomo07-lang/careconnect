import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetPasswordForm from './set-password-form'

export const dynamic = 'force-dynamic'

export default async function SetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect_to=/set-password')
  }

  return <SetPasswordForm />
}
