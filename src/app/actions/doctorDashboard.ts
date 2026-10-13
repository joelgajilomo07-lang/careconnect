'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'

export interface DoctorPatientItem {
  id: string
  full_name: string
  age: number | null
  diagnosis: string | null
  allergies: string | null
  status: 'normal' | 'needs_attention' | 'active_alert'
  alertReason?: string | null
  latestVitals: {
    logged_at: string
    bp_systolic: number | null
    bp_diastolic: number | null
    heart_rate: number | null
    spo2: number | null
    temperature_c: number | null
  } | null
  caregivers: string[]
}

export interface DoctorAlertItem {
  id: string
  patient_id: string
  patient_name: string
  title: string
  message: string
  created_at: string
  priority: string
  is_read: boolean
}

export interface DoctorRecentReportItem {
  id: string
  patient_id: string
  patient_name: string
  caregiver_name: string
  shift: string
  submitted_at: string
  general_condition: string | null
  incidents: boolean
}

export interface DoctorDashboardData {
  doctorName: string
  patients: DoctorPatientItem[]
  unreadAlerts: DoctorAlertItem[]
  recentReports: DoctorRecentReportItem[]
}

export async function getDoctorDashboardDataAction(): Promise<{
  data: DoctorDashboardData | null
  error: string | null
}> {
  try {
    const { user } = await requireRole(['doctor'])
    const adminClient = createAdminClient()

    // 1. Get Doctor's profile
    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const doctorName = profile?.full_name || 'Dr. Attending'

    // 2. Fetch assigned patients
    const { data: assignments, error: aErr } = await adminClient
      .from('care_teams')
      .select(`
        patient_id,
        patient:patients!care_teams_patient_id_fkey(
          id,
          full_name,
          birth_date,
          diagnosis,
          allergies
        )
      `)
      .eq('member_id', user.id)
      .eq('member_role', 'doctor')
      .eq('is_active', true)

    if (aErr) return { data: null, error: aErr.message }

    const assignedPatientIds = (assignments || []).map((a) => a.patient_id)

    if (assignedPatientIds.length === 0) {
      return {
        data: {
          doctorName,
          patients: [],
          unreadAlerts: [],
          recentReports: [],
        },
        error: null,
      }
    }

    // 3. Unread high-priority notifications for doctor or doctor's patients
    const { data: rawAlerts } = await adminClient
      .from('notifications')
      .select(`
        id,
        patient_id,
        title,
        message,
        created_at,
        priority,
        is_read,
        patient:patients!notifications_patient_id_fkey(full_name)
      `)
      .in('patient_id', assignedPatientIds)
      .eq('priority', 'high')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const unreadAlerts: DoctorAlertItem[] = (rawAlerts || []).map((a) => {
      const p = a.patient as unknown as { full_name: string } | null
      return {
        id: a.id,
        patient_id: a.patient_id || '',
        patient_name: p?.full_name || 'Patient',
        title: a.title,
        message: a.message,
        created_at: a.created_at,
        priority: a.priority,
        is_read: a.is_read,
      }
    })

    const alertPatientIds = new Set(unreadAlerts.map((a) => a.patient_id))

    // 4. Check past 24h missed/refused doses for "Needs Attention"
    const past24h = new Date(Date.now() - 24 * 3600000).toISOString()
    const { data: attentionMeds } = await adminClient
      .from('medication_logs')
      .select('patient_id, status, remarks')
      .in('patient_id', assignedPatientIds)
      .in('status', ['missed', 'refused'])
      .gte('scheduled_time', past24h)

    const attentionPatientIds = new Set<string>()
    const attentionReasons = new Map<string, string>()
    ;(attentionMeds || []).forEach((m) => {
      attentionPatientIds.add(m.patient_id)
      attentionReasons.set(m.patient_id, `Missed or refused dose in last 24h (${m.remarks || m.status})`)
    })

    // 5. Build patient items
    const patientItems: DoctorPatientItem[] = []

    for (const a of assignments || []) {
      const p = a.patient as unknown as {
        id: string
        full_name: string
        birth_date: string | null
        diagnosis: string | null
        allergies: string | null
      } | null
      if (!p) continue

      // Calculate Age
      let age: number | null = null
      if (p.birth_date) {
        const birth = new Date(p.birth_date)
        const now = new Date()
        age = now.getFullYear() - birth.getFullYear()
        const m = now.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
      }

      // Latest vitals
      const { data: vitalsList } = await adminClient
        .from('vitals_logs')
        .select('logged_at, bp_systolic, bp_diastolic, heart_rate, temperature_c, spo2')
        .eq('patient_id', p.id)
        .order('logged_at', { ascending: false })
        .limit(1)

      const latestVitals = vitalsList && vitalsList.length > 0 ? {
        logged_at: vitalsList[0].logged_at || '',
        bp_systolic: vitalsList[0].bp_systolic,
        bp_diastolic: vitalsList[0].bp_diastolic,
        heart_rate: vitalsList[0].heart_rate,
        spo2: vitalsList[0].spo2,
        temperature_c: vitalsList[0].temperature_c,
      } : null

      // Caregivers
      const { data: cgList } = await adminClient
        .from('care_teams')
        .select('member:users!care_teams_member_id_fkey(full_name)')
        .eq('patient_id', p.id)
        .eq('member_role', 'caregiver')
        .eq('is_active', true)

      const caregivers = (cgList || [])
        .map((c) => (c.member as unknown as { full_name: string } | null)?.full_name)
        .filter(Boolean) as string[]

      // Determine 3-state Status Indicator:
      // Red: Active Alert (unread high-priority alert)
      // Amber: Needs Attention (missed dose or borderline vitals)
      // Green: Normal
      let status: DoctorPatientItem['status'] = 'normal'
      let alertReason: string | null = null

      if (alertPatientIds.has(p.id)) {
        status = 'active_alert'
        const matchingAlert = unreadAlerts.find((al) => al.patient_id === p.id)
        alertReason = matchingAlert?.title || 'Unread high-priority clinical alert'
      } else if (attentionPatientIds.has(p.id)) {
        status = 'needs_attention'
        alertReason = attentionReasons.get(p.id) || 'Requires clinical attention'
      } else if (latestVitals && latestVitals.spo2 && latestVitals.spo2 < 95) {
        status = 'needs_attention'
        alertReason = `Borderline SpO2 reading (${latestVitals.spo2}%)`
      }

      patientItems.push({
        id: p.id,
        full_name: p.full_name,
        age,
        diagnosis: p.diagnosis,
        allergies: p.allergies,
        status,
        alertReason,
        latestVitals,
        caregivers,
      })
    }

    // Sort patients so Active Alert comes first, then Needs Attention, then Normal
    patientItems.sort((a, b) => {
      const order = { active_alert: 0, needs_attention: 1, normal: 2 }
      return order[a.status] - order[b.status]
    })

    // 6. Recently Submitted Reports
    const { data: rawReports } = await adminClient
      .from('shift_reports')
      .select(`
        id,
        patient_id,
        shift,
        submitted_at,
        general_condition,
        incidents,
        patient:patients!shift_reports_patient_id_fkey(full_name),
        caregiver:users!shift_reports_caregiver_id_fkey(full_name)
      `)
      .in('patient_id', assignedPatientIds)
      .order('submitted_at', { ascending: false })
      .limit(6)

    const recentReports: DoctorRecentReportItem[] = (rawReports || []).map((r) => {
      const p = r.patient as unknown as { full_name: string } | null
      const cg = r.caregiver as unknown as { full_name: string } | null
      return {
        id: r.id,
        patient_id: r.patient_id,
        patient_name: p?.full_name || 'Patient',
        caregiver_name: cg?.full_name || 'Caregiver',
        shift: r.shift,
        submitted_at: r.submitted_at,
        general_condition: r.general_condition,
        incidents: r.incidents,
      }
    })

    return {
      data: {
        doctorName,
        patients: patientItems,
        unreadAlerts,
        recentReports,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}

export async function acknowledgeDoctorAlertAction(alertId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(['doctor'])
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', alertId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
