import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AdminSummaryMetrics {
  activePatients: number
  caregivers: number
  doctors: number
  patientAccounts: number
  familyMembers: number
  reportsSubmittedToday: number
  pendingReportsCount: number
}

export interface PendingReportItem {
  id: string
  caregiverId: string
  caregiverName: string
  caregiverEmail?: string
  patientId: string
  patientName: string
  diagnosis?: string | null
  shift: string
  shiftStartedAt: Date
  timeSinceStartFormatted: string
}

export interface AdminRecentAlert {
  id: string
  title: string
  message: string
  priority: string
  type: string
  patientId?: string | null
  patientName?: string | null
  link?: string | null
  createdAt: string
  isRead: boolean
}

export const adminDashboardService = {
  /**
   * Determine current active shift and start time in local Manila/Dumaguete timezone (UTC+8).
   */
  getCurrentShift(): { shift: string; shiftStart: Date } {
    const now = new Date()
    // Local hours in UTC+8
    const utcHours = now.getUTCHours()
    const localHour = (utcHours + 8) % 24

    const shiftStart = new Date(now)

    if (localHour >= 6 && localHour < 14) {
      shiftStart.setUTCHours(6 - 8, 0, 0, 0)
      return { shift: 'Morning Shift', shiftStart }
    } else if (localHour >= 14 && localHour < 22) {
      shiftStart.setUTCHours(14 - 8, 0, 0, 0)
      return { shift: 'Afternoon Shift', shiftStart }
    } else {
      if (localHour >= 22) {
        shiftStart.setUTCHours(22 - 8, 0, 0, 0)
      } else {
        // Between midnight and 06:00, started yesterday 22:00
        shiftStart.setUTCDate(shiftStart.getUTCDate() - 1)
        shiftStart.setUTCHours(22 - 8, 0, 0, 0)
      }
      return { shift: 'Night Shift', shiftStart }
    }
  },

  /**
   * Fetch summary counts and metrics for the admin dashboard.
   */
  async getMetrics(): Promise<AdminSummaryMetrics> {
    const admin = createAdminClient()
    const { shiftStart } = this.getCurrentShift()

    const [
      { count: activePatients },
      { count: caregivers },
      { count: doctors },
      { count: patientAccounts },
      { count: familyMembers },
      { count: reportsSubmittedToday },
      { data: activePairings },
      { data: submittedCurrentShiftReports },
    ] = await Promise.all([
      admin.from('patients').select('id', { count: 'exact', head: true }),
      admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'caregiver').eq('is_active', true),
      admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'doctor').eq('is_active', true),
      admin.from('patients').select('id', { count: 'exact', head: true }).not('user_id', 'is', null),
      admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'family_member').eq('is_active', true),
      admin.from('shift_reports').select('id', { count: 'exact', head: true }).gte('submitted_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      admin.from('care_teams').select('patient_id, member_id').eq('member_role', 'caregiver').eq('is_active', true),
      admin.from('shift_reports').select('patient_id, caregiver_id').gte('submitted_at', shiftStart.toISOString()),
    ])

    const submittedKeySet = new Set(
      (submittedCurrentShiftReports || []).map((r) => `${r.caregiver_id}:${r.patient_id}`)
    )

    const pendingCount = (activePairings || []).filter(
      (p) => !submittedKeySet.has(`${p.member_id}:${p.patient_id}`)
    ).length

    return {
      activePatients: activePatients || 0,
      caregivers: caregivers || 0,
      doctors: doctors || 0,
      patientAccounts: patientAccounts || 0,
      familyMembers: familyMembers || 0,
      reportsSubmittedToday: reportsSubmittedToday || 0,
      pendingReportsCount: pendingCount,
    }
  },

  /**
   * Fetch pending shift reports: assigned caregiver-patient pairs with no report yet for the current shift.
   */
  async getPendingReports(): Promise<PendingReportItem[]> {
    const admin = createAdminClient()
    const { shift, shiftStart } = this.getCurrentShift()

    // 1. Get all active caregiver-patient pairs
    const { data: pairings } = await admin
      .from('care_teams')
      .select(`
        id,
        patient_id,
        member_id,
        patient:patients!care_teams_patient_id_fkey(id, full_name, diagnosis),
        caregiver:users!care_teams_member_id_fkey(id, full_name, email)
      `)
      .eq('member_role', 'caregiver')
      .eq('is_active', true)

    if (!pairings || pairings.length === 0) return []

    // 2. Get reports submitted for current shift
    const { data: submitted } = await admin
      .from('shift_reports')
      .select('patient_id, caregiver_id')
      .gte('submitted_at', shiftStart.toISOString())

    const submittedSet = new Set(
      (submitted || []).map((s) => `${s.caregiver_id}:${s.patient_id}`)
    )

    const now = Date.now()

    const pendingList: PendingReportItem[] = []

    for (const p of pairings) {
      const caregiver = p.caregiver as unknown as { id: string; full_name: string; email?: string } | null
      const patient = p.patient as unknown as { id: string; full_name: string; diagnosis?: string | null } | null

      if (!caregiver || !patient) continue

      const key = `${caregiver.id}:${patient.id}`
      if (!submittedSet.has(key)) {
        const diffMs = Math.max(0, now - shiftStart.getTime())
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        pendingList.push({
          id: p.id,
          caregiverId: caregiver.id,
          caregiverName: caregiver.full_name,
          caregiverEmail: caregiver.email,
          patientId: patient.id,
          patientName: patient.full_name,
          diagnosis: patient.diagnosis,
          shift,
          shiftStartedAt: shiftStart,
          timeSinceStartFormatted: diffHours > 0 ? `${diffHours}h ${diffMins}m elapsed` : `${diffMins}m elapsed`,
        })
      }
    }

    return pendingList
  },

  /**
   * Fetch recent high-priority alerts across all patients.
   */
  async getRecentAlerts(): Promise<AdminRecentAlert[]> {
    const admin = createAdminClient()

    const { data: alerts } = await admin
      .from('notifications')
      .select(`
        id,
        title,
        message,
        priority,
        type,
        patient_id,
        link,
        created_at,
        is_read,
        patient:patients!notifications_patient_id_fkey(id, full_name)
      `)
      .eq('priority', 'high')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!alerts) return []

    return alerts.map((a) => {
      const p = a.patient as unknown as { id: string; full_name: string } | null
      return {
        id: a.id,
        title: a.title,
        message: a.message,
        priority: a.priority,
        type: a.type,
        patientId: a.patient_id,
        patientName: p?.full_name || null,
        link: a.link || (a.patient_id ? `/patients/${a.patient_id}` : '/notifications'),
        createdAt: a.created_at,
        isRead: a.is_read,
      }
    })
  },
}
