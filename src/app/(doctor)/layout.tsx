import { requireRole } from '@/lib/auth/roleGuard'
import { AppShell, type NavItem } from '@/components/shared/AppShell'

const DOCTOR_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/doctor',
    icon: 'dashboard',
  },
  {
    name: 'Triage Queue',
    href: '/triage',
    icon: 'stethoscope',
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: 'message-square',
  },
]

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role } = await requireRole(['doctor'])

  return (
    <AppShell user={user} role={role} navItems={DOCTOR_NAV_ITEMS} showNotifications={true}>
      {children}
    </AppShell>
  )
}