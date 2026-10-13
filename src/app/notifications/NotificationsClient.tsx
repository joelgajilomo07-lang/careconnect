'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import type { NotificationWithPatient } from '@/services/notificationsService'
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
  Filter,
  ArrowRight,
  Clock,
  User,
  Check,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface NotificationsClientProps {
  userId: string
  userRole: string
}

type FilterType = 'all' | 'unread' | 'high'

export function NotificationsClient({ userId, userRole }: NotificationsClientProps) {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useRealtimeNotifications(userId)

  const [filter, setFilter] = useState<FilterType>('all')

  const highPriorityCount = useMemo(
    () => notifications.filter((n) => n.priority === 'high').length,
    [notifications]
  )

  // Sort: High-priority items pinned to top, then newest first
  const sortedAndFiltered = useMemo(() => {
    let list = [...notifications]

    if (filter === 'unread') {
      list = list.filter((n) => !n.is_read)
    } else if (filter === 'high') {
      list = list.filter((n) => n.priority === 'high')
    }

    // High-priority pinned to top; within same priority group, newest first
    return list.sort((a, b) => {
      const aIsHigh = a.priority === 'high' ? 1 : 0
      const bIsHigh = b.priority === 'high' ? 1 : 0
      if (aIsHigh !== bIsHigh) {
        return bIsHigh - aIsHigh // high priority first
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [notifications, filter])

  const getNotificationIcon = (type: string, priority?: string) => {
    if (priority === 'high') {
      return <AlertTriangle className="h-5 w-5 text-[#F25F5C] shrink-0" />
    }
    switch (type) {
      case 'critical_alert':
      case 'urgent_update':
        return <AlertTriangle className="h-5 w-5 text-[#F25F5C] shrink-0" />
      case 'medication_alert':
        return <Pill className="h-5 w-5 text-[#F5A524] shrink-0" />
      case 'appointment_reminder':
        return <Calendar className="h-5 w-5 text-[#5B5FE8] shrink-0" />
      case 'message':
      case 'feedback_issued':
        return <MessageSquare className="h-5 w-5 text-[#5B5FE8] shrink-0" />
      case 'status_update':
        return <Activity className="h-5 w-5 text-[#F5A524] shrink-0" />
      case 'new_vitals_log':
        return <HeartPulse className="h-5 w-5 text-[#2DD4BF] shrink-0" />
      default:
        return <Bell className="h-5 w-5 text-slate-500 shrink-0" />
    }
  }

  const resolveTargetLink = (n: NotificationWithPatient) => {
    if (n.link) return n.link
    if (n.type === 'message' && n.patient_id) {
      return `/messages?patientId=${n.patient_id}`
    }
    // Respect role-specific routing
    switch (userRole) {
      case 'doctor':
        return n.patient_id ? `/triage?patient=${n.patient_id}` : '/doctor'
      case 'caregiver':
        return '/caregiver'
      case 'patient':
        return '/patient'
      case 'family_member':
        return '/family'
      case 'admin':
        return '/admin'
      default:
        return '/notifications'
    }
  }

  const handleItemClick = async (n: NotificationWithPatient) => {
    if (!n.is_read) {
      await markAsRead(n.id)
    }
    const target = resolveTargetLink(n)
    if (target) {
      router.push(target)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2243] tracking-tight">
            Notifications
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Clinical alerts, messages, and patient updates across Tender Touch Home Care.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EEF0FF] text-[#5B5FE8] hover:bg-[#5B5FE8] hover:text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs w-fit">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-[#5B5FE8] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#1E2243] hover:bg-slate-50'
          }`}
        >
          <span>All</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              filter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'unread'
              ? 'bg-[#5B5FE8] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#1E2243] hover:bg-slate-50'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 ? (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filter === 'unread' ? 'bg-white text-[#5B5FE8]' : 'bg-[#EEF0FF] text-[#5B5FE8]'
              }`}
            >
              {unreadCount}
            </span>
          ) : (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                filter === 'unread' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              0
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter('high')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'high'
              ? 'bg-[#F25F5C] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#F25F5C] hover:bg-rose-50/60'
          }`}
        >
          <span>High Priority</span>
          {highPriorityCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filter === 'high' ? 'bg-white text-[#F25F5C]' : 'bg-rose-100 text-[#F25F5C]'
              }`}
            >
              {highPriorityCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#5B5FE8] border-r-transparent mb-3" />
            <p className="text-sm font-semibold text-[#1E2243]">Loading notifications...</p>
          </div>
        ) : sortedAndFiltered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#1E2243]">No notifications found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {filter === 'unread'
                ? 'All notifications have been read.'
                : filter === 'high'
                ? 'There are no active high-priority alerts.'
                : 'Your notifications feed is currently empty.'}
            </p>
          </div>
        ) : (
          sortedAndFiltered.map((n) => {
            const isHigh = n.priority === 'high'
            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleItemClick(n)}
                className={`group relative rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isHigh
                    ? 'border-[#F25F5C] bg-rose-50/70 hover:bg-rose-50 shadow-sm shadow-rose-100'
                    : n.is_read
                    ? 'border-slate-200/80 bg-white hover:bg-slate-50/80'
                    : 'border-[#5B5FE8]/30 bg-[#EEF0FF]/40 hover:bg-[#EEF0FF]/60 shadow-xs'
                }`}
              >
                {/* Left indicator bar for High Priority */}
                {isHigh && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r bg-[#F25F5C]" />
                )}

                <div className="flex items-start gap-4 flex-1 min-w-0 pl-1 sm:pl-2">
                  {/* Icon Badge */}
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isHigh
                        ? 'bg-white text-[#F25F5C] shadow-xs border border-rose-200'
                        : 'bg-white text-[#5B5FE8] shadow-xs border border-slate-200/70'
                    }`}
                  >
                    {getNotificationIcon(n.type, n.priority)}
                  </div>

                  {/* Notification Content */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm sm:text-base leading-snug truncate ${
                          n.is_read
                            ? 'font-medium text-slate-800'
                            : 'font-bold text-[#1E2243]'
                        }`}
                      >
                        {n.title}
                      </h3>

                      {isHigh && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#F25F5C] text-white">
                          High Priority
                        </span>
                      )}

                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#5B5FE8] shrink-0" />
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-slate-500">
                      {n.patient?.full_name && (
                        <span className="inline-flex items-center gap-1 text-[#5B5FE8] font-bold">
                          <User className="h-3 w-3" />
                          <span>Patient: {n.patient.full_name}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Arrow */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#5B5FE8] group-hover:bg-white group-hover:shadow-xs transition-all border border-transparent group-hover:border-slate-200">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
