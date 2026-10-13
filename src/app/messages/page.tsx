import { AuthenticatedShell } from '@/components/shared/AuthenticatedShell'
import { MessagesClient } from './MessagesClient'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getUserRole'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Care Team Messages | CareConnect',
  description: 'Collaborative care messaging between doctors, caregivers, patients, and families',
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const role = await getUserRole(user.id)
  if (!role) {
    redirect('/api/auth/signout-unconfigured')
  }

  // Get current user display name
  const { data: userProfile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const displayName = userProfile?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <AuthenticatedShell>
      <MessagesClient
        currentUserId={user.id}
        currentUserRole={role}
        currentUserName={displayName}
      />
    </AuthenticatedShell>
  )
}
