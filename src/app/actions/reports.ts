'use server'

import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface PatientCareSummaryReport {
  patient: {
    id: string
    full_name: string
    birth_date: string | null
    sex: string | null
    diagnosis: string | null
    allergies: string | null
    address: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
  }
  vitalSigns: Array<{
    id: string
    logged_at: string
    systolic_bp: number | null
    diastolic_bp: number | null
    heart_rate: number | null
    respiratory_rate: number | null
    temperature_c: number | null
    oxygen_saturation: number | null
    blood_glucose: number | null
    caregiver_name: string
  }>
  shiftReports: Array<{
    id: string
    submitted_at: string
    shift: string
    caregiver_name: string
    general_condition: string | null
    activities_care: string | null
    incidents: boolean
    incident_description: string | null
  }>
  careNotes: Array<{
    id: string
    created_at: string
    doctor_name: string
    note: string
    priority: string | null
  }>
}

export interface ShiftReportComplianceItem {
  caregiver_id: string
  caregiver_name: string
  caregiver_email: string
  assigned_patients_count: number
  shifts_expected: number
  reports_submitted: number
  compliance_rate: number
  recent_reports: Array<{
    id: string
    patient_name: string
    shift: string
    submitted_at: string
  }>
}

export interface MedicationAdministrationRecordReport {
  patient: {
    id: string
    full_name: string
    diagnosis: string | null
    allergies: string | null
  }
  stats: {
    total_doses: number
    given: number
    missed: number
    refused: number
    compliance_rate: number
  }
  logs: Array<{
    id: string
    medication_name: string
    dosage: string
    route: string | null
    scheduled_time: string
    administered_at: string | null
    status: string
    caregiver_name: string
    remarks: string | null
  }>
}

/**
 * Check if the user has permission to generate reports for this patient.
 * Admin can access all. Doctors must be in patient's active care team. Patients/family must be linked.
 */
async function verifyPatientReportAccess(patientId: string): Promise<{
  authorized: boolean
  user: { id: string; role: string; full_name: string } | null
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { authorized: false, user: null, error: 'Unauthorized' }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('users')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return { authorized: false, user: null, error: 'User profile not found' }

  if (profile.role === 'admin') {
    return { authorized: true, user: profile }
  }

  if (profile.role === 'doctor') {
    const { data: assignment } = await adminClient
      .from('care_teams')
      .select('id')
      .eq('patient_id', patientId)
      .eq('member_id', profile.id)
      .eq('member_role', 'doctor')
      .eq('is_active', true)
      .maybeSingle()

    if (!assignment) {
      return {
        authorized: false,
        user: profile,
        error: 'Access forbidden: You can only generate reports for patients assigned to your care team.',
      }
    }

    return { authorized: true, user: profile }
  }

  if (profile.role === 'patient') {
    const { data: patient } = await adminClient
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .eq('user_id', profile.id)
      .maybeSingle()

    if (!patient) {
      return { authorized: false, user: profile, error: 'Access forbidden: You can only view your own health reports.' }
    }

    return { authorized: true, user: profile }
  }

  if (profile.role === 'family_member') {
    const { data: assignment } = await adminClient
      .from('care_teams')
      .select('id')
      .eq('patient_id', patientId)
      .eq('member_id', profile.id)
      .eq('member_role', 'family_member')
      .eq('is_active', true)
      .maybeSingle()

    if (!assignment) {
      return { authorized: false, user: profile, error: 'Access forbidden: You are not linked to this patient.' }
    }

    return { authorized: true, user: profile }
  }

  return { authorized: false, user: profile, error: 'Access forbidden.' }
}

/**
 * 1. Generate Patient Care Summary Report
 */
export async function generatePatientCareSummaryAction(params: {
  patientId: string
  startDate?: string
  endDate?: string
}): Promise<{ data: PatientCareSummaryReport | null; error: string | null }> {
  try {
    const auth = await verifyPatientReportAccess(params.patientId)
    if (!auth.authorized) {
      return { data: null, error: auth.error || 'Access forbidden.' }
    }

    const adminClient = createAdminClient()

    // 1. Patient profile
    const { data: patient, error: pErr } = await adminClient
      .from('patients')
      .select('id, full_name, birth_date, sex, diagnosis, allergies, address, emergency_contact_name, emergency_contact_phone')
      .eq('id', params.patientId)
      .single()

    if (pErr || !patient) return { data: null, error: 'Patient not found' }

    // 2. Vital signs in range
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
        caregiver:users!vitals_logs_caregiver_id_fkey(full_name)
      `)
      .eq('patient_id', params.patientId)
      .order('logged_at', { ascending: false })

    if (params.startDate) vitalsQuery = vitalsQuery.gte('logged_at', new Date(params.startDate).toISOString())
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      vitalsQuery = vitalsQuery.lte('logged_at', end.toISOString())
    }

    const { data: rawVitals } = await vitalsQuery

    // 3. Shift reports in range
    let shiftQuery = adminClient
      .from('shift_reports')
      .select(`
        id,
        submitted_at,
        shift,
        general_condition,
        activities_care,
        incidents,
        incident_description,
        caregiver:users!shift_reports_caregiver_id_fkey(full_name)
      `)
      .eq('patient_id', params.patientId)
      .order('submitted_at', { ascending: false })

    if (params.startDate) shiftQuery = shiftQuery.gte('submitted_at', new Date(params.startDate).toISOString())
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      shiftQuery = shiftQuery.lte('submitted_at', end.toISOString())
    }

    const { data: rawShifts } = await shiftQuery

    // 4. Care notes in range
    let notesQuery = adminClient
      .from('care_notes')
      .select(`
        id,
        created_at,
        note,
        priority,
        doctor:users!care_notes_doctor_id_fkey(full_name)
      `)
      .eq('patient_id', params.patientId)
      .order('created_at', { ascending: false })

    if (params.startDate) notesQuery = notesQuery.gte('created_at', new Date(params.startDate).toISOString())
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      notesQuery = notesQuery.lte('created_at', end.toISOString())
    }

    const { data: rawNotes } = await notesQuery

    const vitalSigns = (rawVitals || []).map((v: any) => ({
      id: v.id,
      logged_at: v.logged_at,
      systolic_bp: v.bp_systolic,
      diastolic_bp: v.bp_diastolic,
      heart_rate: v.heart_rate,
      respiratory_rate: v.respiratory_rate,
      temperature_c: v.temperature_c,
      oxygen_saturation: v.spo2,
      blood_glucose: v.blood_glucose || null,
      caregiver_name: (v.caregiver as unknown as { full_name: string } | null)?.full_name || 'Caregiver',
    }))

    const shiftReports = (rawShifts || []).map((s) => ({
      id: s.id,
      submitted_at: s.submitted_at,
      shift: s.shift,
      caregiver_name: (s.caregiver as unknown as { full_name: string } | null)?.full_name || 'Caregiver',
      general_condition: s.general_condition,
      activities_care: s.activities_care,
      incidents: s.incidents,
      incident_description: s.incident_description,
    }))

    const careNotes = (rawNotes || []).map((n) => ({
      id: n.id,
      created_at: n.created_at,
      doctor_name: (n.doctor as unknown as { full_name: string } | null)?.full_name || 'Attending Physician',
      note: n.note,
      priority: n.priority,
    }))

    return {
      data: {
        patient,
        vitalSigns,
        shiftReports,
        careNotes,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}

/**
 * 2. Generate Shift Report Compliance Report (Admin only)
 */
export async function generateShiftReportComplianceAction(params: {
  caregiverId?: string
  startDate?: string
  endDate?: string
}): Promise<{ data: ShiftReportComplianceItem[] | null; error: string | null }> {
  try {
    await requireRole(['admin'])
    const adminClient = createAdminClient()

    // 1. Get all active caregivers
    let caregiversQuery = adminClient
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'caregiver')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (params.caregiverId && params.caregiverId !== 'all') {
      caregiversQuery = caregiversQuery.eq('id', params.caregiverId)
    }

    const { data: caregivers, error: cgErr } = await caregiversQuery
    if (cgErr || !caregivers) return { data: null, error: 'Failed to load caregivers' }

    // 2. Determine number of days in range for expected shifts
    const start = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 14 * 86400000)
    const end = params.endDate ? new Date(params.endDate) : new Date()
    end.setHours(23, 59, 59, 999)
    const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

    // 3. For each caregiver, query assigned patients and submitted reports
    const results: ShiftReportComplianceItem[] = []

    for (const cg of caregivers) {
      // Assigned patients
      const { data: assignments } = await adminClient
        .from('care_teams')
        .select('patient_id')
        .eq('member_id', cg.id)
        .eq('is_active', true)

      const patientCount = assignments ? assignments.length : 0
      const shiftsExpected = Math.max(1, patientCount * dayCount)

      // Submitted reports in range
      const { data: submittedReports } = await adminClient
        .from('shift_reports')
        .select(`
          id,
          shift,
          submitted_at,
          patient:patients!shift_reports_patient_id_fkey(full_name)
        `)
        .eq('caregiver_id', cg.id)
        .gte('submitted_at', start.toISOString())
        .lte('submitted_at', end.toISOString())
        .order('submitted_at', { ascending: false })

      const reportsSubmitted = submittedReports ? submittedReports.length : 0
      const complianceRate = Math.min(100, Math.round((reportsSubmitted / shiftsExpected) * 100))

      const recentReports = (submittedReports || []).map((r) => ({
        id: r.id,
        patient_name: (r.patient as unknown as { full_name: string } | null)?.full_name || 'Patient',
        shift: r.shift,
        submitted_at: r.submitted_at,
      }))

      results.push({
        caregiver_id: cg.id,
        caregiver_name: cg.full_name,
        caregiver_email: cg.email,
        assigned_patients_count: patientCount,
        shifts_expected: shiftsExpected,
        reports_submitted: reportsSubmitted,
        compliance_rate: complianceRate,
        recent_reports: recentReports,
      })
    }

    return { data: results, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}

/**
 * 3. Generate Medication Administration Record (MAR) Report
 */
export async function generateMedicationAdministrationRecordAction(params: {
  patientId: string
  startDate?: string
  endDate?: string
}): Promise<{ data: MedicationAdministrationRecordReport | null; error: string | null }> {
  try {
    const auth = await verifyPatientReportAccess(params.patientId)
    if (!auth.authorized) {
      return { data: null, error: auth.error || 'Access forbidden.' }
    }

    const adminClient = createAdminClient()

    // 1. Patient profile
    const { data: patient, error: pErr } = await adminClient
      .from('patients')
      .select('id, full_name, diagnosis, allergies')
      .eq('id', params.patientId)
      .single()

    if (pErr || !patient) return { data: null, error: 'Patient not found' }

    // 2. Query medication logs in range
    let logsQuery = adminClient
      .from('medication_logs')
      .select(`
        id,
        scheduled_time,
        administered_at,
        status,
        remarks,
        caregiver:users!medication_logs_caregiver_id_fkey(full_name),
        medication:medications!medication_logs_medication_id_fkey(name, dosage, route)
      `)
      .eq('patient_id', params.patientId)
      .order('scheduled_time', { ascending: false })

    if (params.startDate) logsQuery = logsQuery.gte('scheduled_time', new Date(params.startDate).toISOString())
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      logsQuery = logsQuery.lte('scheduled_time', end.toISOString())
    }

    const { data: rawLogs } = await logsQuery

    let given = 0
    let missed = 0
    let refused = 0

    const logs = (rawLogs || []).map((l) => {
      const med = l.medication as unknown as { name: string; dosage: string; route: string | null } | null
      const st = l.status.toLowerCase()
      if (st === 'given') given++
      else if (st === 'missed') missed++
      else if (st === 'refused') refused++

      return {
        id: l.id,
        medication_name: med?.name || 'Medication',
        dosage: med?.dosage || 'Standard dose',
        route: med?.route || 'Oral',
        scheduled_time: l.scheduled_time,
        administered_at: l.administered_at,
        status: l.status,
        caregiver_name: (l.caregiver as unknown as { full_name: string } | null)?.full_name || 'Caregiver',
        remarks: l.remarks,
      }
    })

    const totalDoses = logs.length
    const complianceRate = totalDoses > 0 ? Math.round((given / totalDoses) * 100) : 100

    return {
      data: {
        patient,
        stats: {
          total_doses: totalDoses,
          given,
          missed,
          refused,
          compliance_rate: complianceRate,
        },
        logs,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}

/**
 * Fetch patient and caregiver lists for the report configuration dropdowns.
 */
export async function getReportCandidatesAction() {
  const adminClient = createAdminClient()

  const [pRes, cgRes] = await Promise.all([
    adminClient.from('patients').select('id, full_name, diagnosis').order('full_name', { ascending: true }),
    adminClient.from('users').select('id, full_name').eq('role', 'caregiver').eq('is_active', true).order('full_name', { ascending: true }),
  ])

  return {
    patients: pRes.data || [],
    caregivers: cgRes.data || [],
  }
}
