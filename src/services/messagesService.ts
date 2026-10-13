import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationsService } from './notificationsService'
import type { Database } from '@/types/database.types'

export type UserRole = Database['public']['Enums']['user_role']

export interface ThreadMessage {
  id: string
  patient_id: string
  sender_id: string
  content: string
  created_at: string
  sender: {
    id: string
    full_name: string
    email: string
    role: UserRole
  }
}

export interface ConversationParticipant {
  id: string
  full_name: string
  role: string
  relationship_label?: string | null
}

export interface CareTeamConversation {
  patientId: string
  patientName: string
  diagnosis?: string | null
  participants: ConversationParticipant[]
  lastMessage?: {
    id: string
    content: string
    created_at: string
    sender_name: string
    sender_role: string
  } | null
  unreadCount?: number
}

export interface ServiceResult<T> {
  data: T | null
  error: string | null
  code?: string
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  doctor: 'Doctor',
  caregiver: 'Caregiver',
  family_member: 'Family',
  patient: 'Patient',
}

export const messagesService = {
  /**
   * Verify if the user has permission to participate in the patient's care team messaging thread.
   */
  async checkPatientAccess(
    patientId: string,
    userId: string,
    role: UserRole
  ): Promise<boolean> {
    const supabase = await createClient()

    // 1. Admin can access all patient care team threads
    if (role === 'admin') {
      return true
    }

    // 2. Patient can only access their own record
    if (role === 'patient') {
      const { data } = await supabase
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .eq('user_id', userId)
        .single()
      return !!data
    }

    // 3. Family member must be linked in care_teams as family_member
    if (role === 'family_member') {
      const { data } = await supabase
        .from('care_teams')
        .select('id')
        .eq('patient_id', patientId)
        .eq('member_id', userId)
        .eq('member_role', 'family_member')
        .eq('is_active', true)
        .single()
      return !!data
    }

    // 4. Doctor or Caregiver must be active member of care_teams
    if (role === 'doctor' || role === 'caregiver') {
      const { data } = await supabase
        .from('care_teams')
        .select('id')
        .eq('patient_id', patientId)
        .eq('member_id', userId)
        .eq('is_active', true)
        .single()
      return !!data
    }

    return false
  },

  /**
   * Fetch all conversation threads accessible to the user.
   * Admin: all patients
   * Doctor / Caregiver: assigned patients
   * Family Member: linked patients
   * Patient: only own patient record
   */
  async getConversations(
    userId: string,
    role: UserRole
  ): Promise<ServiceResult<CareTeamConversation[]>> {
    try {
      const supabase = await createClient()
      const adminClient = createAdminClient()

      let patientIds: string[] = []

      if (role === 'admin') {
        const { data: allPatients } = await supabase
          .from('patients')
          .select('id')
          .order('full_name')
        patientIds = (allPatients || []).map((p) => p.id)
      } else if (role === 'patient') {
        const { data: ownPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', userId)
          .single()
        if (ownPatient) {
          patientIds = [ownPatient.id]
        }
      } else if (role === 'family_member') {
        const { data: linked } = await supabase
          .from('care_teams')
          .select('patient_id')
          .eq('member_id', userId)
          .eq('member_role', 'family_member')
          .eq('is_active', true)
        patientIds = (linked || []).map((ct) => ct.patient_id)
      } else {
        // Doctor or Caregiver
        const { data: assigned } = await supabase
          .from('care_teams')
          .select('patient_id')
          .eq('member_id', userId)
          .eq('is_active', true)
        patientIds = (assigned || []).map((ct) => ct.patient_id)
      }

      if (patientIds.length === 0) {
        return { data: [], error: null }
      }

      // Fetch patient records
      const { data: patients, error: patientErr } = await supabase
        .from('patients')
        .select('id, full_name, diagnosis, user_id')
        .in('id', patientIds)
        .order('full_name')

      if (patientErr || !patients) {
        return { data: null, error: patientErr?.message || 'Failed to load patients' }
      }

      // For each patient, fetch care team members and the last message
      const conversations: CareTeamConversation[] = await Promise.all(
        patients.map(async (patient) => {
          // Fetch care team participants
          const { data: teamMembers } = await adminClient
            .from('care_teams')
            .select(`
              member_id,
              member_role,
              relationship_label,
              user:users!care_teams_member_id_fkey(id, full_name, role)
            `)
            .eq('patient_id', patient.id)
            .eq('is_active', true)

          const participants: ConversationParticipant[] = []

          // Add care team members
          if (teamMembers) {
            for (const tm of teamMembers) {
              const u = tm.user as unknown as { id: string; full_name: string; role: string } | null
              if (u) {
                participants.push({
                  id: u.id,
                  full_name: u.full_name,
                  role: tm.member_role,
                  relationship_label: tm.relationship_label,
                })
              }
            }
          }

          // If patient has account, add patient to participants
          if (patient.user_id) {
            const { data: patientUser } = await adminClient
              .from('users')
              .select('id, full_name, role')
              .eq('id', patient.user_id)
              .single()
            if (patientUser) {
              participants.push({
                id: patientUser.id,
                full_name: patientUser.full_name,
                role: 'patient',
              })
            }
          }

          // Fetch last message for this patient
          const { data: lastMsg } = await adminClient
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              sender:users!messages_sender_id_fkey(full_name, role)
            `)
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const sender = lastMsg?.sender as unknown as { full_name: string; role: string } | null

          return {
            patientId: patient.id,
            patientName: patient.full_name,
            diagnosis: patient.diagnosis,
            participants,
            lastMessage: lastMsg
              ? {
                  id: lastMsg.id,
                  content: lastMsg.content,
                  created_at: lastMsg.created_at,
                  sender_name: sender?.full_name || 'Care Team Member',
                  sender_role: sender?.role || 'team',
                }
              : null,
          }
        })
      )

      return { data: conversations, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error loading conversations'
      return { data: null, error: message }
    }
  },

  /**
   * Fetch thread messages for a specific patient.
   * Enforces strict server-side 403 access control.
   */
  async getThreadMessages(
    patientId: string,
    userId: string,
    role: UserRole
  ): Promise<
    ServiceResult<{
      patient: { id: string; full_name: string; diagnosis?: string | null }
      messages: ThreadMessage[]
      participants: ConversationParticipant[]
    }>
  > {
    try {
      // 1. Authorization check
      const hasAccess = await this.checkPatientAccess(patientId, userId, role)
      if (!hasAccess) {
        return {
          data: null,
          error: 'Access Forbidden: You do not have permission to view or participate in this patient care team thread.',
          code: '403',
        }
      }

      const adminClient = createAdminClient()

      // 2. Fetch patient info
      const { data: patient, error: patientErr } = await adminClient
        .from('patients')
        .select('id, full_name, diagnosis, user_id')
        .eq('id', patientId)
        .single()

      if (patientErr || !patient) {
        return { data: null, error: 'Patient not found', code: '404' }
      }

      // 3. Fetch participants
      const { data: teamMembers } = await adminClient
        .from('care_teams')
        .select(`
          member_id,
          member_role,
          relationship_label,
          user:users!care_teams_member_id_fkey(id, full_name, role)
        `)
        .eq('patient_id', patientId)
        .eq('is_active', true)

      const participants: ConversationParticipant[] = []
      if (teamMembers) {
        for (const tm of teamMembers) {
          const u = tm.user as unknown as { id: string; full_name: string; role: string } | null
          if (u) {
            participants.push({
              id: u.id,
              full_name: u.full_name,
              role: tm.member_role,
              relationship_label: tm.relationship_label,
            })
          }
        }
      }

      if (patient.user_id) {
        const { data: patientUser } = await adminClient
          .from('users')
          .select('id, full_name, role')
          .eq('id', patient.user_id)
          .single()
        if (patientUser) {
          participants.push({
            id: patientUser.id,
            full_name: patientUser.full_name,
            role: 'patient',
          })
        }
      }

      // 4. Fetch messages ordered chronologically (newest at bottom)
      const { data: messages, error: msgErr } = await adminClient
        .from('messages')
        .select(`
          id,
          patient_id,
          sender_id,
          content,
          created_at,
          sender:users!messages_sender_id_fkey(id, full_name, email, role)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true })

      if (msgErr) {
        return { data: null, error: msgErr.message }
      }

      const formattedMessages: ThreadMessage[] = (messages || []).map((m) => {
        const s = m.sender as unknown as { id: string; full_name: string; email: string; role: UserRole }
        return {
          id: m.id,
          patient_id: m.patient_id,
          sender_id: m.sender_id,
          content: m.content,
          created_at: m.created_at,
          sender: {
            id: s?.id || m.sender_id,
            full_name: s?.full_name || 'User',
            email: s?.email || '',
            role: s?.role || 'patient',
          },
        }
      })

      return {
        data: {
          patient: {
            id: patient.id,
            full_name: patient.full_name,
            diagnosis: patient.diagnosis,
          },
          messages: formattedMessages,
          participants,
        },
        error: null,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error loading messages'
      return { data: null, error: message }
    }
  },

  /**
   * Send a new message in the patient care team thread.
   * Enforces 403 authorization and triggers normal-priority notifications to other participants.
   */
  async sendMessage(params: {
    patientId: string
    senderId: string
    senderRole: UserRole
    content: string
  }): Promise<ServiceResult<ThreadMessage>> {
    try {
      const { patientId, senderId, senderRole, content } = params

      // 1. Content validation
      const trimmed = content?.trim()
      if (!trimmed || trimmed.length === 0) {
        return { data: null, error: 'Message cannot be empty' }
      }
      if (trimmed.length > 2000) {
        return { data: null, error: 'Message is too long (maximum 2,000 characters)' }
      }

      // 2. Server-side access authorization check
      const hasAccess = await this.checkPatientAccess(patientId, senderId, senderRole)
      if (!hasAccess) {
        return {
          data: null,
          error: 'Access Forbidden: You are not authorized to post messages to this care team.',
          code: '403',
        }
      }

      const adminClient = createAdminClient()

      // 3. Get sender and patient details
      const [senderRes, patientRes] = await Promise.all([
        adminClient.from('users').select('id, full_name, email, role').eq('id', senderId).single(),
        adminClient.from('patients').select('id, full_name, user_id').eq('id', patientId).single(),
      ])

      if (!senderRes.data || !patientRes.data) {
        return { data: null, error: 'Sender or patient not found' }
      }

      const senderUser = senderRes.data
      const patient = patientRes.data

      // 4. Insert message
      const { data: newMsg, error: insertErr } = await adminClient
        .from('messages')
        .insert({
          patient_id: patientId,
          sender_id: senderId,
          content: trimmed,
        })
        .select()
        .single()

      if (insertErr || !newMsg) {
        return { data: null, error: insertErr?.message || 'Failed to send message' }
      }

      // 5. Gather all other participants to notify
      const recipientIds = new Set<string>()

      // Care team members
      const { data: teamMembers } = await adminClient
        .from('care_teams')
        .select('member_id')
        .eq('patient_id', patientId)
        .eq('is_active', true)

      if (teamMembers) {
        for (const tm of teamMembers) {
          if (tm.member_id && tm.member_id !== senderId) {
            recipientIds.add(tm.member_id)
          }
        }
      }

      // Patient account
      if (patient.user_id && patient.user_id !== senderId) {
        recipientIds.add(patient.user_id)
      }

      // Administrators
      const { data: admins } = await adminClient
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)

      if (admins) {
        for (const a of admins) {
          if (a.id !== senderId) {
            recipientIds.add(a.id)
          }
        }
      }

      // Dispatch notifications in background
      const roleLabel = ROLE_LABELS[senderRole] || senderRole
      const snippet = trimmed.length > 70 ? `${trimmed.slice(0, 67)}...` : trimmed

      await Promise.all(
        Array.from(recipientIds).map((recId) =>
          notificationsService.createNotification({
            recipientId: recId,
            patientId: patientId,
            type: 'message',
            priority: 'normal',
            title: `New message from ${senderUser.full_name} (${roleLabel})`,
            message: `${patient.full_name}'s Care Team: "${snippet}"`,
            link: `/messages?patientId=${patientId}`,
          })
        )
      )

      return {
        data: {
          id: newMsg.id,
          patient_id: newMsg.patient_id,
          sender_id: newMsg.sender_id,
          content: newMsg.content,
          created_at: newMsg.created_at,
          sender: {
            id: senderUser.id,
            full_name: senderUser.full_name,
            email: senderUser.email,
            role: senderUser.role,
          },
        },
        error: null,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error sending message'
      return { data: null, error: message }
    }
  },
}
