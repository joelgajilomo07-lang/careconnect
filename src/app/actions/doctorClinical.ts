'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { auditService } from '@/services/auditService'
import { notificationsService } from '@/services/notificationsService'
import { revalidatePath } from 'next/cache'

export interface VitalSignThresholds {
  id?: string
  patient_id: string
  bp_systolic_min: number
  bp_systolic_max: number
  bp_diastolic_min: number
  bp_diastolic_max: number
  pulse_rate_min: number
  pulse_rate_max: number
  respiratory_rate_min: number
  respiratory_rate_max: number
  temperature_min: number
  temperature_max: number
  spo2_min: number
  spo2_max: number
  blood_glucose_min: number
  blood_glucose_max: number
}

export interface ClinicalVitalsLog {
  id: string
  logged_at: string
  bp_systolic: number | null
  bp_diastolic: number | null
  heart_rate: number | null
  respiratory_rate: number | null
  temperature_c: number | null
  spo2: number | null
  blood_glucose: number | null
  caregiver_name: string
  isOutOfRange: {
    bp_systolic?: boolean
    bp_diastolic?: boolean
    heart_rate?: boolean
    respiratory_rate?: boolean
    temperature_c?: boolean
    spo2?: boolean
    blood_glucose?: boolean
  }
}

export interface ShiftReportSummary {
  id: string
  shift: string
  submitted_at: string
  caregiver_name: string
  general_condition: string | null
  incidents: boolean
  incident_description: string | null
  vital_signs: Record<string, unknown> | null
  activities_care: string | null
  food_fluid_intake: string | null
  elimination: string | null
  sleep: string | null
  behavior_mood: string | null
}

export interface MedicationItem {
  id: string
  name: string
  dosage: string
  route: string | null
  frequency: string
  schedule_times: string[] | null
  start_date: string
  end_date: string | null
  instructions: string | null
  status: string
  doctor_name?: string
}

export interface MedicationComplianceData {
  complianceRate: number
  totalDoses: number
  givenCount: number
  missedCount: number
  refusedCount: number
  abnormalDoses: Array<{
    id: string
    medication_name: string
    dosage: string
    scheduled_time: string
    status: 'missed' | 'refused'
    remarks: string | null
    caregiver_name: string
  }>
}

export interface CareNoteItem {
  id: string
  note: string
  priority: 'routine' | 'important'
  created_at: string
  doctor_name: string
}

export interface AppointmentItem {
  id: string
  type: string
  appointment_date: string
  location: string | null
  notes: string | null
  status: string
  doctor_name?: string
}

export interface PatientClinicalDetails {
  patient: {
    id: string
    full_name: string
    birth_date: string | null
    age: number | null
    diagnosis: string | null
    allergies: string | null
    medical_history: string | null
    caregivers: string[]
    primaryDoctor: string | null
  }
  thresholds: VitalSignThresholds
  vitalsLogs: ClinicalVitalsLog[]
  latestVitals: ClinicalVitalsLog | null
  shiftReports: ShiftReportSummary[]
  medications: MedicationItem[]
  medicationCompliance: MedicationComplianceData
  careNotes: CareNoteItem[]
  appointments: AppointmentItem[]
}

const DEFAULT_THRESHOLDS: Omit<VitalSignThresholds, 'patient_id'> = {
  bp_systolic_min: 90,
  bp_systolic_max: 140,
  bp_diastolic_min: 60,
  bp_diastolic_max: 90,
  pulse_rate_min: 60,
  pulse_rate_max: 100,
  respiratory_rate_min: 12,
  respiratory_rate_max: 20,
  temperature_min: 36.1,
  temperature_max: 37.5,
  spo2_min: 95,
  spo2_max: 100,
  blood_glucose_min: 70,
  blood_glucose_max: 140,
}

export async function getPatientClinicalDataAction(
  patientId: string,
  days: number = 7
): Promise<{
  data: PatientClinicalDetails | null
  error: string | null
}> {
  try {
    const { user, role } = await requireRole(['doctor', 'admin', 'family_member', 'patient'])
    const adminClient = createAdminClient()

    // Authorization check
    if (role === 'doctor') {
      const { data: teamMember } = await adminClient
        .from('care_teams')
        .select('id')
        .eq('patient_id', patientId)
        .eq('member_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!teamMember) {
        return { data: null, error: 'Forbidden: You are not assigned to this patient.' }
      }
    } else if (role === 'family_member') {
      const { data: teamMember } = await adminClient
        .from('care_teams')
        .select('id')
        .eq('patient_id', patientId)
        .eq('member_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!teamMember) {
        return { data: null, error: 'Forbidden: You are not linked to this patient.' }
      }
    } else if (role === 'patient') {
      const { data: patientRecord } = await adminClient
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!patientRecord) {
        return { data: null, error: 'Forbidden: You can only view your own patient chart.' }
      }
    }

    // 1. Fetch Patient Info
    const { data: p, error: pErr } = await adminClient
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (pErr || !p) return { data: null, error: 'Patient record not found.' }

    // Calculate Age
    let age: number | null = null
    if (p.birth_date) {
      const birth = new Date(p.birth_date)
      const now = new Date()
      age = now.getFullYear() - birth.getFullYear()
      const m = now.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
    }

    // Care team members
    const { data: careTeam } = await adminClient
      .from('care_teams')
      .select('member_role, member:users!care_teams_member_id_fkey(full_name)')
      .eq('patient_id', patientId)
      .eq('is_active', true)

    const caregivers: string[] = []
    let primaryDoctor: string | null = null
    ;(careTeam || []).forEach((m) => {
      const u = m.member as unknown as { full_name: string } | null
      if (m.member_role === 'caregiver' && u?.full_name) caregivers.push(u.full_name)
      if (m.member_role === 'doctor' && u?.full_name && !primaryDoctor) primaryDoctor = u.full_name
    })

    // 2. Fetch Thresholds
    const { data: threshData } = await adminClient
      .from('vital_sign_thresholds')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle()

    const thresholds: VitalSignThresholds = threshData
      ? {
          id: threshData.id,
          patient_id: patientId,
          bp_systolic_min: threshData.bp_systolic_min,
          bp_systolic_max: threshData.bp_systolic_max,
          bp_diastolic_min: threshData.bp_diastolic_min,
          bp_diastolic_max: threshData.bp_diastolic_max,
          pulse_rate_min: threshData.pulse_rate_min,
          pulse_rate_max: threshData.pulse_rate_max,
          respiratory_rate_min: threshData.respiratory_rate_min,
          respiratory_rate_max: threshData.respiratory_rate_max,
          temperature_min: Number(threshData.temperature_min),
          temperature_max: Number(threshData.temperature_max),
          spo2_min: threshData.spo2_min,
          spo2_max: threshData.spo2_max,
          blood_glucose_min: Number(threshData.blood_glucose_min),
          blood_glucose_max: Number(threshData.blood_glucose_max),
        }
      : {
          patient_id: patientId,
          ...DEFAULT_THRESHOLDS,
        }

    // 3. Fetch Vitals Logs (within selectable days or all)
    let vitalsQuery = adminClient
      .from('vitals_logs')
      .select(`
        id,
        logged_at,
        bp_systolic,
        bp_diastolic,
        heart_rate,
        respiratory_rate,
        temperature_c,
        spo2,
        notes,
        caregiver:users!vitals_logs_caregiver_id_fkey(full_name)
      `)
      .eq('patient_id', patientId)
      .order('logged_at', { ascending: false })

    if (days > 0) {
      const sinceDate = new Date(Date.now() - days * 24 * 3600000).toISOString()
      vitalsQuery = vitalsQuery.gte('logged_at', sinceDate)
    }

    const { data: rawVitals } = await vitalsQuery

    const vitalsLogs: ClinicalVitalsLog[] = (rawVitals || []).map((v) => {
      const cg = v.caregiver as unknown as { full_name: string } | null

      // Parse blood glucose if recorded in notes
      let blood_glucose: number | null = null
      if (v.notes) {
        const bgMatch = v.notes.match(/glucose[:\s]+([0-9.]+)/i)
        if (bgMatch) blood_glucose = parseFloat(bgMatch[1])
      }

      const isOutOfRange = {
        bp_systolic:
          v.bp_systolic !== null
            ? v.bp_systolic < thresholds.bp_systolic_min || v.bp_systolic > thresholds.bp_systolic_max
            : false,
        bp_diastolic:
          v.bp_diastolic !== null
            ? v.bp_diastolic < thresholds.bp_diastolic_min || v.bp_diastolic > thresholds.bp_diastolic_max
            : false,
        heart_rate:
          v.heart_rate !== null
            ? v.heart_rate < thresholds.pulse_rate_min || v.heart_rate > thresholds.pulse_rate_max
            : false,
        respiratory_rate:
          v.respiratory_rate !== null
            ? v.respiratory_rate < thresholds.respiratory_rate_min ||
              v.respiratory_rate > thresholds.respiratory_rate_max
            : false,
        temperature_c:
          v.temperature_c !== null
            ? v.temperature_c < thresholds.temperature_min ||
              v.temperature_c > thresholds.temperature_max
            : false,
        spo2:
          v.spo2 !== null
            ? v.spo2 < thresholds.spo2_min || v.spo2 > thresholds.spo2_max
            : false,
        blood_glucose:
          blood_glucose !== null
            ? blood_glucose < thresholds.blood_glucose_min ||
              blood_glucose > thresholds.blood_glucose_max
            : false,
      }

      return {
        id: v.id,
        logged_at: v.logged_at,
        bp_systolic: v.bp_systolic,
        bp_diastolic: v.bp_diastolic,
        heart_rate: v.heart_rate,
        respiratory_rate: v.respiratory_rate,
        temperature_c: v.temperature_c,
        spo2: v.spo2,
        blood_glucose,
        caregiver_name: cg?.full_name || 'Caregiver',
        isOutOfRange,
      }
    })

    const latestVitals = vitalsLogs.length > 0 ? vitalsLogs[0] : null

    // 4. Fetch Recent Shift Reports
    const { data: rawReports } = await adminClient
      .from('shift_reports')
      .select(`
        id,
        shift,
        submitted_at,
        general_condition,
        incidents,
        incident_description,
        vital_signs,
        activities_care,
        food_fluid_intake,
        elimination,
        sleep,
        behavior_mood,
        caregiver:users!shift_reports_caregiver_id_fkey(full_name)
      `)
      .eq('patient_id', patientId)
      .order('submitted_at', { ascending: false })
      .limit(10)

    const shiftReports: ShiftReportSummary[] = (rawReports || []).map((r) => {
      const cg = r.caregiver as unknown as { full_name: string } | null
      return {
        id: r.id,
        shift: r.shift,
        submitted_at: r.submitted_at,
        caregiver_name: cg?.full_name || 'Caregiver',
        general_condition: r.general_condition,
        incidents: r.incidents,
        incident_description: r.incident_description,
        vital_signs: r.vital_signs as Record<string, unknown> | null,
        activities_care: r.activities_care,
        food_fluid_intake: r.food_fluid_intake,
        elimination: r.elimination,
        sleep: r.sleep,
        behavior_mood: r.behavior_mood,
      }
    })

    // 5. Fetch Medications & Compliance
    const { data: rawMeds } = await adminClient
      .from('medications')
      .select(`
        id,
        name,
        dosage,
        route,
        frequency,
        schedule_times,
        start_date,
        end_date,
        instructions,
        status,
        doctor:users!medications_doctor_id_fkey(full_name)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    const medications: MedicationItem[] = (rawMeds || []).map((m) => {
      const doc = m.doctor as unknown as { full_name: string } | null
      return {
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        route: m.route,
        frequency: m.frequency,
        schedule_times: m.schedule_times,
        start_date: m.start_date,
        end_date: m.end_date,
        instructions: m.instructions,
        status: m.status,
        doctor_name: doc?.full_name || undefined,
      }
    })

    // Calculate medication compliance for the selected period
    let medLogsQuery = adminClient
      .from('medication_logs')
      .select(`
        id,
        scheduled_time,
        status,
        remarks,
        medication:medications!medication_logs_medication_id_fkey(name, dosage),
        caregiver:users!medication_logs_caregiver_id_fkey(full_name)
      `)
      .eq('patient_id', patientId)
      .order('scheduled_time', { ascending: false })

    if (days > 0) {
      const sinceDate = new Date(Date.now() - days * 24 * 3600000).toISOString()
      medLogsQuery = medLogsQuery.gte('scheduled_time', sinceDate)
    }

    const { data: rawMedLogs } = await medLogsQuery

    let givenCount = 0
    let missedCount = 0
    let refusedCount = 0
    const abnormalDoses: MedicationComplianceData['abnormalDoses'] = []

    ;(rawMedLogs || []).forEach((ml) => {
      const med = ml.medication as unknown as { name: string; dosage: string } | null
      const cg = ml.caregiver as unknown as { full_name: string } | null

      if (ml.status === 'given') givenCount++
      if (ml.status === 'missed') {
        missedCount++
        abnormalDoses.push({
          id: ml.id,
          medication_name: med?.name || 'Medication',
          dosage: med?.dosage || '',
          scheduled_time: ml.scheduled_time,
          status: 'missed',
          remarks: ml.remarks,
          caregiver_name: cg?.full_name || 'Caregiver',
        })
      }
      if (ml.status === 'refused') {
        refusedCount++
        abnormalDoses.push({
          id: ml.id,
          medication_name: med?.name || 'Medication',
          dosage: med?.dosage || '',
          scheduled_time: ml.scheduled_time,
          status: 'refused',
          remarks: ml.remarks,
          caregiver_name: cg?.full_name || 'Caregiver',
        })
      }
    })

    const totalLogged = givenCount + missedCount + refusedCount
    const complianceRate = totalLogged > 0 ? Math.round((givenCount / totalLogged) * 100) : 100

    const medicationCompliance: MedicationComplianceData = {
      complianceRate,
      totalDoses: totalLogged,
      givenCount,
      missedCount,
      refusedCount,
      abnormalDoses,
    }

    // 6. Care Notes
    const { data: rawNotes } = await adminClient
      .from('care_notes')
      .select(`
        id,
        note,
        priority,
        created_at,
        doctor:users!care_notes_doctor_id_fkey(full_name)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    const careNotes: CareNoteItem[] = (rawNotes || []).map((cn) => {
      const d = cn.doctor as unknown as { full_name: string } | null
      return {
        id: cn.id,
        note: cn.note,
        priority: cn.priority as 'routine' | 'important',
        created_at: cn.created_at,
        doctor_name: d?.full_name || 'Dr. Attending',
      }
    })

    // 7. Appointments
    const { data: rawAppts } = await adminClient
      .from('appointments')
      .select(`
        id,
        type,
        appointment_date,
        location,
        notes,
        status,
        doctor:users!appointments_doctor_id_fkey(full_name)
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: true })

    const appointments: AppointmentItem[] = (rawAppts || []).map((ap) => {
      const d = ap.doctor as unknown as { full_name: string } | null
      return {
        id: ap.id,
        type: ap.type,
        appointment_date: ap.appointment_date,
        location: ap.location,
        notes: ap.notes,
        status: ap.status,
        doctor_name: d?.full_name || undefined,
      }
    })

    return {
      data: {
        patient: {
          id: p.id,
          full_name: p.full_name,
          birth_date: p.birth_date,
          age,
          diagnosis: p.diagnosis,
          allergies: p.allergies,
          medical_history: p.medical_history,
          caregivers,
          primaryDoctor,
        },
        thresholds,
        vitalsLogs,
        latestVitals,
        shiftReports,
        medications,
        medicationCompliance,
        careNotes,
        appointments,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}

// -------------------------------------------------------------
// FIGURE 20: CARE NOTES & VITAL-SIGN THRESHOLDS ACTIONS
// -------------------------------------------------------------

export async function saveCareNoteAction(
  patientId: string,
  noteText: string,
  priority: 'routine' | 'important' = 'routine'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireRole(['doctor'])
    const adminClient = createAdminClient()

    if (!patientId || !noteText.trim()) {
      return { success: false, error: 'Note text cannot be empty.' }
    }

    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const doctorName = profile?.full_name || 'Dr. Attending'

    // 1. Insert note
    const { error: insErr } = await adminClient.from('care_notes').insert({
      patient_id: patientId,
      doctor_id: user.id,
      note: noteText.trim(),
      priority,
    })

    if (insErr) return { success: false, error: insErr.message }

    // 2. Fetch assigned caregivers
    const { data: cgList } = await adminClient
      .from('care_teams')
      .select('member_id')
      .eq('patient_id', patientId)
      .eq('member_role', 'caregiver')
      .eq('is_active', true)

    // 3. Notify assigned caregivers
    for (const cg of cgList || []) {
      await notificationsService.createNotification({
        recipientId: cg.member_id,
        patientId,
        type: 'status_update',
        priority: priority === 'important' ? 'high' : 'normal',
        title: `Doctor Instruction (${priority.toUpperCase()}): ${doctorName}`,
        message: noteText.trim().slice(0, 150),
        link: '/caregiver',
      })
    }

    // 4. Audit log
    await auditService.record({
      userId: user.id,
      userName: doctorName,
      userRole: 'doctor',
      action: 'CARE_NOTE_CREATED',
      recordType: 'care_notes',
      recordId: patientId,
      details: { priority, note: noteText.trim() },
    })

    revalidatePath(`/doctor/patients/${patientId}`)
    revalidatePath('/caregiver')
    revalidatePath('/family')
    revalidatePath('/patient')

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateVitalSignThresholdsAction(
  patientId: string,
  thresholds: Omit<VitalSignThresholds, 'patient_id' | 'id'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireRole(['doctor'])
    const adminClient = createAdminClient()

    // Validate Min < Max
    if (thresholds.bp_systolic_min >= thresholds.bp_systolic_max) {
      return { success: false, error: 'BP Systolic Min must be strictly less than Max.' }
    }
    if (thresholds.bp_diastolic_min >= thresholds.bp_diastolic_max) {
      return { success: false, error: 'BP Diastolic Min must be strictly less than Max.' }
    }
    if (thresholds.pulse_rate_min >= thresholds.pulse_rate_max) {
      return { success: false, error: 'Pulse Rate Min must be strictly less than Max.' }
    }
    if (thresholds.respiratory_rate_min >= thresholds.respiratory_rate_max) {
      return { success: false, error: 'Respiratory Rate Min must be strictly less than Max.' }
    }
    if (thresholds.temperature_min >= thresholds.temperature_max) {
      return { success: false, error: 'Temperature Min must be strictly less than Max.' }
    }
    if (thresholds.spo2_min >= thresholds.spo2_max) {
      return { success: false, error: 'SpO2 Min must be strictly less than Max.' }
    }
    if (thresholds.blood_glucose_min >= thresholds.blood_glucose_max) {
      return { success: false, error: 'Blood Glucose Min must be strictly less than Max.' }
    }

    // Get previous thresholds for audit
    const { data: prev } = await adminClient
      .from('vital_sign_thresholds')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle()

    const { error: upsertErr } = await adminClient
      .from('vital_sign_thresholds')
      .upsert(
        {
          patient_id: patientId,
          bp_systolic_min: thresholds.bp_systolic_min,
          bp_systolic_max: thresholds.bp_systolic_max,
          bp_diastolic_min: thresholds.bp_diastolic_min,
          bp_diastolic_max: thresholds.bp_diastolic_max,
          pulse_rate_min: thresholds.pulse_rate_min,
          pulse_rate_max: thresholds.pulse_rate_max,
          respiratory_rate_min: thresholds.respiratory_rate_min,
          respiratory_rate_max: thresholds.respiratory_rate_max,
          temperature_min: thresholds.temperature_min,
          temperature_max: thresholds.temperature_max,
          spo2_min: thresholds.spo2_min,
          spo2_max: thresholds.spo2_max,
          blood_glucose_min: thresholds.blood_glucose_min,
          blood_glucose_max: thresholds.blood_glucose_max,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'patient_id' }
      )

    if (upsertErr) return { success: false, error: upsertErr.message }

    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Log to public.audit_logs
    await auditService.record({
      userId: user.id,
      userName: profile?.full_name || 'Dr. Attending',
      userRole: 'doctor',
      action: 'THRESHOLDS_UPDATED',
      recordType: 'vital_sign_thresholds',
      recordId: patientId,
      details: {
        previous: prev,
        updated: thresholds,
      },
    })

    revalidatePath(`/doctor/patients/${patientId}`)
    revalidatePath('/caregiver/shift-report')
    revalidatePath('/doctor')

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// -------------------------------------------------------------
// FIGURE 21: MEDICATION SCHEDULE & FOLLOW-UP APPOINTMENTS ACTIONS
// -------------------------------------------------------------

export interface MedicationScheduleInput {
  patientId: string
  name: string
  dosage: string
  route?: string
  frequency: string
  scheduleTimes: string[]
  startDate: string
  endDate?: string
  instructions?: string
}

export async function saveMedicationScheduleAction(
  payload: MedicationScheduleInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireRole(['doctor'])
    const adminClient = createAdminClient()

    if (!payload.patientId || !payload.name || !payload.dosage || !payload.frequency) {
      return { success: false, error: 'Drug name, dosage, and frequency are required.' }
    }

    // Insert medication
    const { data: med, error: mErr } = await adminClient
      .from('medications')
      .insert({
        patient_id: payload.patientId,
        doctor_id: user.id,
        name: payload.name.trim(),
        dosage: payload.dosage.trim(),
        route: payload.route || 'Oral',
        frequency: payload.frequency,
        schedule_times: payload.scheduleTimes || ['08:00'],
        start_date: payload.startDate || new Date().toISOString().slice(0, 10),
        end_date: payload.endDate || null,
        instructions: payload.instructions?.trim() || null,
        status: 'active',
      })
      .select('id')
      .single()

    if (mErr) return { success: false, error: mErr.message }

    // Seed initial scheduled doses for today so caregiver immediately sees them
    const today = new Date().toISOString().slice(0, 10)
    const initialDoses = (payload.scheduleTimes || ['08:00']).map((time) => ({
      medication_id: med.id,
      patient_id: payload.patientId,
      scheduled_time: `${today}T${time}:00.000Z`,
      status: 'scheduled',
    }))

    if (initialDoses.length > 0) {
      await adminClient.from('medication_logs').insert(initialDoses)
    }

    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Audit log
    await auditService.record({
      userId: user.id,
      userName: profile?.full_name || 'Dr. Attending',
      userRole: 'doctor',
      action: 'MEDICATION_PRESCRIBED',
      recordType: 'medications',
      recordId: med.id,
      details: {
        patient_id: payload.patientId,
        name: payload.name,
        dosage: payload.dosage,
        frequency: payload.frequency,
      },
    })

    revalidatePath(`/doctor/patients/${payload.patientId}`)
    revalidatePath('/caregiver/medications')
    revalidatePath('/caregiver')
    revalidatePath('/family')
    revalidatePath('/patient')

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function discontinueMedicationAction(
  medicationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireRole(['doctor'])
    const adminClient = createAdminClient()

    const { data: med } = await adminClient
      .from('medications')
      .select('*')
      .eq('id', medicationId)
      .single()

    if (!med) return { success: false, error: 'Medication not found.' }

    const updatedInstructions = med.instructions
      ? `${med.instructions} [Discontinued: ${reason}]`
      : `[Discontinued: ${reason}]`

    const { error: updErr } = await adminClient
      .from('medications')
      .update({
        status: 'discontinued',
        instructions: updatedInstructions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicationId)

    if (updErr) return { success: false, error: updErr.message }

    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await auditService.record({
      userId: user.id,
      userName: profile?.full_name || 'Dr. Attending',
      userRole: 'doctor',
      action: 'MEDICATION_DISCONTINUED',
      recordType: 'medications',
      recordId: medicationId,
      details: { patient_id: med.patient_id, name: med.name, reason },
    })

    revalidatePath(`/doctor/patients/${med.patient_id}`)
    revalidatePath('/caregiver/medications')
    revalidatePath('/caregiver')

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export interface AppointmentInput {
  patientId: string
  type: 'check-up' | 'laboratory' | 'therapy' | 'other'
  appointmentDate: string
  location?: string
  notes?: string
}

export async function saveAppointmentAction(
  payload: AppointmentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireRole(['doctor'])
    const adminClient = createAdminClient()

    if (!payload.patientId || !payload.type || !payload.appointmentDate) {
      return { success: false, error: 'Appointment type and date/time are required.' }
    }

    const { data: appt, error: insErr } = await adminClient
      .from('appointments')
      .insert({
        patient_id: payload.patientId,
        doctor_id: user.id,
        type: payload.type,
        appointment_date: payload.appointmentDate,
        location: payload.location || 'Tender Touch Dumaguete Clinic',
        notes: payload.notes?.trim() || null,
        status: 'scheduled',
      })
      .select('id')
      .single()

    if (insErr) return { success: false, error: insErr.message }

    // Fetch patient name
    const { data: patient } = await adminClient
      .from('patients')
      .select('full_name, user_id')
      .eq('id', payload.patientId)
      .single()

    // Fetch team members to notify
    const { data: teamMembers } = await adminClient
      .from('care_teams')
      .select('member_id, member_role')
      .eq('patient_id', payload.patientId)
      .eq('is_active', true)

    const recipientIds = new Set<string>()
    ;(teamMembers || []).forEach((tm) => recipientIds.add(tm.member_id))
    if (patient?.user_id) recipientIds.add(patient.user_id)

    const dateFormatted = new Date(payload.appointmentDate).toLocaleString()
    for (const rId of recipientIds) {
      await notificationsService.createNotification({
        recipientId: rId,
        patientId: payload.patientId,
        type: 'appointment_reminder',
        priority: 'normal',
        title: `Upcoming Follow-up: ${payload.type.toUpperCase()}`,
        message: `Scheduled on ${dateFormatted} for ${patient?.full_name || 'Patient'}. Location: ${payload.location || 'Clinic'}.`,
        link: `/doctor/patients/${payload.patientId}`,
      })
    }

    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await auditService.record({
      userId: user.id,
      userName: profile?.full_name || 'Dr. Attending',
      userRole: 'doctor',
      action: 'APPOINTMENT_SCHEDULED',
      recordType: 'appointments',
      recordId: appt.id,
      details: {
        patient_id: payload.patientId,
        type: payload.type,
        date: payload.appointmentDate,
        location: payload.location,
      },
    })

    revalidatePath(`/doctor/patients/${payload.patientId}`)
    revalidatePath('/family')
    revalidatePath('/patient')

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
