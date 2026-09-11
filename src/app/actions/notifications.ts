'use server'

import { notificationsService } from '@/services/notificationsService'
import type { NotificationRow } from '@/services/notificationsService'

export async function getNotificationsAction() {
  return await notificationsService.getForUser()
}

export async function getUnreadNotificationCountAction() {
  return await notificationsService.getUnreadCount()
}

export async function markNotificationReadAction(notificationId: string) {
  return await notificationsService.markRead(notificationId)
}

export async function markAllNotificationsReadAction() {
  return await notificationsService.markAllRead()
}
