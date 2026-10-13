import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tables, TablesInsert } from '@/types/database.types'

export type AuditLogRow = Tables<'audit_logs'>
export type AuditLogInsert = TablesInsert<'audit_logs'>

export interface RecordAuditLogParams {
  userId?: string | null
  userName?: string | null
  userRole?: string | null
  action: string
  recordType?: string | null
  recordId?: string | null
  ipAddress?: string | null
  details?: Record<string, unknown> | null
}

export interface GetAuditLogsFilter {
  userId?: string
  userRole?: string
  action?: string
  recordType?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string; details?: string }

export const auditService = {
  /**
   * Record an audit event into public.audit_logs.
   * Uses admin client to guarantee write persistence even in pre-auth scenarios (e.g. failed login).
   */
  async record(params: RecordAuditLogParams): Promise<ServiceResult<AuditLogRow>> {
    try {
      const adminClient = createAdminClient()

      // If user details not fully provided, try deriving from session if available
      let finalUserId = params.userId
      let finalUserName = params.userName
      let finalUserRole = params.userRole

      if (!finalUserId) {
        try {
          const supabase = await createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            finalUserId = user.id
            if (!finalUserName || !finalUserRole) {
              const { data: profile } = await adminClient
                .from('users')
                .select('full_name, role')
                .eq('id', user.id)
                .single()
              if (profile) {
                finalUserName = finalUserName || profile.full_name
                finalUserRole = finalUserRole || profile.role
              }
            }
          }
        } catch {
          // Session may not be present in public/auth callback routes; continue with provided params
        }
      }

      const insertPayload: AuditLogInsert = {
        user_id: finalUserId || null,
        user_name: finalUserName || null,
        user_role: finalUserRole || null,
        action: params.action,
        record_type: params.recordType || null,
        record_id: params.recordId || null,
        ip_address: params.ipAddress || null,
        details: (params.details as any) ?? null,
      }

      const { data, error } = await adminClient
        .from('audit_logs')
        .insert(insertPayload)
        .select()
        .single()

      if (error) {
        console.error('Failed to write audit log:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error recording audit log'
      console.error('Audit service exception:', err)
      return { data: null, error: message }
    }
  },

  /**
   * Fetch audit logs with filtering and pagination. Admin only.
   */
  async getLogs(filter: GetAuditLogsFilter = {}): Promise<ServiceResult<{ logs: AuditLogRow[]; total: number }>> {
    try {
      const supabase = await createClient()
      const limit = filter.limit ?? 50
      const offset = filter.offset ?? 0

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })

      if (filter.userId) {
        query = query.eq('user_id', filter.userId)
      }
      if (filter.userRole) {
        query = query.eq('user_role', filter.userRole)
      }
      if (filter.action) {
        query = query.eq('action', filter.action)
      }
      if (filter.recordType) {
        query = query.eq('record_type', filter.recordType)
      }
      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate)
      }
      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate)
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: {
          logs: data || [],
          total: count ?? 0,
        },
        error: null,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching audit logs'
      return { data: null, error: message }
    }
  },
}
