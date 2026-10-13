import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getUserRole'
import { AppShell, type NavItem } from '@/components/shared/AppShell'

const ROLE_NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { name: 'Dashboard', href: '/admin', icon: 'dashboard' },
    { name: 'User Management', href: '/admin/users', icon: 'user-plus' },
    { name: 'Care Teams', href: '/care-teams', icon: 'users' },
    { name: 'Messages', href: '/messages', icon: 'message-square' },
  ],
  doctor: [
    { name: 'Triage Queue', href: '/triage', icon: 'stethoscope' },
    { name: 'Messages', href: '/messages', icon: 'message-square' },
  ],
  caregiver: [
    { name: 'Log Vitals', href: '/log-vitals', icon: 'heart-pulse' },
    { name: 'History', href: '/history', icon: 'history' },
    { name: 'Messages', href: '/messages', icon: 'message-square' },
  ],
  family_member: [
    { name: 'Family Portal', href: '/family', icon: 'users' },
    { name: 'Messages', href: '/messages', icon: 'message-square' },
  ],
  patient: [
    { name: 'My Health', href: '/patient', icon: 'user' },
    { name: 'Messages', href: '/messages', icon: 'message-square' },
  ],
}

export async function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const role = await getUserRole(user.id)
  if (!role) {
    redirect('/api/auth/signout-unconfigured')
  }

  const navItems = ROLE_NAV_ITEMS[role] || [
    { name: 'Messages', href: '/messages', icon: 'message-square' },
  ]

  return (
    <AppShell
      user={user}
      role={role}
      navItems={navItems}
      showNotifications={true}
    >
      {children}
    </AppShell>
  )
}
