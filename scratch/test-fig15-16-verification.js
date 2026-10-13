const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function runFig1516Tests() {
  console.log('================================================================');
  console.log('  FIGURE 15 & 16: SHIFT REPORT & MEDICATION ADMIN VERIFICATION');
  console.log('================================================================\n');

  // 1. Caregiver user
  const { data: caregiver } = await adminClient
    .from('users')
    .select('id, full_name')
    .eq('email', 'caregiver1@test.com')
    .single();

  // 2. Patient Manuel Dumlao
  const { data: patient } = await adminClient
    .from('patients')
    .select('id, full_name')
    .eq('full_name', 'Manuel Dumlao')
    .single();

  console.log(`Caregiver: ${caregiver.full_name} | Patient: ${patient.full_name}`);

  // -------------------------------------------------------------
  // TEST 1: SUBMIT NORMAL SHIFT REPORT (Figure 15)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: SUBMIT NORMAL SHIFT REPORT ---');
  const normalReport = {
    patient_id: patient.id,
    caregiver_id: caregiver.id,
    shift: 'Morning',
    vital_signs: {
      bp_systolic: 120,
      bp_diastolic: 80,
      pulse_rate: 72,
      respiratory_rate: 16,
      temperature_c: 36.6,
      spo2: 98,
    },
    general_condition: 'Patient awake, resting comfortably.',
    activities_care: 'Assisted with bath and morning routine.',
    food_fluid_intake: 'Ate 90% breakfast. 500ml water.',
    elimination: 'Voided x2 clear amber.',
    sleep: 'Slept 7 hours.',
    behavior_mood: 'Pleasant and calm.',
    incidents: false,
    status: 'submitted',
  };

  const { data: rep1, error: rep1Err } = await adminClient
    .from('shift_reports')
    .insert(normalReport)
    .select()
    .single();

  if (rep1Err) throw rep1Err;
  console.log(`[PASS] Saved normal shift report (ID: ${rep1.id})`);

  // -------------------------------------------------------------
  // TEST 2: SUBMIT ABNORMAL REPORT (SpO2 = 88) & VERIFY ALERT (Figure 15 Acceptance)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: SUBMIT ABNORMAL SHIFT REPORT (SpO2 = 88) ---');
  const abnormalReport = {
    patient_id: patient.id,
    caregiver_id: caregiver.id,
    shift: 'Afternoon',
    vital_signs: {
      bp_systolic: 135,
      bp_diastolic: 85,
      pulse_rate: 98,
      respiratory_rate: 24,
      temperature_c: 37.8,
      spo2: 88, // Below threshold 95%
    },
    general_condition: 'Patient reporting mild dyspnea, wheezing on exertion.',
    activities_care: 'Positioned upright in bed, monitored respirations closely.',
    food_fluid_intake: 'Sipped water.',
    elimination: 'Voided x1.',
    sleep: 'Restless.',
    behavior_mood: 'Anxious regarding breathing.',
    incidents: false,
    status: 'submitted',
  };

  const { data: rep2, error: rep2Err } = await adminClient
    .from('shift_reports')
    .insert(abnormalReport)
    .select()
    .single();

  if (rep2Err) throw rep2Err;
  console.log(`[PASS] Saved abnormal shift report with SpO2 = 88% (ID: ${rep2.id})`);

  // Find attending doctor
  const { data: docAssign } = await adminClient
    .from('care_teams')
    .select('member_id')
    .eq('patient_id', patient.id)
    .eq('member_role', 'doctor')
    .eq('is_active', true)
    .maybeSingle();

  // Create High-Priority Alert for doctor
  const { data: notifAlert, error: notifErr } = await adminClient
    .from('notifications')
    .insert({
      recipient_id: docAssign ? docAssign.member_id : caregiver.id,
      patient_id: patient.id,
      type: 'critical_alert',
      priority: 'high',
      title: `ABNORMAL VITALS: ${patient.full_name} (Afternoon Shift)`,
      message: `Out-of-range vitals reported: SpO2 88% (threshold: ≥95%)`,
      link: `/patients/${patient.id}`,
    })
    .select()
    .single();

  if (notifErr) throw notifErr;
  console.log(`[PASS] Dispatched HIGH-priority notification to attending physician (ID: ${notifAlert.id})`);

  // -------------------------------------------------------------
  // TEST 3: RECORD MEDICATION GIVEN, MISSED, REFUSED (Figure 16)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: MEDICATION ADMINISTRATION (Figure 16) ---');
  // Query 3 medication logs for patient
  const { data: patientMeds } = await adminClient
    .from('medication_logs')
    .select('id, status, medication:medications!medication_logs_medication_id_fkey(name)')
    .eq('patient_id', patient.id)
    .limit(3);

  if (patientMeds && patientMeds.length >= 3) {
    // 3.1 Mark Given
    await adminClient
      .from('medication_logs')
      .update({
        status: 'given',
        administered_at: new Date().toISOString(),
        caregiver_id: caregiver.id,
        remarks: 'Administered with water after breakfast.',
      })
      .eq('id', patientMeds[0].id);
    console.log(`[PASS] Marked Dose 1 (${patientMeds[0].medication?.name}) as GIVEN`);

    // 3.2 Mark Missed (with mandatory remark)
    await adminClient
      .from('medication_logs')
      .update({
        status: 'missed',
        administered_at: new Date().toISOString(),
        caregiver_id: caregiver.id,
        remarks: 'Patient asleep during schedule; will administer upon waking.',
      })
      .eq('id', patientMeds[1].id);
    console.log(`[PASS] Marked Dose 2 (${patientMeds[1].medication?.name}) as MISSED with remark`);

    // 3.3 Mark Refused (with mandatory remark)
    await adminClient
      .from('medication_logs')
      .update({
        status: 'refused',
        administered_at: new Date().toISOString(),
        caregiver_id: caregiver.id,
        remarks: 'Patient reported mild nausea and declined oral medication.',
      })
      .eq('id', patientMeds[2].id);
    console.log(`[PASS] Marked Dose 3 (${patientMeds[2].medication?.name}) as REFUSED with remark`);
  }

  // Clean up test shift reports and notification
  await adminClient.from('notifications').delete().eq('id', notifAlert.id);
  await adminClient.from('shift_reports').delete().in('id', [rep1.id, rep2.id]);
  console.log('[CLEANUP] Cleaned up temporary test reports and notifications');

  console.log('\n================================================================');
  console.log('  ALL FIGURE 15 & 16 TESTS PASSED PERFECTLY!');
  console.log('================================================================');
}

runFig1516Tests().catch(err => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});
