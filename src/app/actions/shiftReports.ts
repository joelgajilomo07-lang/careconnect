'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationsService } from '@/services/notificationsService'
import { auditService } from '@/services/auditService'
import { revalidatePath } from 'next/cache'

export interface VitalSignThresholds {
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

const DEFAULT_THRESHOLDS: VitalSignThresholds = {
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

export async function getShiftReportFormDataAction(patientId?: string): Promise<{
  assignedPatients: Array<{ id: string; full_name: string; diagnosis: string | null }>
  thresholds: VitalSignThresholds
  error: string | null
}> {
  try {
    const { user } = await requireRole(['caregiver'])
    const adminClient = createAdminClient()

    // 1. Get assigned patients
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

    const targetPatientId = patientId || (assignedPatients[0]?.id ?? '')

    // 2. Get thresholds
    let thresholds = { ...DEFAULT_THRESHOLDS }
    if (targetPatientId) {
      const { data: customThresholds } = await adminClient
        .from('vital_sign_thresholds')
        .select('*')
        .eq('patient_id', targetPatientId)
        .maybeSingle()

      if (customThresholds) {
        thresholds = {
          bp_systolic_min: customThresholds.bp_systolic_min ?? DEFAULT_THRESHOLDS.bp_systolic_min,
          bp_systolic_max: customThresholds.bp_systolic_max ?? DEFAULT_THRESHOLDS.bp_systolic_max,
          bp_diastolic_min: customThresholds.bp_diastolic_min ?? DEFAULT_THRESHOLDS.bp_diastolic_min,
          bp_diastolic_max: customThresholds.bp_diastolic_max ?? DEFAULT_THRESHOLDS.bp_diastolic_max,
          pulse_rate_min: customThresholds.pulse_rate_min ?? DEFAULT_THRESHOLDS.pulse_rate_min,
          pulse_rate_max: customThresholds.pulse_rate_max ?? DEFAULT_THRESHOLDS.pulse_rate_max,
          respiratory_rate_min: customThresholds.respiratory_rate_min ?? DEFAULT_THRESHOLDS.respiratory_rate_min,
          respiratory_rate_max: customThresholds.respiratory_rate_max ?? DEFAULT_THRESHOLDS.respiratory_rate_max,
          temperature_min: customThresholds.temperature_min ? Number(customThresholds.temperature_min) : DEFAULT_THRESHOLDS.temperature_min,
          temperature_max: customThresholds.temperature_max ? Number(customThresholds.temperature_max) : DEFAULT_THRESHOLDS.temperature_max,
          spo2_min: customThresholds.spo2_min ?? DEFAULT_THRESHOLDS.spo2_min,
          spo2_max: customThresholds.spo2_max ?? DEFAULT_THRESHOLDS.spo2_max,
          blood_glucose_min: customThresholds.blood_glucose_min ? Number(customThresholds.blood_glucose_min) : DEFAULT_THRESHOLDS.blood_glucose_min,
          blood_glucose_max: customThresholds.blood_glucose_max ? Number(customThresholds.blood_glucose_max) : DEFAULT_THRESHOLDS.blood_glucose_max,
        }
      }
    }

    return { assignedPatients, thresholds, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { assignedPatients: [], thresholds: DEFAULT_THRESHOLDS, error: message }
  }
}

export interface SubmitShiftReportPayload {
  patientId: string
  shift: 'Morning' | 'Afternoon' | 'Night' | 'Day'
  vitals: {
    bp_systolic: number
    bp_diastolic: number
    pulse_rate: number
    respiratory_rate: number
    temperature_c: number
    spo2: number
    blood_glucose?: number | null
  }
  generalCondition: string
  activitiesCare: string
  foodFluidIntake: string
  elimination: string
  sleep: string
  behaviorMood: string
  incidents: boolean
  incidentDescription?: string
}

export async function submitShiftReportAction(payload: SubmitShiftReportPayload): Promise<{
  success: boolean
  error?: string
  reportId?: string
  abnormalAlertSent?: boolean
}> {
  try {
    const { user } = await requireRole(['caregiver'])
    const adminClient = createAdminClient()

    // 1. Validate assigned caregiver
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

    // 2. Validate required fields
    if (!payload.shift) return { success: false, error: 'Shift is required.' }
    if (!payload.generalCondition?.trim()) return { success: false, error: 'General Condition & Observations is required.' }
    if (!payload.activitiesCare?.trim()) return { success: false, error: 'Activities & Care Provided is required.' }
    if (!payload.foodFluidIntake?.trim()) return { success: false, error: 'Food and Fluid Intake is required.' }
    if (!payload.elimination?.trim()) return { success: false, error: 'Elimination notes are required.' }
    if (!payload.sleep?.trim()) return { success: false, error: 'Sleep patterns are required.' }
    if (!payload.behaviorMood?.trim()) return { success: false, error: 'Behavior / Mood is required.' }
    if (payload.incidents && !payload.incidentDescription?.trim()) {
      return { success: false, error: 'Incident description is required when incidents is Yes.' }
    }

    // Validate realistic ranges
    const v = payload.vitals
    if (v.spo2 < 50 || v.spo2 > 100) return { success: false, error: 'SpO2 must be between 50% and 100%.' }
    if (v.temperature_c < 30 || v.temperature_c > 45) return { success: false, error: 'Temperature must be between 30°C and 45°C.' }
    if (v.bp_systolic < 50 || v.bp_systolic > 260) return { success: false, error: 'Systolic BP must be between 50 and 260 mmHg.' }
    if (v.bp_diastolic < 30 || v.bp_diastolic > 180) return { success: false, error: 'Diastolic BP must be between 30 and 180 mmHg.' }
    if (v.pulse_rate < 30 || v.pulse_rate > 220) return { success: false, error: 'Pulse rate must be between 30 and 220 bpm.' }
    if (v.respiratory_rate < 6 || v.respiratory_rate > 60) return { success: false, error: 'Respiratory rate must be between 6 and 60 /min.' }

    // 3. Compare with thresholds
    const { thresholds } = await getShiftReportFormDataAction(payload.patientId)
    const abnormalReasons: string[] = []

    if (v.bp_systolic < thresholds.bp_systolic_min || v.bp_systolic > thresholds.bp_systolic_max) {
      abnormalReasons.push(`Systolic BP ${v.bp_systolic} mmHg (normal: ${thresholds.bp_systolic_min}-${thresholds.bp_systolic_max})`)
    }
    if (v.bp_diastolic < thresholds.bp_diastolic_min || v.bp_diastolic > thresholds.bp_diastolic_max) {
      abnormalReasons.push(`Diastolic BP ${v.bp_diastolic} mmHg (normal: ${thresholds.bp_diastolic_min}-${thresholds.bp_diastolic_max})`)
    }
    if (v.pulse_rate < thresholds.pulse_rate_min || v.pulse_rate > thresholds.pulse_rate_max) {
      abnormalReasons.push(`Heart Rate ${v.pulse_rate} bpm (normal: ${thresholds.pulse_rate_min}-${thresholds.pulse_rate_max})`)
    }
    if (v.respiratory_rate < thresholds.respiratory_rate_min || v.respiratory_rate > thresholds.respiratory_rate_max) {
      abnormalReasons.push(`Resp Rate ${v.respiratory_rate}/min (normal: ${thresholds.respiratory_rate_min}-${thresholds.respiratory_rate_max})`)
    }
    if (v.temperature_c < thresholds.temperature_min || v.temperature_c > thresholds.temperature_max) {
      abnormalReasons.push(`Temp ${v.temperature_c}°C (normal: ${thresholds.temperature_min}-${thresholds.temperature_max})`)
    }
    if (v.spo2 < thresholds.spo2_min) {
      abnormalReasons.push(`SpO2 ${v.spo2}% (threshold: ≥${thresholds.spo2_min}%)`)
    }

    const isAbnormal = abnormalReasons.length > 0

    // 4. Save shift report
    const { data: report, error: repErr } = await adminClient
      .from('shift_reports')
      .insert({
        patient_id: payload.patientId,
        caregiver_id: user.id,
        shift: payload.shift,
        vital_signs: payload.vitals as any,
        general_condition: payload.generalCondition.trim(),
        activities_care: payload.activitiesCare.trim(),
        food_fluid_intake: payload.foodFluidIntake.trim(),
        elimination: payload.elimination.trim(),
        sleep: payload.sleep.trim(),
        behavior_mood: payload.behaviorMood.trim(),
        incidents: payload.incidents,
        incident_description: payload.incidentDescription?.trim() || null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (repErr) {
      return { success: false, error: `Failed to save shift report: ${repErr.message}` }
    }

    // 5. Also record into vitals_logs
    await adminClient.from('vitals_logs').insert({
      patient_id: payload.patientId,
      caregiver_id: user.id,
      bp_systolic: v.bp_systolic,
      bp_diastolic: v.bp_diastolic,
      heart_rate: v.pulse_rate,
      respiratory_rate: v.respiratory_rate,
      temperature_c: v.temperature_c,
      spo2: v.spo2,
      notes: v.blood_glucose ? `Blood glucose: ${v.blood_glucose} mg/dL` : null,
      logged_at: new Date().toISOString(),
    })

    // 6. If abnormal, trigger HIGH priority alert for assigned doctor and admin
    if (isAbnormal) {
      const { data: patient } = await adminClient
        .from('patients')
        .select('full_name')
        .eq('id', payload.patientId)
        .single()

      const patientName = patient?.full_name || 'Patient'

      // Assigned doctor
      const { data: docAssign } = await adminClient
        .from('care_teams')
        .select('member_id')
        .eq('patient_id', payload.patientId)
        .eq('member_role', 'doctor')
        .eq('is_active', true)
        .maybeSingle()

      // Admins
      const { data: admins } = await adminClient
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)

      const recipients = new Set<string>()
      if (docAssign) recipients.add(docAssign.member_id)
      ;(admins || []).forEach((a) => recipients.add(a.id))

      const alertTitle = `ABNORMAL VITALS: ${patientName} (${payload.shift} Shift)`
      const alertMsg = `Out-of-range vitals reported: ${abnormalReasons.join('; ')}`

      for (const recipientId of recipients) {
        await notificationsService.createNotification({
          recipientId,
          patientId: payload.patientId,
          type: 'critical_alert',
          priority: 'high',
          title: alertTitle,
          message: alertMsg,
          link: `/patients/${payload.patientId}`,
        })
      }
    }

    // 7. Audit log
    await auditService.record({
      userId: user.id,
      userRole: 'caregiver',
      action: 'SHIFT_REPORT_SUBMIT',
      recordType: 'shift_reports',
      recordId: report.id,
      details: {
        patient_id: payload.patientId,
        shift: payload.shift,
        is_abnormal: isAbnormal,
        abnormal_reasons: abnormalReasons,
      },
    })

    revalidatePath('/caregiver')
    revalidatePath('/doctor')
    revalidatePath('/admin')

    return {
      success: true,
      reportId: report.id,
      abnormalAlertSent: isAbnormal,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
