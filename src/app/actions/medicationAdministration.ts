'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationsService } from '@/services/notificationsService'
import { auditService } from '@/services/auditService'
import { revalidatePath } from 'next/cache'

export interface MedicationScheduleItem {
  id: string
  medication_id: string | null
  patient_id: string
  patient_name: string
  name: string
  dosage: string
  route: string | null
  instructions: string | null
  scheduled_time: string
  administered_at: string | null
  caregiver_name: string | null
  status: 'due' | 'overdue' | 'given' | 'missed' | 'refused'
  remarks: string | null
}

export async function getMedicationAdministrationDataAction(patientId?: string): Promise<{
  assignedPatients: Array<{ id: string; full_name: string; diagnosis: string | null }>
  selectedPatientId: string
  doses: MedicationScheduleItem[]
  error: string | null
}> {
  try {
    const { user } = await requireRole(['caregiver'])
    const adminClient = createAdminClient()

    // 1. Fetch assigned patients
    const { data: assignments } = await adminClient
      .from('care_teams')
      .select(`
        patient_id,
        patient:patients!care_teams_patient_id_fkey(id, full_name, diagnosis)
      `)
      .eq('member_id', user.id)
      .eq('is_active', true)

    const assignedPatients = (assignments || [])
      .map((a) => a.patient as unknown as { id: string; full_name: string; diagnosis: string | null } | null)
      .filter(Boolean) as Array<{ id: string; full_name: string; diagnosis: string | null }>

    if (assignedPatients.length === 0) {
      return {
        assignedPatients: [],
        selectedPatientId: '',
        doses: [],
        error: 'No patients currently assigned to your care team.',
      }
    }

    const currentPatientId = patientId || assignedPatients[0].id

    // 2. Fetch medication logs for this patient in shift window
    const now = new Date()
    const windowStart = new Date(now.getTime() - 12 * 3600000)
    const windowEnd = new Date(now.getTime() + 12 * 3600000)

    const { data: rawLogs, error: lErr } = await adminClient
      .from('medication_logs')
      .select(`
        id,
        medication_id,
        patient_id,
        scheduled_time,
        administered_at,
        status,
        remarks,
        caregiver:users!medication_logs_caregiver_id_fkey(full_name),
        patient:patients!medication_logs_patient_id_fkey(full_name),
        medication:medications!medication_logs_medication_id_fkey(name, dosage, route, instructions)
      `)
      .eq('patient_id', currentPatientId)
      .gte('scheduled_time', windowStart.toISOString())
      .lte('scheduled_time', windowEnd.toISOString())
      .order('scheduled_time', { ascending: true })

    if (lErr) {
      return { assignedPatients, selectedPatientId: currentPatientId, doses: [], error: lErr.message }
    }

    const doses: MedicationScheduleItem[] = (rawLogs || []).map((l) => {
      const scheduled = new Date(l.scheduled_time)
      const diffMinutes = (now.getTime() - scheduled.getTime()) / (1000 * 60)
      const rawStatus = (l.status || '').toLowerCase()

      let status: MedicationScheduleItem['status'] = 'due'
      if (rawStatus === 'given' || rawStatus === 'missed' || rawStatus === 'refused') {
        status = rawStatus as MedicationScheduleItem['status']
      } else if (diffMinutes > 60) {
        status = 'overdue'
      } else {
        status = 'due'
      }

      const med = l.medication as unknown as { name: string; dosage: string; route: string | null; instructions: string | null } | null
      const patient = l.patient as unknown as { full_name: string } | null
      const cg = l.caregiver as unknown as { full_name: string } | null

      return {
        id: l.id,
        medication_id: l.medication_id,
        patient_id: l.patient_id,
        patient_name: patient?.full_name || 'Patient',
        name: med?.name || 'Scheduled Medicine',
        dosage: med?.dosage || 'Standard dose',
        route: med?.route || 'Oral',
        instructions: med?.instructions || null,
        scheduled_time: l.scheduled_time,
        administered_at: l.administered_at,
        caregiver_name: cg?.full_name || null,
        status,
        remarks: l.remarks,
      }
    })

    return {
      assignedPatients,
      selectedPatientId: currentPatientId,
      doses,
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { assignedPatients: [], selectedPatientId: '', doses: [], error: message }
  }
}

export async function recordMedicationDoseAction(params: {
  logId: string
  status: 'given' | 'missed' | 'refused'
  remarks?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireRole(['caregiver'])
    const adminClient = createAdminClient()

    if (!params.logId) return { success: false, error: 'Dose ID is required.' }

    // Remarks required for Missed or Refused
    if ((params.status === 'missed' || params.status === 'refused') && !params.remarks?.trim()) {
      return { success: false, error: `A clinical remark is required when recording a dose as "${params.status}".` }
    }

    // 1. Fetch log and verify caregiver is on patient's care team
    const { data: log, error: lErr } = await adminClient
      .from('medication_logs')
      .select(`
        id,
        patient_id,
        scheduled_time,
        patient:patients!medication_logs_patient_id_fkey(full_name),
        medication:medications!medication_logs_medication_id_fkey(name, dosage)
      `)
      .eq('id', params.logId)
      .single()

    if (lErr || !log) return { success: false, error: 'Medication dose record not found.' }

    const { data: assignment } = await adminClient
      .from('care_teams')
      .select('id')
      .eq('patient_id', log.patient_id)
      .eq('member_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!assignment) {
      return { success: false, error: 'Access forbidden: You are not assigned to this patient.' }
    }

    const { data: cgUser } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const caregiverName = cgUser?.full_name || 'Caregiver'
    const nowIso = new Date().toISOString()

    // 2. Update medication log
    const { error: updateErr } = await adminClient
      .from('medication_logs')
      .update({
        status: params.status,
        administered_at: nowIso,
        caregiver_id: user.id,
        remarks: params.remarks?.trim() || null,
      })
      .eq('id', params.logId)

    if (updateErr) return { success: false, error: updateErr.message }

    const patientObj = log.patient as unknown as { full_name: string } | null
    const medObj = log.medication as unknown as { name: string; dosage: string } | null
    const medName = medObj?.name || 'Medication'
    const patientName = patientObj?.full_name || 'Patient'

    // 3. If missed or refused, dispatch HIGH priority alert to doctor
    if (params.status === 'missed' || params.status === 'refused') {
      const { data: doctorAssignments } = await adminClient
        .from('care_teams')
        .select('member_id')
        .eq('patient_id', log.patient_id)
        .eq('member_role', 'doctor')
        .eq('is_active', true)

      const title = `MEDICATION ${params.status.toUpperCase()}: ${patientName} (${medName})`
      const message = `${caregiverName} reported: Dose of ${medName} ${medObj?.dosage || ''} was ${params.status}. Reason: ${params.remarks?.trim()}`

      for (const d of doctorAssignments || []) {
        await notificationsService.createNotification({
          recipientId: d.member_id,
          patientId: log.patient_id,
          type: 'critical_alert',
          priority: 'high',
          title,
          message,
          link: `/patients/${log.patient_id}`,
        })
      }
    }

    // 4. Audit log
    await auditService.record({
      userId: user.id,
      userRole: 'caregiver',
      action: `MEDICATION_${params.status.toUpperCase()}`,
      recordType: 'medication_logs',
      recordId: params.logId,
      details: {
        patient_id: log.patient_id,
        patient_name: patientName,
        medication_name: medName,
        status: params.status,
        remarks: params.remarks,
      },
    })

    revalidatePath('/caregiver')
    revalidatePath('/caregiver/medications')
    revalidatePath('/doctor')
    revalidatePath('/admin')

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
