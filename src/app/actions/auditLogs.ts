'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { auditService, type GetAuditLogsFilter } from '@/services/auditService'

export interface AuditLogItem {
  id: string
  created_at: string
  user_id: string | null
  user_name: string | null
  user_role: string | null
  action: string
  record_type: string | null
  record_id: string | null
  ip_address: string | null
  details: Record<string, unknown> | null
}

export async function getAuditLogsAction(filter: GetAuditLogsFilter = {}) {
  await requireRole(['admin'])

  const adminClient = createAdminClient()
  const limit = filter.limit ?? 25
  const offset = filter.offset ?? 0

  let query = adminClient
    .from('audit_logs')
    .select('*', { count: 'exact' })

  if (filter.userId) {
    query = query.eq('user_id', filter.userId)
  }
  if (filter.userRole && filter.userRole !== 'all') {
    query = query.eq('user_role', filter.userRole)
  }
  if (filter.action && filter.action !== 'all') {
    query = query.eq('action', filter.action)
  }
  if (filter.recordType && filter.recordType !== 'all') {
    query = query.eq('record_type', filter.recordType)
  }
  if (filter.startDate) {
    query = query.gte('created_at', new Date(filter.startDate).toISOString())
  }
  if (filter.endDate) {
    // End of day
    const end = new Date(filter.endDate)
    end.setHours(23, 59, 59, 999)
    query = query.lte('created_at', end.toISOString())
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return { data: null, total: 0, error: error.message }
  }

  // Fetch unique users for the filter dropdown
  const { data: userList } = await adminClient
    .from('users')
    .select('id, full_name, role, email')
    .order('full_name', { ascending: true })

  return {
    data: (data as unknown as AuditLogItem[]) || [],
    total: count ?? 0,
    users: userList || [],
    error: null,
  }
}
