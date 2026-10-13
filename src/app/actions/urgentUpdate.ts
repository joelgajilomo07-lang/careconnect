'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationsService } from '@/services/notificationsService'
import { auditService } from '@/services/auditService'
import { revalidatePath } from 'next/cache'

export interface UrgentUpdatePayload {
  patientId: string
  eventType: 'Fall' | 'Difficulty Breathing' | 'Chest Pain' | 'Loss of Consciousness' | 'Severe Pain' | 'Other'
  description: string
  vitalSigns?: {
    bp?: string
    heartRate?: string
    spo2?: string
    temperature?: string
  }
}

export async function sendUrgentUpdateAction(payload: UrgentUpdatePayload): Promise<{
  success: boolean
  error?: string
  sentAt?: string
  notifiedCount?: number
}> {
  try {
    const { user } = await requireRole(['caregiver'])
    const adminClient = createAdminClient()

    if (!payload.patientId || !payload.eventType || !payload.description?.trim()) {
      return { success: false, error: 'Patient, event type, and description are required.' }
    }

    // 1. Verify caregiver is assigned to this patient
    const { data: assignment } = await adminClient
      .from('care_teams')
      .select('id')
      .eq('patient_id', payload.patientId)
      .eq('member_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!assignment) {
      return { success: false, error: 'Access forbidden: You are not assigned to this patient.' }
    }

    // 2. Fetch patient and assigned doctor
    const { data: patient } = await adminClient
      .from('patients')
      .select('id, full_name')
      .eq('id', payload.patientId)
      .single()

    if (!patient) return { success: false, error: 'Patient not found' }

    const { data: caregiverUser } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const caregiverName = caregiverUser?.full_name || 'Caregiver'

    // Fetch assigned doctor(s)
    const { data: docAssignments } = await adminClient
      .from('care_teams')
      .select('member_id')
      .eq('patient_id', payload.patientId)
      .eq('member_role', 'doctor')
      .eq('is_active', true)

    // Fetch all admins
    const { data: adminUsers } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    const recipientIds = new Set<string>()
    ;(docAssignments || []).forEach((d) => recipientIds.add(d.member_id))
    ;(adminUsers || []).forEach((a) => recipientIds.add(a.id))

    const sentAt = new Date().toISOString()
    const alertTitle = `URGENT ALERT: ${payload.eventType} - ${patient.full_name}`
    let alertMessage = `${caregiverName} reported: ${payload.description.trim()}`
    if (payload.vitalSigns && Object.keys(payload.vitalSigns).length > 0) {
      const v = payload.vitalSigns
      const vitalsText = [
        v.bp ? `BP: ${v.bp}` : null,
        v.heartRate ? `HR: ${v.heartRate} bpm` : null,
        v.spo2 ? `SpO2: ${v.spo2}%` : null,
        v.temperature ? `Temp: ${v.temperature}°C` : null,
      ]
        .filter(Boolean)
        .join(', ')
      if (vitalsText) alertMessage += ` [Vitals: ${vitalsText}]`
    }

    // 3. Dispatch HIGH-priority notification to each recipient
    for (const recipientId of recipientIds) {
      await notificationsService.createNotification({
        recipientId,
        patientId: payload.patientId,
        type: 'urgent_update',
        priority: 'high',
        title: alertTitle,
        message: alertMessage,
        link: `/patients/${payload.patientId}`,
      })
    }

    // 4. Save to public.audit_logs
    await auditService.record({
      userId: user.id,
      userName: caregiverName,
      userRole: 'caregiver',
      action: 'URGENT_UPDATE_SENT',
      recordType: 'patients',
      recordId: payload.patientId,
      details: {
        event_type: payload.eventType,
        description: payload.description,
        vital_signs: payload.vitalSigns,
        recipients_count: recipientIds.size,
      },
    })

    revalidatePath('/caregiver')
    revalidatePath('/doctor')
    revalidatePath('/admin')
    revalidatePath('/notifications')

    return {
      success: true,
      sentAt,
      notifiedCount: recipientIds.size,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
