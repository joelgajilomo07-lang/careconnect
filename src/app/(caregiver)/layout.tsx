import { requireRole } from '@/lib/auth/roleGuard'
import { AppShell, type NavItem } from '@/components/shared/AppShell'

const CAREGIVER_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/caregiver',
    icon: 'dashboard',
  },
  {
    name: 'Log Vitals',
    href: '/log-vitals',
    icon: 'heart-pulse',
  },
  {
    name: 'History',
    href: '/history',
    icon: 'history',
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: 'message-square',
  },
]

export default async function CaregiverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role } = await requireRole(['caregiver'])

  return (
    <AppShell user={user} role={role} navItems={CAREGIVER_NAV_ITEMS} showNotifications={true}>
      {children}
    </AppShell>
  )
}