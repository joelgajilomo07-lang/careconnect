'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/getUserRole'
import { messagesService } from '@/services/messagesService'

export async function getConversationsAction() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: 'Unauthorized: Please log in', code: '401' }
  }

  const role = await getUserRole(user.id)
  if (!role) {
    return { data: null, error: 'User role not found', code: '403' }
  }

  return await messagesService.getConversations(user.id, role)
}

export async function getThreadMessagesAction(patientId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: 'Unauthorized: Please log in', code: '401' }
  }

  const role = await getUserRole(user.id)
  if (!role) {
    return { data: null, error: 'User role not found', code: '403' }
  }

  return await messagesService.getThreadMessages(patientId, user.id, role)
}

export async function sendMessageAction(patientId: string, content: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: 'Unauthorized: Please log in', code: '401' }
  }

  const role = await getUserRole(user.id)
  if (!role) {
    return { data: null, error: 'User role not found', code: '403' }
  }

  return await messagesService.sendMessage({
    patientId,
    senderId: user.id,
    senderRole: role,
    content,
  })
}
