import { requireRole } from '@/lib/auth/roleGuard'
import { getAuditLogsAction } from '@/app/actions/auditLogs'
import { AuditLogsClient } from './AuditLogsClient'

export const metadata = {
  title: 'System Audit Logs | CareConnect Admin',
  description: 'Tender Touch Home Care Services – Comprehensive Immutable Audit Trail (Figure 13 Task A)',
}

export default async function AdminAuditLogsPage() {
  await requireRole(['admin'])

  const res = await getAuditLogsAction({ limit: 25, offset: 0 })

  return (
    <AuditLogsClient
      initialLogs={res.data || []}
      totalLogs={res.total || 0}
      users={res.users || []}
    />
  )
}
