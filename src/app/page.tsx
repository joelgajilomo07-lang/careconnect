import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/roleGuard'

export default async function HomePage() {
  // Check the session and role of the current user
  const { role } = await requireRole(['admin', 'doctor', 'caregiver', 'patient', 'family_member'])

  // Redirect to their designated home route based on role
  switch (role) {
    case 'admin':
      redirect('/admin')
    case 'doctor':
      redirect('/triage')
    case 'caregiver':
      redirect('/log-vitals')
    case 'patient':
      redirect('/patient')
    case 'family_member':
      redirect('/family')
    default:
      redirect('/login')
  }
}
