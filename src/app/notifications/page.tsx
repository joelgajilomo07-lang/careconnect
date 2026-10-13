import { AuthenticatedShell } from '@/components/shared/AuthenticatedShell'
import { NotificationsClient } from './NotificationsClient'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getUserRole'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Notifications | CareConnect',
  description: 'View patient alerts, vital updates, and care team notifications',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const role = await getUserRole(user.id)
  if (!role) {
    redirect('/api/auth/signout-unconfigured')
  }

  return (
    <AuthenticatedShell>
      <NotificationsClient userId={user.id} userRole={role} />
    </AuthenticatedShell>
  )
}
