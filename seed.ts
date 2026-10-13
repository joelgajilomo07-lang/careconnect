import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Fictitious seed data compliant with RA 10173 (Philippine Data Privacy Act)
const SEED_USERS = [
  // 1 Administrator
  {
    email: 'admin@test.com',
    fullName: 'Elena Rostova',
    role: 'admin' as const,
    phone: '0917-555-0100',
  },
  // 3 Caregivers
  {
    email: 'caregiver1@test.com',
    fullName: 'Maria Santos',
    role: 'caregiver' as const,
    phone: '0917-555-0201',
  },
  {
    email: 'caregiver2@test.com',
    fullName: 'Juan Dela Cruz',
    role: 'caregiver' as const,
    phone: '0917-555-0202',
  },
  {
    email: 'caregiver3@test.com',
    fullName: 'Grace Alcantara',
    role: 'caregiver' as const,
    phone: '0917-555-0203',
  },
  // 2 Doctors
  {
    email: 'doctor1@test.com',
    fullName: 'Dr. Roberto Mendoza',
    role: 'doctor' as const,
    phone: '0918-555-0301',
  },
  {
    email: 'doctor2@test.com',
    fullName: 'Dr. Patricia Lim',
    role: 'doctor' as const,
    phone: '0918-555-0302',
  },
  // 3 Family Members
  {
    email: 'family1@test.com',
    fullName: 'Corazon Dumlao',
    role: 'family_member' as const,
    phone: '0919-555-0401',
  },
  {
    email: 'family2@test.com',
    fullName: 'Antonio Ramos',
    role: 'family_member' as const,
    phone: '0919-555-0402',
  },
  {
    email: 'family3@test.com',
    fullName: 'Teresa Valenzuela',
    role: 'family_member' as const,
    phone: '0919-555-0403',
  },
  // 3 Patients who have accounts
  {
    email: 'patient1@test.com',
    fullName: 'Manuel Dumlao',
    role: 'patient' as const,
    phone: '0920-555-0501',
    dob: '1948-03-15',
    sex: 'M',
    address: '123 Hibbard Ave, Dumaguete City',
    diagnosis: 'Type 2 Diabetes Mellitus, Stage 2 Hypertension',
    medicalHistory: 'History of TIA in 2021, Cholecystectomy 2018',
    allergies: 'Penicillin, NSAIDs',
    emergencyContact: 'Corazon Dumlao (Daughter) - 0917-555-0192',
  },
  {
    email: 'patient2@test.com',
    fullName: 'Rosa Ramos',
    role: 'patient' as const,
    phone: '0920-555-0502',
    dob: '1952-08-22',
    sex: 'F',
    address: '45 Flores Ave, Piapi, Dumaguete City',
    diagnosis: 'Chronic Obstructive Pulmonary Disease (COPD), Mild Heart Failure',
    medicalHistory: 'Chronic Bronchitis since 2019',
    allergies: 'Sulfa drugs',
    emergencyContact: 'Antonio Ramos (Son) - 0918-555-0341',
  },
  {
    email: 'patient3@test.com',
    fullName: 'Felipe Valenzuela',
    role: 'patient' as const,
    phone: '0920-555-0503',
    dob: '1944-11-05',
    sex: 'M',
    address: '78 Rizal Blvd, Dumaguete City',
    diagnosis: 'Post-Stroke Recovery (Left Hemiparesis), Atrial Fibrillation',
    medicalHistory: 'Ischemic Stroke (Nov 2024), Pacemaker insertion (2022)',
    allergies: 'Aspirin',
    emergencyContact: 'Teresa Valenzuela (Sister) - 0920-555-0823',
  },
]

// 2 Patients WITHOUT login accounts (user_id = null)
const UNACCOUNTED_PATIENTS = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    fullName: 'Lourdes Santos',
    dob: '1939-05-12',
    sex: 'F',
    address: '12 Silliman Ave, Dumaguete City',
    diagnosis: "Moderate Alzheimer's Dementia, Osteoarthritis",
    medicalHistory: 'Bilateral Knee Arthroplasty (2016)',
    allergies: 'None known',
    emergencyContact: 'Corazon Dumlao (Niece) - 0917-555-0192',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    fullName: 'Eduardo Gomez',
    dob: '1956-01-30',
    sex: 'M',
    address: '89 Colon St, Dumaguete City',
    diagnosis: 'Chronic Kidney Disease Stage 3b, Hypertension',
    medicalHistory: 'Gouty Arthritis, Hyperlipidemia',
    allergies: 'Contrast Dye, Ciprofloxacin',
    emergencyContact: 'Antonio Ramos (Nephew) - 0918-555-0341',
  },
]

async function seed() {
  console.log('=====================================================================')
  console.log('🌱 CARECONNECT SEEDER — Five Roles, Access Rules & Demo Data')
  console.log('   Location: Tender Touch Home Care Services, Dumaguete City')
  console.log('   Data Privacy: All data is completely fictitious (RA 10173)')
  console.log('=====================================================================\n')

  // 1. Fetch existing auth users to avoid duplicates
  const { data: authList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 100 })
  if (listErr) {
    console.error('❌ Failed to list auth users:', listErr.message)
    process.exit(1)
  }

  const existingAuthUsers = new Map<string, string>() // email -> id
  for (const u of authList.users) {
    if (u.email) existingAuthUsers.set(u.email.toLowerCase(), u.id)
  }

  const userIds = new Map<string, string>() // role/email key -> id

  // 2. Provision Auth & Public Users
  console.log('👤 Provisioning Auth accounts and user profiles...')
  for (const userConfig of SEED_USERS) {
    const email = userConfig.email.toLowerCase()
    let userId = existingAuthUsers.get(email)

    if (userId) {
      // Update password to ensure it is 'password123'
      await supabase.auth.admin.updateUserById(userId, {
        password: 'password123',
        email_confirm: true,
      })
    } else {
      const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
      })
      if (createErr || !newAuth.user) {
        console.error(`❌ Failed to create auth user ${email}:`, createErr?.message)
        continue
      }
      userId = newAuth.user.id
      existingAuthUsers.set(email, userId)
    }

    userIds.set(userConfig.email, userId)

    // Upsert public.users
    const { error: userUpsertErr } = await supabase.from('users').upsert({
      id: userId,
      email,
      full_name: userConfig.fullName,
      role: userConfig.role,
      phone: userConfig.phone,
      is_active: true,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })

    if (userUpsertErr) {
      console.error(`❌ Error upserting public.users for ${email}:`, userUpsertErr.message)
    }

    // Upsert patient_profiles for patient role accounts
    if (userConfig.role === 'patient') {
      await supabase.from('patient_profiles').upsert({
        user_id: userId,
        date_of_birth: userConfig.dob,
        sex: userConfig.sex,
        primary_condition: userConfig.diagnosis,
        current_status: 'stable',
        updated_at: new Date().toISOString(),
      })
    }
  }

  console.log(`✅ Provisioned ${SEED_USERS.length} authenticated users across all 5 roles.`)

  // 3. Upsert Patients in public.patients (3 with accounts, 2 without accounts)
  console.log('\n🏥 Provisioning 5 Patient records (3 with 1:1 linked accounts, 2 without)...')
  const patientRecords: Array<{
    id: string
    full_name: string
    birth_date: string
    sex: string
    address: string
    diagnosis: string
    medical_history: string
    allergies: string
    emergency_contact_name: string
    emergency_contact_phone: string
    user_id: string | null
  }> = []

  // 3 Patients with accounts
  for (let i = 1; i <= 3; i++) {
    const config = SEED_USERS.find(u => u.email === `patient${i}@test.com`)!
    const uId = userIds.get(config.email)!
    patientRecords.push({
      id: uId, // align patient id with user id for easy lookup
      full_name: config.fullName,
      birth_date: config.dob!,
      sex: config.sex!,
      address: config.address!,
      diagnosis: config.diagnosis!,
      medical_history: config.medicalHistory!,
      allergies: config.allergies!,
      emergency_contact_name: config.emergencyContact!.split(' - ')[0],
      emergency_contact_phone: config.emergencyContact!.split(' - ')[1] || '0917-555-0000',
      user_id: uId,
    })
  }

  // 2 Patients without accounts
  for (const unacc of UNACCOUNTED_PATIENTS) {
    patientRecords.push({
      id: unacc.id,
      full_name: unacc.fullName,
      birth_date: unacc.dob,
      sex: unacc.sex,
      address: unacc.address,
      diagnosis: unacc.diagnosis,
      medical_history: unacc.medicalHistory,
      allergies: unacc.allergies,
      emergency_contact_name: unacc.emergencyContact.split(' - ')[0],
      emergency_contact_phone: unacc.emergencyContact.split(' - ')[1] || '0917-555-0000',
      user_id: null,
    })
  }

  for (const p of patientRecords) {
    const { error: pErr } = await supabase.from('patients').upsert(p)
    if (pErr) {
      console.error(`❌ Error upserting patient ${p.full_name}:`, pErr.message)
    }
  }
  console.log('✅ Upserted all 5 patient records into public.patients.')

  // 4. Care Team Assignments (care_teams / care_assignments)
  console.log('\n🤝 Assigning care teams (Doctor, Caregivers, Family Members per patient)...')
  const doctor1Id = userIds.get('doctor1@test.com')!
  const doctor2Id = userIds.get('doctor2@test.com')!
  const caregiver1Id = userIds.get('caregiver1@test.com')!
  const caregiver2Id = userIds.get('caregiver2@test.com')!
  const caregiver3Id = userIds.get('caregiver3@test.com')!
  const family1Id = userIds.get('family1@test.com')!
  const family2Id = userIds.get('family2@test.com')!
  const family3Id = userIds.get('family3@test.com')!

  const assignments = [
    // Patient 1 (Manuel Dumlao)
    { patient_id: patientRecords[0].id, member_id: doctor1Id, member_role: 'doctor' as const, relationship_label: 'Primary Attending Physician' },
    { patient_id: patientRecords[0].id, member_id: caregiver1Id, member_role: 'caregiver' as const, relationship_label: 'Primary Morning Caregiver' },
    { patient_id: patientRecords[0].id, member_id: caregiver2Id, member_role: 'caregiver' as const, relationship_label: 'Evening Caregiver' },
    { patient_id: patientRecords[0].id, member_id: family1Id, member_role: 'family_member' as const, relationship_label: 'Daughter' },

    // Patient 2 (Rosa Ramos)
    { patient_id: patientRecords[1].id, member_id: doctor1Id, member_role: 'doctor' as const, relationship_label: 'Attending Pulmonologist' },
    { patient_id: patientRecords[1].id, member_id: caregiver1Id, member_role: 'caregiver' as const, relationship_label: 'Morning Caregiver' },
    { patient_id: patientRecords[1].id, member_id: caregiver3Id, member_role: 'caregiver' as const, relationship_label: 'Weekend Caregiver' },
    { patient_id: patientRecords[1].id, member_id: family2Id, member_role: 'family_member' as const, relationship_label: 'Son' },

    // Patient 3 (Felipe Valenzuela)
    { patient_id: patientRecords[2].id, member_id: doctor2Id, member_role: 'doctor' as const, relationship_label: 'Attending Neurologist' },
    { patient_id: patientRecords[2].id, member_id: caregiver2Id, member_role: 'caregiver' as const, relationship_label: 'Primary Caregiver' },
    { patient_id: patientRecords[2].id, member_id: caregiver3Id, member_role: 'caregiver' as const, relationship_label: 'Night Shift Caregiver' },
    { patient_id: patientRecords[2].id, member_id: family3Id, member_role: 'family_member' as const, relationship_label: 'Sister' },

    // Patient 4 (Lourdes Santos - No Account)
    { patient_id: patientRecords[3].id, member_id: doctor2Id, member_role: 'doctor' as const, relationship_label: 'Attending Geriatrician' },
    { patient_id: patientRecords[3].id, member_id: caregiver1Id, member_role: 'caregiver' as const, relationship_label: 'Day Caregiver' },
    { patient_id: patientRecords[3].id, member_id: caregiver2Id, member_role: 'caregiver' as const, relationship_label: 'Relief Caregiver' },
    { patient_id: patientRecords[3].id, member_id: family1Id, member_role: 'family_member' as const, relationship_label: 'Niece / Legal Guardian' },

    // Patient 5 (Eduardo Gomez - No Account)
    { patient_id: patientRecords[4].id, member_id: doctor1Id, member_role: 'doctor' as const, relationship_label: 'Attending Nephrologist' },
    { patient_id: patientRecords[4].id, member_id: caregiver3Id, member_role: 'caregiver' as const, relationship_label: 'Primary Caregiver' },
    { patient_id: patientRecords[4].id, member_id: caregiver2Id, member_role: 'caregiver' as const, relationship_label: 'Evening Caregiver' },
    { patient_id: patientRecords[4].id, member_id: family2Id, member_role: 'family_member' as const, relationship_label: 'Nephew' },
  ]

  for (const a of assignments) {
    const { error: aErr } = await supabase.from('care_teams').upsert(
      {
        patient_id: a.patient_id,
        member_id: a.member_id,
        member_role: a.member_role,
        relationship_label: a.relationship_label,
        is_active: true,
      },
      { onConflict: 'patient_id,member_id,member_role' }
    )
    if (aErr) {
      console.error(`❌ Error assigning care team member:`, aErr.message)
    }
  }
  console.log(`✅ Set up ${assignments.length} care team assignments.`)

  // 5. Vital Sign Thresholds (vital_sign_thresholds)
  console.log('\n📊 Setting doctor vital-sign thresholds per patient...')
  const thresholds = [
    {
      patient_id: patientRecords[0].id,
      bp_systolic_min: 90,
      bp_systolic_max: 130,
      bp_diastolic_min: 60,
      bp_diastolic_max: 85,
      pulse_rate_min: 60,
      pulse_rate_max: 100,
      respiratory_rate_min: 12,
      respiratory_rate_max: 20,
      temperature_min: 36.5,
      temperature_max: 37.5,
      spo2_min: 95,
      spo2_max: 100,
      blood_glucose_min: 70,
      blood_glucose_max: 140,
    },
    {
      patient_id: patientRecords[1].id,
      bp_systolic_min: 90,
      bp_systolic_max: 135,
      bp_diastolic_min: 60,
      bp_diastolic_max: 85,
      pulse_rate_min: 60,
      pulse_rate_max: 100,
      respiratory_rate_min: 12,
      respiratory_rate_max: 20,
      temperature_min: 36.5,
      temperature_max: 37.5,
      spo2_min: 92, // COPD specific lower threshold
      spo2_max: 100,
      blood_glucose_min: 70,
      blood_glucose_max: 140,
    },
    {
      patient_id: patientRecords[2].id,
      bp_systolic_min: 95,
      bp_systolic_max: 135,
      bp_diastolic_min: 60,
      bp_diastolic_max: 85,
      pulse_rate_min: 60,
      pulse_rate_max: 95,
      respiratory_rate_min: 12,
      respiratory_rate_max: 20,
      temperature_min: 36.5,
      temperature_max: 37.5,
      spo2_min: 95,
      spo2_max: 100,
      blood_glucose_min: 70,
      blood_glucose_max: 140,
    },
    {
      patient_id: patientRecords[3].id,
      bp_systolic_min: 90,
      bp_systolic_max: 135,
      bp_diastolic_min: 60,
      bp_diastolic_max: 85,
      pulse_rate_min: 60,
      pulse_rate_max: 100,
      respiratory_rate_min: 12,
      respiratory_rate_max: 20,
      temperature_min: 36.5,
      temperature_max: 37.5,
      spo2_min: 94,
      spo2_max: 100,
      blood_glucose_min: 70,
      blood_glucose_max: 140,
    },
    {
      patient_id: patientRecords[4].id,
      bp_systolic_min: 90,
      bp_systolic_max: 130,
      bp_diastolic_min: 60,
      bp_diastolic_max: 85,
      pulse_rate_min: 60,
      pulse_rate_max: 100,
      respiratory_rate_min: 12,
      respiratory_rate_max: 20,
      temperature_min: 36.5,
      temperature_max: 37.5,
      spo2_min: 95,
      spo2_max: 100,
      blood_glucose_min: 70,
      blood_glucose_max: 140,
    },
  ]

  for (const t of thresholds) {
    const { error: tErr } = await supabase.from('vital_sign_thresholds').upsert(t, { onConflict: 'patient_id' })
    if (tErr) console.error(`❌ Error setting threshold for patient ${t.patient_id}:`, tErr.message)
  }
  console.log('✅ Configured custom vital-sign thresholds for all 5 patients.')

  // 6. 14 Days of Shift Reports & Vitals Logs (with out-of-range readings for alerts)
  console.log('\n📈 Generating 14 days of shift reports and vitals logs...')
  const now = new Date()

  // Clean existing historical logs to avoid duplicates if re-running
  await supabase.from('shift_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  for (let pIdx = 0; pIdx < patientRecords.length; pIdx++) {
    const p = patientRecords[pIdx]
    const assignedCaregivers = [caregiver1Id, caregiver2Id, caregiver3Id]

    for (let day = 13; day >= 0; day--) {
      const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000)
      const caregiverId = assignedCaregivers[(day + pIdx) % assignedCaregivers.length]

      // Baseline values
      let sys = 118 + ((day * 3 + pIdx * 4) % 10)
      let dia = 76 + ((day * 2 + pIdx * 2) % 8)
      let pulse = 72 + ((day * 4 + pIdx * 3) % 12)
      let resp = 16 + ((day + pIdx) % 3)
      let temp = 36.6 + (((day + pIdx) % 6) * 0.1)
      let spo2 = 98 - ((day % 3))
      let glucose = 95 + ((day * 7) % 30)
      let weight = pIdx === 0 ? 74.5 : pIdx === 1 ? 58.0 : pIdx === 2 ? 68.2 : pIdx === 3 ? 52.0 : 70.5
      let height = pIdx === 0 ? 170 : pIdx === 1 ? 155 : pIdx === 2 ? 168 : pIdx === 3 ? 150 : 165

      // Introduce intentional out-of-range clinical scenarios
      let isAbnormal = false
      let alertReason = ''

      // Scenario A: Rosa Ramos (Patient 2) has SpO2 drop on Day 2 and Day 0
      if (pIdx === 1 && (day === 2 || day === 0)) {
        spo2 = 88 // Below threshold of 92
        resp = 24 // Above threshold of 20
        isAbnormal = true
        alertReason = 'Critical Hypoxemia (SpO2 88%) and Tachypnea'
      }

      // Scenario B: Manuel Dumlao (Patient 1) has Hypertension Spike on Day 1
      if (pIdx === 0 && day === 1) {
        sys = 158 // Above threshold of 130
        dia = 98  // Above threshold of 85
        isAbnormal = true
        alertReason = 'Stage 2 Hypertension Spike (158/98 mmHg)'
      }

      // Scenario C: Felipe Valenzuela (Patient 3) has Tachycardia on Day 3
      if (pIdx === 2 && day === 3) {
        pulse = 106 // Above threshold of 95
        isAbnormal = true
        alertReason = 'Elevated Pulse Rate (106 bpm)'
      }

      const bmi = Number((weight / ((height / 100) * (height / 100))).toFixed(1))
      const loggedTime = new Date(date.setHours(9, 30, 0, 0)).toISOString()

      // 6a. Insert vitals_logs
      const { data: vLog, error: vErr } = await supabase.from('vitals_logs').insert({
        patient_id: p.id,
        caregiver_id: caregiverId,
        bp_systolic: sys,
        bp_diastolic: dia,
        heart_rate: pulse,
        respiratory_rate: resp,
        temperature_c: Number(temp.toFixed(1)),
        spo2,
        weight_kg: weight,
        height_cm: height,
        bmi,
        pain_score: isAbnormal ? 4 : 0,
        bp_arm: 'right',
        measurement_position: 'sitting',
        temp_method: 'tympanic',
        oxygen_device: spo2 < 92 ? 'nasal_cannula' : 'room_air',
        notes: isAbnormal
          ? `ALERT: Patient showing signs of distress. ${alertReason}. Doctor notified immediately.`
          : 'Patient vitals stable. Resting comfortably.',
        logged_at: loggedTime,
        measured_at: loggedTime,
        created_at: loggedTime,
      }).select().single()

      if (vErr) {
        console.error(`❌ Error inserting vitals log for ${p.full_name} day ${day}:`, vErr.message)
      }

      // 6b. Insert shift_reports
      const shiftNotes = isAbnormal
        ? {
            general: `Patient experienced episode of ${alertReason}. Bedside care provided.`,
            care: 'Vital signs rechecked, position elevated, oxygen cannula administered, doctor alerted.',
            food: 'Consumed 60% of breakfast with oral hydration.',
            elimination: 'Normal bowel and urinary output recorded.',
            sleep: 'Intermittent sleep with cough/restlessness.',
            mood: 'Anxious during episode, stabilized after care.',
            incidents: true,
            incidentDesc: alertReason,
          }
        : {
            general: 'Patient alert, cooperative, and resting comfortably in room.',
            care: 'Morning hygiene completed, assistance with mobility, prescribed oral medications given.',
            food: 'Good appetite; consumed 90% of meals and adequate fluids.',
            elimination: 'Normal elimination, no incontinence or discomfort.',
            sleep: 'Slept 7.5 hours quietly through the night.',
            mood: 'Cheerful and pleasant with care team.',
            incidents: false,
            incidentDesc: null,
          }

      await supabase.from('shift_reports').insert({
        patient_id: p.id,
        caregiver_id: caregiverId,
        shift: day % 2 === 0 ? 'morning' : 'afternoon',
        general_condition: shiftNotes.general,
        activities_care: shiftNotes.care,
        food_fluid_intake: shiftNotes.food,
        elimination: shiftNotes.elimination,
        sleep: shiftNotes.sleep,
        behavior_mood: shiftNotes.mood,
        incidents: shiftNotes.incidents,
        incident_description: shiftNotes.incidentDesc,
        vital_signs: {
          systolic: sys,
          diastolic: dia,
          pulse,
          respiratory_rate: resp,
          temperature: Number(temp.toFixed(1)),
          spo2,
          glucose,
        },
        status: 'submitted',
        submitted_at: loggedTime,
        created_at: loggedTime,
      })

      // 6c. If abnormal, trigger high-priority notification to attending doctor & admin
      if (isAbnormal && day <= 3) {
        const attendingDoctorId = (pIdx === 0 || pIdx === 1 || pIdx === 4) ? doctor1Id : doctor2Id
        const adminId = userIds.get('admin@test.com')!

        for (const recipientId of [attendingDoctorId, adminId]) {
          await supabase.from('notifications').insert({
            recipient_id: recipientId,
            patient_id: p.id,
            type: 'vitals_alert',
            priority: 'high',
            title: `Abnormal Vital Sign: ${p.full_name}`,
            message: `${alertReason} recorded by caregiver. Urgent physician review recommended.`,
            link: `/doctor/patients/${p.id}`,
            is_read: day > 0, // Unread if today (day 0) to highlight in notifications!
            created_at: loggedTime,
          })
        }
      }
    }
  }
  console.log('✅ Generated 14 days of shift reports and vitals logs per patient.')

  // 7. Medications & Medication Administration Logs (Given, Missed, Refused, Overdue)
  console.log('\n💊 Provisioning medications and 3-day administration records...')
  const medConfigs = [
    // Patient 1
    {
      patient_id: patientRecords[0].id,
      doctor_id: doctor1Id,
      name: 'Amlodipine Besylate',
      dosage: '5mg Tablet',
      route: 'Oral',
      frequency: 'Once Daily',
      schedule_times: ['08:00'],
      start_date: '2026-01-01',
      instructions: 'Take in the morning with water. Monitor blood pressure daily.',
    },
    {
      patient_id: patientRecords[0].id,
      doctor_id: doctor1Id,
      name: 'Metformin HCl',
      dosage: '500mg Tablet',
      route: 'Oral',
      frequency: 'Twice Daily',
      schedule_times: ['08:00', '18:00'],
      start_date: '2026-01-01',
      instructions: 'Take immediately after meals.',
    },
    // Patient 2
    {
      patient_id: patientRecords[1].id,
      doctor_id: doctor1Id,
      name: 'Salbutamol Inhaler',
      dosage: '100mcg / puff',
      route: 'Inhalation',
      frequency: 'Every 8 Hours',
      schedule_times: ['06:00', '14:00', '22:00'],
      start_date: '2026-01-10',
      instructions: '2 puffs as scheduled. Rinse mouth with water after use.',
    },
    {
      patient_id: patientRecords[1].id,
      doctor_id: doctor1Id,
      name: 'Furosemide',
      dosage: '20mg Tablet',
      route: 'Oral',
      frequency: 'Once Daily',
      schedule_times: ['08:00'],
      start_date: '2026-02-01',
      instructions: 'Take with morning breakfast.',
    },
    // Patient 3
    {
      patient_id: patientRecords[2].id,
      doctor_id: doctor2Id,
      name: 'Clopidogrel',
      dosage: '75mg Tablet',
      route: 'Oral',
      frequency: 'Once Daily',
      schedule_times: ['09:00'],
      start_date: '2026-01-15',
      instructions: 'Take once daily after morning meal. Do not skip.',
    },
    {
      patient_id: patientRecords[2].id,
      doctor_id: doctor2Id,
      name: 'Atorvastatin Calcium',
      dosage: '20mg Tablet',
      route: 'Oral',
      frequency: 'Once Daily',
      schedule_times: ['20:00'],
      start_date: '2026-01-15',
      instructions: 'Take at bedtime.',
    },
    // Patient 4
    {
      patient_id: patientRecords[3].id,
      doctor_id: doctor2Id,
      name: 'Donepezil HCl',
      dosage: '5mg Tablet',
      route: 'Oral',
      frequency: 'Once Daily',
      schedule_times: ['20:00'],
      start_date: '2026-02-01',
      instructions: 'Take with evening snack.',
    },
    // Patient 5
    {
      patient_id: patientRecords[4].id,
      doctor_id: doctor1Id,
      name: 'Losartan Potassium',
      dosage: '50mg Tablet',
      route: 'Oral',
      frequency: 'Once Daily',
      schedule_times: ['08:00'],
      start_date: '2026-01-01',
      instructions: 'Take in morning with full glass of water.',
    },
  ]

  // Clean medications
  await supabase.from('medication_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('medications').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  for (const m of medConfigs) {
    const { data: med, error: medErr } = await supabase.from('medications').insert({
      patient_id: m.patient_id,
      doctor_id: m.doctor_id,
      name: m.name,
      dosage: m.dosage,
      route: m.route,
      frequency: m.frequency,
      schedule_times: m.schedule_times,
      start_date: m.start_date,
      instructions: m.instructions,
      status: 'active',
    }).select().single()

    if (medErr || !med) {
      console.error(`❌ Error inserting medication ${m.name}:`, medErr?.message)
      continue
    }

    // Insert 3 days of administration logs with Given, Missed, Refused, and Overdue
    for (let d = 2; d >= 0; d--) {
      for (const t of m.schedule_times) {
        const [hours, mins] = t.split(':').map(Number)
        const schedDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
        schedDate.setHours(hours, mins, 0, 0)

        // For past doses
        let status = 'given'
        let administeredAt: string | null = schedDate.toISOString()
        let remarks: string | null = 'Administered without complaints.'

        if (d === 1 && m.name.includes('Metformin')) {
          status = 'missed'
          administeredAt = null
          remarks = 'Patient was fasting for morning blood test.'
        } else if (d === 0 && m.name.includes('Atorvastatin')) {
          status = 'refused'
          administeredAt = null
          remarks = 'Patient refused dose stating slight nausea.'
        } else if (d === 0 && hours < now.getHours() - 1 && m.name.includes('Amlodipine')) {
          // Scheduled but passed 60 minutes -> Overdue
          status = 'scheduled'
          administeredAt = null
          remarks = 'Scheduled dose pending administration (Overdue).'
        }

        await supabase.from('medication_logs').insert({
          medication_id: med.id,
          patient_id: m.patient_id,
          caregiver_id: caregiver1Id,
          scheduled_time: schedDate.toISOString(),
          administered_at: administeredAt,
          status,
          remarks,
          created_at: schedDate.toISOString(),
        })
      }
    }
  }
  console.log('✅ Created medications and administration records (Given, Missed, Refused, Overdue).')

  // 8. Care Notes (care_notes)
  console.log('\n📝 Adding attending doctors care notes...')
  await supabase.from('care_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const notes = [
    {
      patient_id: patientRecords[0].id,
      doctor_id: doctor1Id,
      priority: 'routine',
      note: 'Monitor blood glucose twice daily before breakfast and dinner. Report any readings > 140 mg/dL.',
    },
    {
      patient_id: patientRecords[1].id,
      doctor_id: doctor1Id,
      priority: 'important',
      note: 'Keep oxygen concentrator at bedside. If SpO2 drops below 92%, administer 2L/min nasal cannula and call clinic.',
    },
    {
      patient_id: patientRecords[2].id,
      doctor_id: doctor2Id,
      priority: 'important',
      note: 'Maintain daily passive range of motion exercises on left arm and leg. Fall risk precautions active.',
    },
    {
      patient_id: patientRecords[3].id,
      doctor_id: doctor2Id,
      priority: 'routine',
      note: 'Ensure structured daily routine to reduce evening sundowning confusion. Adequate fluid intake essential.',
    },
    {
      patient_id: patientRecords[4].id,
      doctor_id: doctor1Id,
      priority: 'routine',
      note: 'Strict low-sodium renal diet. Monitor lower limb edema during afternoon shift.',
    },
  ]

  for (const n of notes) {
    await supabase.from('care_notes').insert(n)
  }
  console.log('✅ Added doctor care instructions for caregivers.')

  // 9. Appointments (appointments)
  console.log('\n📅 Scheduling upcoming follow-up appointments...')
  await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const upcomingAppts = [
    {
      patient_id: patientRecords[0].id,
      doctor_id: doctor1Id,
      type: 'Routine Check-up',
      appointment_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Tender Touch Clinic - Room 201',
      notes: 'Review 14-day blood pressure and glucose log.',
      status: 'scheduled',
    },
    {
      patient_id: patientRecords[1].id,
      doctor_id: doctor1Id,
      type: 'Pulmonary Evaluation',
      appointment_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Holy Child Hospital Pulmonary Lab',
      notes: 'Follow-up spirometry and oxygen assessment.',
      status: 'scheduled',
    },
    {
      patient_id: patientRecords[2].id,
      doctor_id: doctor2Id,
      type: 'Physical Therapy Session',
      appointment_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Patient Home (Home Care Visit)',
      notes: 'Gait training and left-side rehabilitation.',
      status: 'scheduled',
    },
    {
      patient_id: patientRecords[3].id,
      doctor_id: doctor2Id,
      type: 'Geriatric Cognitive Review',
      appointment_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Tender Touch Clinic',
      notes: 'Quarterly cognitive and nutritional review.',
      status: 'scheduled',
    },
    {
      patient_id: patientRecords[4].id,
      doctor_id: doctor1Id,
      type: 'Laboratory Blood Chemistry',
      appointment_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Silliman University Medical Center Lab',
      notes: 'Serum creatinine, BUN, and electrolytes.',
      status: 'scheduled',
    },
  ]

  for (const appt of upcomingAppts) {
    await supabase.from('appointments').insert(appt)
  }
  console.log('✅ Scheduled upcoming clinical appointments.')

  // 10. Audit Logs (audit_logs)
  console.log('\n📜 Recording initial audit logs...')
  await supabase.from('audit_logs').insert([
    {
      user_id: userIds.get('admin@test.com'),
      user_name: 'Elena Rostova',
      user_role: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      record_type: 'system',
      record_id: null,
      details: { description: 'Completed CareConnect system database seed and role assignment' },
      ip_address: '127.0.0.1',
    },
    {
      user_id: doctor1Id,
      user_name: 'Dr. Roberto Mendoza',
      user_role: 'doctor',
      action: 'SET_THRESHOLDS',
      record_type: 'vital_sign_thresholds',
      record_id: patientRecords[1].id,
      details: { patient: 'Rosa Ramos', spo2_min: 92, note: 'Adjusted for COPD baseline' },
      ip_address: '127.0.0.1',
    },
    {
      user_id: caregiver1Id,
      user_name: 'Maria Santos',
      user_role: 'caregiver',
      action: 'SUBMIT_SHIFT_REPORT',
      record_type: 'shift_reports',
      record_id: patientRecords[0].id,
      details: { patient: 'Manuel Dumlao', shift: 'morning' },
      ip_address: '127.0.0.1',
    },
  ])
  console.log('✅ Recorded audit trail entries.')

  // 11. Print Credentials Table
  console.log('\n=====================================================================')
  console.log('🎉 CARECONNECT DEMO CREDENTIALS (PASSWORD FOR ALL: password123)')
  console.log('=====================================================================')
  console.table([
    { Role: 'Administrator', Email: 'admin@test.com', Name: 'Elena Rostova', Access: 'All system management & logs' },
    { Role: 'Caregiver', Email: 'caregiver1@test.com', Name: 'Maria Santos', Access: 'Assigned patients (Manuel, Rosa, Lourdes)' },
    { Role: 'Caregiver', Email: 'caregiver2@test.com', Name: 'Juan Dela Cruz', Access: 'Assigned patients (Manuel, Felipe, Lourdes, Eduardo)' },
    { Role: 'Caregiver', Email: 'caregiver3@test.com', Name: 'Grace Alcantara', Access: 'Assigned patients (Rosa, Felipe, Eduardo)' },
    { Role: 'Doctor', Email: 'doctor1@test.com', Name: 'Dr. Roberto Mendoza', Access: 'Attending (Manuel, Rosa, Eduardo)' },
    { Role: 'Doctor', Email: 'doctor2@test.com', Name: 'Dr. Patricia Lim', Access: 'Attending (Felipe, Lourdes)' },
    { Role: 'Family Member', Email: 'family1@test.com', Name: 'Corazon Dumlao', Access: 'Read-only (Manuel Dumlao, Lourdes Santos)' },
    { Role: 'Family Member', Email: 'family2@test.com', Name: 'Antonio Ramos', Access: 'Read-only (Rosa Ramos, Eduardo Gomez)' },
    { Role: 'Family Member', Email: 'family3@test.com', Name: 'Teresa Valenzuela', Access: 'Read-only (Felipe Valenzuela)' },
    { Role: 'Patient (Has Account)', Email: 'patient1@test.com', Name: 'Manuel Dumlao', Access: 'Read-only (Own record only)' },
    { Role: 'Patient (Has Account)', Email: 'patient2@test.com', Name: 'Rosa Ramos', Access: 'Read-only (Own record only)' },
    { Role: 'Patient (Has Account)', Email: 'patient3@test.com', Name: 'Felipe Valenzuela', Access: 'Read-only (Own record only)' },
    { Role: 'Patient (No Account)', Email: '[None]', Name: 'Lourdes Santos', Access: 'Managed by Care Team only' },
    { Role: 'Patient (No Account)', Email: '[None]', Name: 'Eduardo Gomez', Access: 'Managed by Care Team only' },
  ])
  console.log('=====================================================================\n')
}

seed().catch((err) => {
  console.error('Fatal error during seed:', err)
  process.exit(1)
})
