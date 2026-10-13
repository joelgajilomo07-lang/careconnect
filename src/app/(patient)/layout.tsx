import { requireRole } from '@/lib/auth/roleGuard'
import { AppShell, type NavItem } from '@/components/shared/AppShell'

const PATIENT_NAV_ITEMS: NavItem[] = [
  {
    name: 'My Health',
    href: '/patient',
    icon: 'user',
  },
]

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role } = await requireRole(['patient'])

  return (
    <AppShell user={user} role={role} navItems={PATIENT_NAV_ITEMS}>
      {children}
    </AppShell>
  )
}