'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationWithPatient } from '@/services/notificationsService'
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notifications'

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<NotificationWithPatient[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const supabaseRef = useRef(createClient())

  // 1. Initial fetch of notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsAction()
      if (res.data) {
        setNotifications(res.data)
        const unread = res.data.filter((n) => !n.is_read).length
        setUnreadCount(unread)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    fetchNotifications()

    // 30-second polling fallback
    const pollInterval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    const supabase = supabaseRef.current
    const channelName = `user-notifications:${userId}`

    // Synchronize access token to realtime socket
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    // 2. Subscribe to Supabase Realtime postgres_changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationWithPatient
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev
            return [newNotif, ...prev]
          })
          if (!newNotif.is_read) {
            setUnreadCount((count) => count + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as NotificationWithPatient
          setNotifications((prev) => {
            const next = prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
            setUnreadCount(next.filter((n) => !n.is_read).length)
            return next
          })
        }
      )
      .subscribe()

    // 3. Strict cleanup on unmount to prevent duplicate socket accumulation
    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [userId, fetchNotifications])

  // 4. Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    const res = await markNotificationReadAction(notificationId)
    if (res.error) {
      // Revert if server action failed
      fetchNotifications()
    }
  }, [fetchNotifications])

  // 5. Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)

    const res = await markAllNotificationsReadAction()
    if (res.error) {
      fetchNotifications()
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
