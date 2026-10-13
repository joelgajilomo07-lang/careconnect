import { requireRole } from '@/lib/auth/roleGuard'
import { getUsersListAction, getUnlinkedPatientsAction } from '@/app/actions/userManagement'
import { UsersManagementClient } from './UsersManagementClient'

export const metadata = {
  title: 'User Management | CareConnect Admin',
  description: 'Manage staff, clinical providers, patient accounts, and family access',
}

export default async function UsersManagementPage() {
  const { user } = await requireRole(['admin'])

  const [usersRes, unlinkedRes] = await Promise.all([
    getUsersListAction(),
    getUnlinkedPatientsAction(),
  ])

  return (
    <UsersManagementClient
      initialUsers={usersRes.data || []}
      unlinkedPatients={unlinkedRes.data || []}
      currentAdminId={user.id}
    />
  )
}
