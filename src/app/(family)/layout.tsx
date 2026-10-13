import { requireRole } from '@/lib/auth/roleGuard'
import { AppShell, type NavItem } from '@/components/shared/AppShell'

const FAMILY_NAV_ITEMS: NavItem[] = [
  {
    name: 'Family Portal',
    href: '/family',
    icon: 'users',
  },
]

export default async function FamilyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role } = await requireRole(['family_member'])

  return (
    <AppShell user={user} role={role} navItems={FAMILY_NAV_ITEMS}>
      {children}
    </AppShell>
  )
}