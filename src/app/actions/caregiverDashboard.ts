'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface CaregiverPatientCard {
  id: string
  full_name: string
  birth_date: string | null
  age: number | null
  diagnosis: string | null
  allergies: string | null
  latestVitals: {
    logged_at: string
    bp_systolic: number | null
    bp_diastolic: number | null
    heart_rate: number | null
    temperature_c: number | null
    spo2: number | null
    isNormal: boolean
  } | null
  todayReportSubmitted: boolean
}

export interface MedicationDueItem {
  id: string
  medication_id: string | null
  medication_name: string
  dosage: string
  route: string | null
  patient_id: string
  patient_name: string
  scheduled_time: string
  status: 'due' | 'overdue' | 'given' | 'missed' | 'refused'
}

export interface DoctorInstructionItem {
  id: string
  doctor_name: string
  patient_name: string
  note: string
  priority: string | null
  created_at: string
}

export interface CaregiverDashboardData {
  caregiverName: string
  patients: CaregiverPatientCard[]
  medicationsDue: MedicationDueItem[]
  doctorInstructions: DoctorInstructionItem[]
}

export async function getCaregiverDashboardDataAction(): Promise<{
  data: CaregiverDashboardData | null
  error: string | null
}> {
  try {
    const { user } = await requireRole(['caregiver'])
    const adminClient = createAdminClient()

    // 1. Get Caregiver's full name
    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const caregiverName = profile?.full_name || 'Caregiver'

    // 2. Fetch assigned patients
    const { data: assignments, error: aErr } = await adminClient
      .from('care_teams')
      .select(`
        patient_id,
        relationship_label,
        patient:patients!care_teams_patient_id_fkey(
          id,
          full_name,
          birth_date,
          diagnosis,
          allergies
        )
      `)
      .eq('member_id', user.id)
      .eq('is_active', true)

    if (aErr) {
      return { data: null, error: `Failed to load assigned patients: ${aErr.message}` }
    }

    const assignedPatientIds = (assignments || []).map((a) => a.patient_id)

    if (assignedPatientIds.length === 0) {
      return {
        data: {
          caregiverName,
          patients: [],
          medicationsDue: [],
          doctorInstructions: [],
        },
        error: null,
      }
    }

    // 3. For each assigned patient, fetch latest vitals and today's shift report status
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const patientCards: CaregiverPatientCard[] = []

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

      // Latest vital signs
      const { data: vitalsList } = await adminClient
        .from('vitals_logs')
        .select('logged_at, bp_systolic, bp_diastolic, heart_rate, temperature_c, spo2')
        .eq('patient_id', p.id)
        .order('logged_at', { ascending: false })
        .limit(1)

      let latestVitals = null
      if (vitalsList && vitalsList.length > 0) {
        const v = vitalsList[0]
        // Evaluate normalcy (threshold check)
        const isNormal =
          (!v.bp_systolic || (v.bp_systolic >= 90 && v.bp_systolic <= 139)) &&
          (!v.bp_diastolic || (v.bp_diastolic >= 60 && v.bp_diastolic <= 89)) &&
          (!v.heart_rate || (v.heart_rate >= 60 && v.heart_rate <= 100)) &&
          (!v.spo2 || v.spo2 >= 95) &&
          (!v.temperature_c || (v.temperature_c >= 36.1 && v.temperature_c <= 37.5))

        latestVitals = {
          logged_at: v.logged_at || new Date().toISOString(),
          bp_systolic: v.bp_systolic,
          bp_diastolic: v.bp_diastolic,
          heart_rate: v.heart_rate,
          temperature_c: v.temperature_c,
          spo2: v.spo2,
          isNormal,
        }
      }

      // Today's shift report submitted?
      const { data: todayReports } = await adminClient
        .from('shift_reports')
        .select('id')
        .eq('patient_id', p.id)
        .eq('caregiver_id', user.id)
        .gte('submitted_at', todayStart.toISOString())
        .limit(1)

      const todayReportSubmitted = Boolean(todayReports && todayReports.length > 0)

      patientCards.push({
        id: p.id,
        full_name: p.full_name,
        birth_date: p.birth_date,
        age,
        diagnosis: p.diagnosis,
        allergies: p.allergies,
        latestVitals,
        todayReportSubmitted,
      })
    }

    // 4. Medications Due This Shift for caregiver's patients
    // Check medication_logs scheduled for today or active medications
    const now = new Date()
    const shiftStart = new Date(now.getTime() - 8 * 3600000)
    const shiftEnd = new Date(now.getTime() + 12 * 3600000)

    const { data: medLogs } = await adminClient
      .from('medication_logs')
      .select(`
        id,
        medication_id,
        patient_id,
        scheduled_time,
        status,
        patient:patients!medication_logs_patient_id_fkey(full_name),
        medication:medications!medication_logs_medication_id_fkey(name, dosage, route)
      `)
      .in('patient_id', assignedPatientIds)
      .gte('scheduled_time', shiftStart.toISOString())
      .lte('scheduled_time', shiftEnd.toISOString())
      .order('scheduled_time', { ascending: true })

    const medicationsDue: MedicationDueItem[] = (medLogs || []).map((m) => {
      const scheduled = new Date(m.scheduled_time)
      const diffMinutes = (now.getTime() - scheduled.getTime()) / (1000 * 60)

      let computedStatus: MedicationDueItem['status'] = 'due'
      const rawStatus = m.status.toLowerCase()

      if (rawStatus === 'given' || rawStatus === 'missed' || rawStatus === 'refused') {
        computedStatus = rawStatus as MedicationDueItem['status']
      } else if (diffMinutes > 60) {
        computedStatus = 'overdue'
      } else {
        computedStatus = 'due'
      }

      const patientObj = m.patient as unknown as { full_name: string } | null
      const medObj = m.medication as unknown as { name: string; dosage: string; route: string | null } | null

      return {
        id: m.id,
        medication_id: m.medication_id,
        medication_name: medObj?.name || 'Scheduled Medicine',
        dosage: medObj?.dosage || 'Standard dose',
        route: medObj?.route || 'Oral',
        patient_id: m.patient_id,
        patient_name: patientObj?.full_name || 'Patient',
        scheduled_time: m.scheduled_time,
        status: computedStatus,
      }
    })

    // 5. Latest Doctor's Instructions (care_notes) for caregiver's patients
    const { data: careNotes } = await adminClient
      .from('care_notes')
      .select(`
        id,
        patient_id,
        note,
        priority,
        created_at,
        patient:patients!care_notes_patient_id_fkey(full_name),
        doctor:users!care_notes_doctor_id_fkey(full_name)
      `)
      .in('patient_id', assignedPatientIds)
      .order('created_at', { ascending: false })
      .limit(5)

    const doctorInstructions: DoctorInstructionItem[] = (careNotes || []).map((n) => {
      const patientObj = n.patient as unknown as { full_name: string } | null
      const doctorObj = n.doctor as unknown as { full_name: string } | null

      return {
        id: n.id,
        doctor_name: doctorObj?.full_name || 'Attending Physician',
        patient_name: patientObj?.full_name || 'Assigned Patient',
        note: n.note,
        priority: n.priority,
        created_at: n.created_at,
      }
    })

    return {
      data: {
        caregiverName,
        patients: patientCards,
        medicationsDue,
        doctorInstructions,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}
