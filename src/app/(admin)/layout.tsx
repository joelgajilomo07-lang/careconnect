import { requireRole } from '@/lib/auth/roleGuard'
import { AppShell, type NavItem } from '@/components/shared/AppShell'

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: 'dashboard',
  },
  {
    name: 'Invite User',
    href: '/admin/invite',
    icon: 'user-plus',
  },
  {
    name: 'Care Teams',
    href: '/care-teams',
    icon: 'users',
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role } = await requireRole(['admin'])

  return (
    <AppShell
      user={user}
      role={role}
      navItems={ADMIN_NAV_ITEMS}
      showNotifications={false}
    >
      {children}
    </AppShell>
  )
}