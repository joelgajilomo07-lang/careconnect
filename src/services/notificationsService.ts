import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type NotificationRow = Tables<'notifications'>
export type NotificationInsert = TablesInsert<'notifications'>
export type NotificationUpdate = TablesUpdate<'notifications'>

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; code?: string; details?: string }

export const notificationsService = {
  /**
   * Fetch all notifications for the authenticated user, newest first.
   * If userId is omitted, derives it server-side from the authenticated session.
   */
  async getForUser(userId?: string): Promise<ServiceResult<NotificationRow[]>> {
    try {
      const supabase = await createClient()
      let targetUserId = userId

      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { data: null, error: 'Unauthorized: User not authenticated' }
        targetUserId = user.id
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', targetUserId)
        .order('created_at', { ascending: false })

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: data || [], error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error fetching notifications'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch unread notifications count for a user (useful for badge counters).
   * Derives recipient_id from session if omitted.
   */
  async getUnreadCount(userId?: string): Promise<ServiceResult<number>> {
    try {
      const supabase = await createClient()
      let targetUserId = userId

      if (!targetUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { data: null, error: 'Unauthorized: User not authenticated' }
        targetUserId = user.id
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', targetUserId)
        .eq('is_read', false)

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: count || 0, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error counting notifications'
      return { data: null, error: message }
    }
  },

  /**
   * Mark a notification as read (checked against RLS: recipient_id = auth.uid()).
   */
  async markRead(id: string): Promise<ServiceResult<NotificationRow>> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error marking notification read'
      return { data: null, error: message }
    }
  },

  /**
   * Mark all notifications for the authenticated user as read.
   * Derives user ID strictly from the authenticated session for defense-in-depth identity binding.
   */
  async markAllRead(): Promise<ServiceResult<null>> {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return { data: null, error: 'Unauthorized: User not authenticated' }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      if (error) {
        return {
          data: null,
          error: error.message,
          code: error.code,
          details: error.details,
        }
      }

      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error marking all notifications read'
      return { data: null, error: message }
    }
  },
}
