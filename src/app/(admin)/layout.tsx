import { requireRole } from '@/lib/auth/roleGuard'
import { AppShell, type NavItem } from '@/components/shared/AppShell'

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: 'dashboard',
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: 'user-plus',
  },
  {
    name: 'Patients & Care Teams',
    href: '/admin/patients',
    icon: 'users',
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: 'clipboard-list',
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: 'file-text',
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: 'message-square',
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
      showNotifications={true}
    >
      {children}
    </AppShell>
  )
}