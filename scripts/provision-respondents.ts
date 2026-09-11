import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { checkVitalsRanges } from '../src/lib/utils/vitalsThresholds'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

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

interface RespondentConfig {
  fullName: string
  email: string
  role: 'caregiver' | 'doctor' | 'patient' | 'family_member'
}

interface ProvisionedResult {
  fullName: string
  email: string
  role: string
  patientName: string
  patientCondition: string
  inviteLink: string
  status: 'newly_provisioned' | 're_invited' | 'active_account'
}

const FICTIONAL_PATIENT_PRESETS = [
  {
    name: 'Robert Chen',
    dob: '1954-06-20',
    sex: 'M',
    condition: 'Post-operative cardiac recovery (CABG x3)',
  },
  {
    name: 'Margaret Holloway',
    dob: '1948-11-14',
    sex: 'F',
    condition: 'Type 2 Diabetes with essential hypertension',
  },
  {
    name: 'Arthur Pendelton',
    dob: '1961-03-08',
    sex: 'M',
    condition: 'COPD stage II with mild exertion hypoxemia',
  },
  {
    name: 'Eleanor Vance',
    dob: '1952-09-25',
    sex: 'F',
    condition: 'Chronic kidney disease (stage 3) with secondary anemia',
  },
  {
    name: 'James Wilson',
    dob: '1959-12-03',
    sex: 'M',
    condition: 'Post-stroke motor recovery with mild hypertension',
  },
]

const FICTIONAL_DOCTORS = [
  { name: 'Dr. Evelyn Reed, MD', specialty: 'Attending Cardiologist' },
  { name: 'Dr. Marcus Vance, MD', specialty: 'Attending Physician' },
  { name: 'Dr. Alistair Finch, MD', specialty: 'Consulting Pulmonologist' },
  { name: 'Dr. Sarah Connor, MD', specialty: 'Internal Medicine Lead' },
]

const FICTIONAL_CAREGIVERS = [
  { name: 'Clara Oswald, RN', label: 'Primary Visiting Nurse' },
  { name: 'Thomas Bailey, CNA', label: 'Home Health Aide' },
  { name: 'Grace Hopper, RN', label: 'Clinical Care Specialist' },
  { name: 'Daniel Jackson, CNA', label: 'Assisted Living Aide' },
]

/**
 * Generate 10-14 days of realistic vitals logs.
 * Validated strictly using checkVitalsRanges from vitalsThresholds.ts.
 */
function generateRealisticVitals(patientId: string, caregiverId: string) {
  const logs = []
  const now = new Date()

  // 12 days of history, 1-2 logs per day (total 18-20 logs)
  for (let dayOffset = 11; dayOffset >= 0; dayOffset--) {
    const logsToday = (dayOffset % 3 === 0 || dayOffset === 0) ? 2 : 1

    for (let logIndex = 0; logIndex < logsToday; logIndex++) {
      const logDate = new Date(now.getTime() - (dayOffset * 86400000) + (logIndex * 28800000) - 7200000)
      
      // Inject two specific flagged readings (e.g. 5 days ago morning, and 8 days ago evening)
      const isFlaggedReading = (dayOffset === 5 && logIndex === 0) || (dayOffset === 8 && logIndex === logsToday - 1)

      let bpSystolic = 118 + Math.floor(Math.random() * 9) // 118-126
      let bpDiastolic = 74 + Math.floor(Math.random() * 8) // 74-81
      let heartRate = 70 + Math.floor(Math.random() * 14)  // 70-83
      let spo2 = 97 + Math.floor(Math.random() * 3)        // 97-99
      let temp = +(36.6 + (Math.random() * 0.5)).toFixed(1) // 36.6-37.1
      let notes = 'Morning routine check. Patient in good spirits.'

      if (isFlaggedReading) {
        if (dayOffset === 5) {
          // Elevated BP reading
          bpSystolic = 144
          bpDiastolic = 92
          notes = 'Patient reported mild headache and dizziness after morning walk. BP elevated.'
        } else {
          // Mild low SpO2 and elevated heart rate
          spo2 = 93
          heartRate = 104
          notes = 'Mild shortness of breath noted during evening check. Supplemental O2 placed on standby.'
        }
      } else {
        const standardNotes = [
          'Morning vitals recorded after light breakfast. Resting quietly.',
          'Evening check. Patient completed scheduled breathing exercises.',
          'Midday reading post-physiotherapy. Vitals returning quickly to resting baseline.',
          'Vitals stable. Medication administered as scheduled.',
          'Evening reading. Patient comfortable, resting in bed.'
        ]
        notes = standardNotes[(dayOffset + logIndex) % standardNotes.length]
      }

      // Assert correctness against vitalsThresholds
      const assessment = checkVitalsRanges({
        bp_systolic: bpSystolic,
        bp_diastolic: bpDiastolic,
        heart_rate: heartRate,
        spo2,
        temperature_c: temp,
      })

      if (isFlaggedReading && !assessment.isFlagged) {
        // Fallback safety to guarantee flagged
        bpSystolic = 148
      } else if (!isFlaggedReading && assessment.isFlagged) {
        // Fallback safety to guarantee normal
        bpSystolic = 120
        bpDiastolic = 78
        spo2 = 98
        heartRate = 74
        temp = 36.8
      }

      logs.push({
        patient_id: patientId,
        caregiver_id: caregiverId,
        logged_at: logDate.toISOString(),
        bp_systolic: bpSystolic,
        bp_diastolic: bpDiastolic,
        heart_rate: heartRate,
        spo2,
        temperature_c: temp,
        notes,
      })
    }
  }

  // Sort chronologically ascending
  return logs.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
}

/**
 * Cleanup function for the --cleanup flag
 */
async function runCleanup(respondents: RespondentConfig[]) {
  console.log('\n🧹 Initiating complete cleanup of survey respondents & dedicated staff/patients...\n')

  const respondentEmails = respondents.map((r) => r.email.toLowerCase())
  const { data: authUsersData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 500 })
  if (listErr) {
    console.error('Failed to list auth users:', listErr.message)
    return
  }

  const allAuthUsers = authUsersData?.users || []

  // Target respondent accounts AND dedicated fictional accounts (@careconnect.internal)
  const targetUsers = allAuthUsers.filter((u) => {
    const email = (u.email || '').toLowerCase()
    return respondentEmails.includes(email) || email.endsWith('@careconnect.internal')
  })

  console.log(`Found ${targetUsers.length} total accounts to clean up.`)
  const targetIds = targetUsers.map((u) => u.id)
  if (targetIds.length === 0) {
    console.log('No survey accounts found to clean up.')
    return
  }

  // Batch delete across all targets in strict FK dependency order
  // 1. Notifications
  await supabase.from('notifications').delete().in('recipient_id', targetIds)
  await supabase.from('notifications').delete().in('patient_id', targetIds)

  // 2. Medical Reviews
  await supabase.from('medical_reviews').delete().in('patient_id', targetIds)
  await supabase.from('medical_reviews').delete().in('doctor_id', targetIds)

  // 3. Vitals Logs
  await supabase.from('vitals_logs').delete().in('patient_id', targetIds)
  await supabase.from('vitals_logs').delete().in('caregiver_id', targetIds)

  // 4. Care Teams
  await supabase.from('care_teams').delete().in('patient_id', targetIds)
  await supabase.from('care_teams').delete().in('member_id', targetIds)

  // 5. Patient Profiles
  await supabase.from('patient_profiles').delete().in('user_id', targetIds)

  // 6. Public Users & Auth Users
  for (const user of targetUsers) {
    await supabase.from('users').delete().eq('id', user.id)
    await supabase.auth.admin.deleteUser(user.id)
    console.log(`  ✔ Deleted ${user.email} (${user.id})`)
  }

  // Remove provisioned links file if exists
  const linksFile = path.resolve(process.cwd(), 'scripts/provisioned-links.txt')
  if (fs.existsSync(linksFile)) {
    fs.unlinkSync(linksFile)
    console.log('  ✔ Removed scripts/provisioned-links.txt')
  }

  console.log('\n✨ Cleanup completed successfully. Database returned to pristine state.\n')
}

async function main() {
  const isCleanup = process.argv.includes('--cleanup')

  const configPath = path.resolve(process.cwd(), 'scripts/respondents.json')
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config file not found at: ${configPath}`)
    process.exit(1)
  }

  const respondents: RespondentConfig[] = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  if (!Array.isArray(respondents) || respondents.length === 0) {
    console.error('❌ scripts/respondents.json must contain a non-empty array of respondents.')
    process.exit(1)
  }

  if (isCleanup) {
    await runCleanup(respondents)
    return
  }

  console.log('\n=============================================================================')
  console.log('               CARECONNECT SURVEY RESPONDENT PROVISIONER                      ')
  console.log('=============================================================================')
  console.log(`Target Base URL : ${baseUrl}`)
  console.log(`Respondents     : ${respondents.length} configured in scripts/respondents.json\n`)

  const results: ProvisionedResult[] = []

  let totalFictionalStaff = 0
  let totalFictionalPatients = 0
  let totalVitalsLogs = 0
  let totalReviews = 0

  const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const existingUsers = authUsersData?.users || []

  for (let i = 0; i < respondents.length; i++) {
    const r = respondents[i]
    const email = r.email.trim().toLowerCase()
    const fullName = r.fullName.trim()
    const role = r.role

    console.log(`\n[${i + 1}/${respondents.length}] Provisioning Respondent: ${fullName} (${email}, role: ${role})...`)

    const existingAuthUser = existingUsers.find((u) => (u.email || '').toLowerCase() === email)

    let respondentUserId: string
    let inviteLink = ''
    let status: ProvisionedResult['status'] = 'newly_provisioned'

    if (!existingAuthUser) {
      // 1. Generate Invite Link & instantiate user in auth.users
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${baseUrl}/auth/confirm`,
        },
      })

      if (linkErr || !linkData.user) {
        console.error(`  ❌ Failed to generate invite link for ${email}:`, linkErr?.message)
        continue
      }

      respondentUserId = linkData.user.id
      inviteLink = `${baseUrl}/auth/confirm?token_hash=${linkData.properties?.hashed_token}&type=invite`
      status = 'newly_provisioned'
      console.log(`  ✔ Generated invite link and auth.users identity (ID: ${respondentUserId})`)

      // 2. Insert public.users profile via production RPC admin_create_user_profile
      const { error: rpcErr } = await supabase.rpc('admin_create_user_profile', {
        p_user_id: respondentUserId,
        p_email: email,
        p_full_name: fullName,
        p_role: role,
        p_phone: '+1-555-0199',
        p_dob: role === 'patient' ? '1968-07-15' : null,
        p_sex: role === 'patient' ? 'Female' : null,
        p_condition: role === 'patient' ? 'Type 2 Diabetes with hypertension' : null,
      })

      if (rpcErr) {
        console.error(`  ❌ Failed to create public profile for ${email}:`, rpcErr.message)
        await supabase.auth.admin.deleteUser(respondentUserId)
        continue
      }
      console.log(`  ✔ Created public.users profile via admin_create_user_profile RPC`)
    } else {
      respondentUserId = existingAuthUser.id
      console.log(`  ℹ User already exists in auth.users (ID: ${respondentUserId})`)

      // Idempotency check: does user have a password set?
      // In Supabase, if a user has signed in or confirmed their email and set a password,
      // calling generateLink(type: 'invite') returns an error: "already registered".
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${baseUrl}/auth/confirm`,
        },
      })

      if (linkErr) {
        console.log(`  ℹ Respondent has already confirmed their account and set a password. Skipping invite generation.`)
        inviteLink = `[ACTIVE ACCOUNT - Password already set by ${email}]`
        status = 'active_account'
      } else {
        inviteLink = `${baseUrl}/auth/confirm?token_hash=${linkData.properties?.hashed_token}&type=invite`
        status = 're_invited'
        console.log(`  ✔ Regenerated pending invite link for ${email}`)
      }
    }

    // 3. Check if dedicated care team already exists for this respondent
    const { data: existingCareTeams } = await supabase
      .from('care_teams')
      .select('patient_id')
      .eq('member_id', respondentUserId)

    let patientUserId: string
    let patientPreset = FICTIONAL_PATIENT_PRESETS[i % FICTIONAL_PATIENT_PRESETS.length]

    if (existingCareTeams && existingCareTeams.length > 0) {
      patientUserId = existingCareTeams[0].patient_id
      const { data: pProfile } = await supabase
        .from('patient_profiles')
        .select('primary_condition, users:user_id(full_name)')
        .eq('user_id', patientUserId)
        .single()

      const pName = (pProfile?.users as any)?.full_name || 'Assigned Patient'
      const pCond = pProfile?.primary_condition || 'Active clinical management'
      console.log(`  ✔ Respondent already linked to dedicated patient: ${pName} (${pCond})`)

      results.push({
        fullName,
        email,
        role,
        patientName: pName,
        patientCondition: pCond,
        inviteLink,
        status,
      })
      continue
    }

    // 4. Create Dedicated Patient & Care Team (Fully Disjoint)
    const patientSlug = `p${i + 1}_${Date.now().toString(36)}`
    let assignedDoctorId: string
    let assignedCaregiverId: string

    if (role === 'patient') {
      patientUserId = respondentUserId
    } else {
      // Create dedicated fictional patient auth user & profile
      const patientEmail = `patient.${patientSlug}@careconnect.internal`
      const { data: pAuth, error: pAuthErr } = await supabase.auth.admin.createUser({
        email: patientEmail,
        password: 'InternalFictionalPatientSecret123!',
        email_confirm: true,
      })

      if (pAuthErr || !pAuth.user) {
        console.error(`  ❌ Failed to create fictional patient auth for ${email}:`, pAuthErr?.message)
        continue
      }

      patientUserId = pAuth.user.id
      totalFictionalPatients++

      await supabase.rpc('admin_create_user_profile', {
        p_user_id: patientUserId,
        p_email: patientEmail,
        p_full_name: patientPreset.name,
        p_role: 'patient',
        p_dob: patientPreset.dob,
        p_sex: patientPreset.sex,
        p_condition: patientPreset.condition,
      })
      console.log(`  ✔ Created dedicated fictional patient: ${patientPreset.name} (${patientPreset.condition})`)
    }

    // Create dedicated fictional Doctor (if respondent is not doctor)
    const docPreset = FICTIONAL_DOCTORS[i % FICTIONAL_DOCTORS.length]
    if (role === 'doctor') {
      assignedDoctorId = respondentUserId
    } else {
      const docEmail = `dr.${patientSlug}@careconnect.internal`
      const { data: dAuth } = await supabase.auth.admin.createUser({
        email: docEmail,
        password: 'InternalFictionalDoctorSecret123!',
        email_confirm: true,
      })
      assignedDoctorId = dAuth!.user!.id
      totalFictionalStaff++

      await supabase.rpc('admin_create_user_profile', {
        p_user_id: assignedDoctorId,
        p_email: docEmail,
        p_full_name: docPreset.name,
        p_role: 'doctor',
        p_phone: '+1-555-0300',
      })
      console.log(`  ✔ Created dedicated fictional doctor: ${docPreset.name}`)
    }

    // Create dedicated fictional Caregiver (if respondent is not caregiver)
    const cgPreset = FICTIONAL_CAREGIVERS[i % FICTIONAL_CAREGIVERS.length]
    if (role === 'caregiver') {
      assignedCaregiverId = respondentUserId
    } else {
      const cgEmail = `nurse.${patientSlug}@careconnect.internal`
      const { data: cAuth } = await supabase.auth.admin.createUser({
        email: cgEmail,
        password: 'InternalFictionalCaregiverSecret123!',
        email_confirm: true,
      })
      assignedCaregiverId = cAuth!.user!.id
      totalFictionalStaff++

      await supabase.rpc('admin_create_user_profile', {
        p_user_id: assignedCaregiverId,
        p_email: cgEmail,
        p_full_name: cgPreset.name,
        p_role: 'caregiver',
        p_phone: '+1-555-0400',
      })
      console.log(`  ✔ Created dedicated fictional caregiver: ${cgPreset.name}`)
    }

    // 5. Build disjoint Care Team
    // A) Doctor <-> Patient
    await supabase.from('care_teams').insert({
      patient_id: patientUserId,
      member_id: assignedDoctorId,
      member_role: 'doctor',
      relationship_label: docPreset.specialty,
      is_active: true,
    })

    // B) Caregiver <-> Patient
    await supabase.from('care_teams').insert({
      patient_id: patientUserId,
      member_id: assignedCaregiverId,
      member_role: 'caregiver',
      relationship_label: cgPreset.label,
      is_active: true,
    })

    // C) Family Member <-> Patient (if role === family_member)
    if (role === 'family_member') {
      await supabase.from('care_teams').insert({
        patient_id: patientUserId,
        member_id: respondentUserId,
        member_role: 'family_member',
        relationship_label: 'Primary Family Proxy / Health Advocate',
        is_active: true,
      })
      console.log(`  ✔ Linked family respondent ${fullName} to care team`)
    }

    console.log(`  ✔ Fully disjoint care team assembled for ${patientPreset.name}`)

    // 6. Seed 10-14 days of realistic vitals
    const vitalsLogs = generateRealisticVitals(patientUserId, assignedCaregiverId)
    const { data: insertedVitals, error: vitalsErr } = await supabase
      .from('vitals_logs')
      .insert(vitalsLogs)
      .select('id, logged_at')

    if (vitalsErr) {
      console.error(`  ❌ Error inserting vitals for ${patientPreset.name}:`, vitalsErr.message)
    } else {
      totalVitalsLogs += vitalsLogs.length
      console.log(`  ✔ Seeded ${vitalsLogs.length} vitals readings with natural variation & flagged entries`)
    }

    // 7. Insert 2-3 medical reviews from assigned doctor
    // Trigger process_medical_review() fires automatically to set current_status & status_updated_at
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000 + 3600000).toISOString()
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000 + 7200000).toISOString()

    const review1Log = insertedVitals?.[Math.max(0, Math.floor(insertedVitals.length / 2))]?.id || null
    const review2Log = insertedVitals?.[insertedVitals.length - 1]?.id || null

    const reviews = [
      {
        doctor_id: assignedDoctorId,
        patient_id: patientUserId,
        vitals_log_id: review1Log,
        new_status: 'warning' as const,
        is_urgent: false,
        feedback_notes:
          'Mild blood pressure and pulse elevation observed during mid-week check. Recommend maintaining low sodium intake and scheduled hydration.',
        reviewed_at: fiveDaysAgo,
      },
      {
        doctor_id: assignedDoctorId,
        patient_id: patientUserId,
        vitals_log_id: review2Log,
        new_status: 'stable' as const,
        is_urgent: false,
        feedback_notes:
          'Vitals stabilized over the last 48 hours. Target oxygen saturation achieved on room air. Continue current outpatient recovery regimen.',
        reviewed_at: twoDaysAgo,
      },
    ]

    const { error: reviewErr } = await supabase.from('medical_reviews').insert(reviews)
    if (reviewErr) {
      console.error(`  ❌ Error inserting medical reviews:`, reviewErr.message)
    } else {
      totalReviews += reviews.length
      console.log(`  ✔ Inserted 2 doctor reviews (trigger process_medical_review updated patient status to STABLE)`)
    }

    results.push({
      fullName,
      email,
      role,
      patientName: patientPreset.name,
      patientCondition: patientPreset.condition,
      inviteLink,
      status,
    })
  }

  // 8. Write provisioned-links.txt (gitignored)
  const linksFilePath = path.resolve(process.cwd(), 'scripts/provisioned-links.txt')
  const fileContent = [
    '============================================================================= ',
    'SECURITY WARNING: ACTIVE AUTHENTICATION CREDENTIALS                           ',
    '----------------------------------------------------------------------------- ',
    'This file contains live one-time invitation links for survey respondents.     ',
    'DO NOT commit this file to git or share it broadly.                           ',
    'Distribute links individually to each designated respondent.                  ',
    'Invitation tokens expire according to project Auth settings (default: 24h).  ',
    'Generated at: ' + new Date().toISOString(),
    '=============================================================================\n',
    ...results.map((r, idx) => {
      return [
        `Respondent #${idx + 1}: ${r.fullName}`,
        `Email           : ${r.email}`,
        `Role            : ${r.role}`,
        `Assigned Patient: ${r.patientName} (${r.patientCondition})`,
        `Status          : ${r.status}`,
        `Invitation Link : ${r.inviteLink}`,
        '-----------------------------------------------------------------------------',
      ].join('\n')
    }),
  ].join('\n')

  fs.writeFileSync(linksFilePath, fileContent, 'utf8')

  // 9. Console Reporting & Advisories
  console.log('\n=============================================================================')
  console.log('                       PROVISIONING SUMMARY TABLE                            ')
  console.log('=============================================================================')
  console.table(
    results.map((r) => ({
      'Full Name': r.fullName,
      Role: r.role,
      Email: r.email,
      'Assigned Patient': r.patientName,
      Status: r.status,
    }))
  )

  const totalAccountsCreated = respondents.length + totalFictionalStaff + totalFictionalPatients

  console.log('-----------------------------------------------------------------------------')
  console.log(`📊 Total Accounts Provisioned:`)
  console.log(`   - Survey Respondents    : ${respondents.length}`)
  console.log(`   - Fictional Staff (MD/RN): ${totalFictionalStaff} (@careconnect.internal)`)
  console.log(`   - Fictional Patients    : ${totalFictionalPatients} (@careconnect.internal)`)
  console.log(`   - Total Identity Records: ${totalAccountsCreated}`)
  console.log(`   - Vitals Logs Seeded    : ${totalVitalsLogs}`)
  console.log(`   - Medical Reviews Seeded: ${totalReviews}`)
  console.log('-----------------------------------------------------------------------------')
  console.log('📁 Distribution file generated at: scripts/provisioned-links.txt')
  console.log('⚠️  SECURITY WARNING: scripts/provisioned-links.txt is gitignored and contains live')
  console.log('   tokens. Do not commit or share this file publicly.')
  console.log('⏱️  TOKEN EXPIRY NOTICE: Supabase invitation links expire in 24 hours (86400s) by')
  console.log('   default. Generate or distribute links shortly before respondent evaluations.')
  console.log('💡 WORKFLOW REMINDER: Care-team assignment is what prevents empty-dashboard states.')
  console.log('   Any user invited manually outside this script must be assigned to a patient')
  console.log('   care team in /care-teams before they log in.')
  console.log('🧹 CLEANUP: To reset all respondents and fictional data, run:')
  console.log('   npm run provision -- --cleanup')
  console.log('=============================================================================\n')
}

main().catch((err) => {
  console.error('Fatal error during provisioning:', err)
  process.exit(1)
})
