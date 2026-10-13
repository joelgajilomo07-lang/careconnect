'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Activity,
  HeartPulse,
  Pill,
  Calendar,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useRealtimeNotifications(userId)

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getNotificationIcon = (type: string, priority?: string) => {
    if (priority === 'high') {
      return <AlertTriangle className="h-4 w-4 text-[#F25F5C] shrink-0" />
    }
    switch (type) {
      case 'critical_alert':
      case 'urgent_update':
        return <AlertTriangle className="h-4 w-4 text-[#F25F5C] shrink-0" />
      case 'medication_alert':
        return <Pill className="h-4 w-4 text-[#F5A524] shrink-0" />
      case 'appointment_reminder':
        return <Calendar className="h-4 w-4 text-[#5B5FE8] shrink-0" />
      case 'message':
      case 'feedback_issued':
        return <MessageSquare className="h-4 w-4 text-[#5B5FE8] shrink-0" />
      case 'status_update':
        return <Activity className="h-4 w-4 text-[#F5A524] shrink-0" />
      case 'new_vitals_log':
        return <HeartPulse className="h-4 w-4 text-[#2DD4BF] shrink-0" />
      default:
        return <Bell className="h-4 w-4 text-slate-500 shrink-0" />
    }
  }

  const handleNotificationClick = async (n: {
    id: string
    is_read: boolean
    link?: string | null
    patient_id?: string
  }) => {
    if (!n.is_read) {
      await markAsRead(n.id)
    }
    setIsOpen(false)
    if (n.link) {
      router.push(n.link)
    } else {
      router.push('/notifications')
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:text-[#5B5FE8] hover:bg-[#EEF0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8]/40 cursor-pointer transition-colors shadow-xs"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#F25F5C] px-1 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 border border-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1E2243]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#EEF0FF] px-2 py-0.5 text-xs font-semibold text-[#5B5FE8]">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-xs font-semibold text-[#5B5FE8] hover:text-[#4A4ED4] p-1.5 rounded-lg hover:bg-[#EEF0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8]/40 cursor-pointer transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 focus-visible:outline-none transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-[#5B5FE8]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Bell className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-[#1E2243]">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Alerts, care notes, and messages will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isHighPriority = n.priority === 'high'
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer ${
                      n.is_read
                        ? 'bg-white hover:bg-slate-50/80'
                        : isHighPriority
                        ? 'bg-rose-50/60 hover:bg-rose-50 border-l-4 border-[#F25F5C]'
                        : 'bg-[#EEF0FF]/40 hover:bg-[#EEF0FF]/70'
                    }`}
                  >
                    <div
                      className={`mt-0.5 rounded-xl p-2 ${
                        isHighPriority ? 'bg-rose-100' : 'bg-slate-100'
                      }`}
                    >
                      {getNotificationIcon(n.type, n.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            n.is_read
                              ? 'text-slate-700 font-medium'
                              : isHighPriority
                              ? 'text-[#F25F5C] font-bold'
                              : 'text-[#1E2243] font-bold'
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {n.patient?.full_name && (
                        <p className="text-[11px] font-semibold text-[#5B5FE8] mt-0.5">
                          Patient: {n.patient.full_name}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${
                          isHighPriority ? 'bg-[#F25F5C]' : 'bg-[#5B5FE8]'
                        }`}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer: View all notifications */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B5FE8] hover:text-[#4A4ED4] py-1.5 px-3 rounded-lg hover:bg-[#EEF0FF] transition-colors"
            >
              <span>View all notifications</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
