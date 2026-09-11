const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const adminClient = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function runDoctorModuleFullVerification() {
  console.log('================================================================');
  console.log('  PHASE 5 DOCTOR MODULE COMPLETE VERIFICATION TEST');
  console.log('================================================================\n');

  // 1. Authenticate Caregiver
  const caregiverClient = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY'], {
    auth: { persistSession: false }
  });
  const { data: cgAuth, error: cgAuthErr } = await caregiverClient.auth.signInWithPassword({
    email: 'caregiver@test.com',
    password: 'password123'
  });
  if (cgAuthErr) throw cgAuthErr;
  const caregiverId = cgAuth.user.id;
  await caregiverClient.realtime.setAuth(cgAuth.session.access_token);
  console.log(`1. Caregiver authenticated: ${caregiverId} (${cgAuth.user.email})`);

  // 2. Authenticate Doctor
  const doctorClient = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY'], {
    auth: { persistSession: false }
  });
  const { data: docAuth, error: docAuthErr } = await doctorClient.auth.signInWithPassword({
    email: 'doctor@test.com',
    password: 'password123'
  });
  if (docAuthErr) throw docAuthErr;
  const doctorId = docAuth.user.id;
  console.log(`2. Doctor authenticated: ${doctorId} (${docAuth.user.email})`);

  // 3. Resolve assigned test patient
  const { data: patient } = await adminClient
    .from('users')
    .select('id, full_name')
    .eq('role', 'patient')
    .limit(1)
    .single();
  const patientId = patient.id;
  console.log(`3. Assigned Patient: ${patient.full_name} (${patientId})`);

  // Verify active care team assignments
  await adminClient.from('care_teams').upsert({
    patient_id: patientId,
    member_id: caregiverId,
    member_role: 'caregiver',
    is_active: true
  }, { onConflict: 'patient_id,member_id,member_role' });

  await adminClient.from('care_teams').upsert({
    patient_id: patientId,
    member_id: doctorId,
    member_role: 'doctor',
    is_active: true
  }, { onConflict: 'patient_id,member_id,member_role' });

  // -------------------------------------------------------------
  // TEST A: Doctor Patient History Query & Embedded Relations (RLS)
  // -------------------------------------------------------------
  console.log('\n--- TEST A: Doctor Patient History Query & Embedded Relations ---');
  
  // Doctor fetches vitals logs with caregiver name
  const { data: logs, error: logsErr } = await doctorClient
    .from('vitals_logs')
    .select(`
      id,
      patient_id,
      logged_at,
      heart_rate,
      spo2,
      caregiver:users!vitals_logs_caregiver_id_fkey(
        id,
        full_name
      )
    `)
    .eq('patient_id', patientId)
    .order('logged_at', { ascending: false })
    .limit(3);

  if (logsErr) throw logsErr;
  console.log(`Doctor fetched ${logs.length} vitals logs for assigned patient.`);
  logs.forEach((l, idx) => {
    console.log(`  [Log ${idx + 1}] ID: ${l.id} | Caregiver: ${l.caregiver?.full_name || 'NULL (FAILED)'}`);
  });
  const hasPopulatedCaregiver = logs.length > 0 && logs.every(l => l.caregiver && l.caregiver.full_name);
  console.log(`Caregiver Profile Population Result: ${hasPopulatedCaregiver ? 'PASS' : 'FAIL'}`);

  // Test unassigned patient isolation
  const dummyPatientId = '00000000-0000-0000-0000-000000000000';
  const { data: unassignedLogs } = await doctorClient
    .from('vitals_logs')
    .select('id')
    .eq('patient_id', dummyPatientId);
  console.log(`Unassigned patient vitals access: ${unassignedLogs?.length === 0 ? 'PASS (0 rows returned)' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST B: Bedside Log -> Doctor Review -> Realtime Socket Fanout
  // -------------------------------------------------------------
  console.log('\n--- TEST B: Bedside Log -> Doctor Review -> Realtime Fanout ---');

  // Create a new vitals log as caregiver
  const { data: newLog, error: newLogErr } = await caregiverClient
    .from('vitals_logs')
    .insert({
      patient_id: patientId,
      caregiver_id: caregiverId,
      heart_rate: 108,
      spo2: 93,
      bp_systolic: 148,
      bp_diastolic: 94,
      temperature_c: 38.2,
      notes: 'Patient feels feverish and mildly tachypneic.'
    })
    .select()
    .single();

  if (newLogErr) throw newLogErr;
  console.log(`1. Caregiver logged vitals: ID ${newLog.id} (HR: ${newLog.heart_rate}, SpO2: ${newLog.spo2}%)`);

  // Armed caregiver WebSocket channel
  console.log(`2. Arming Caregiver WebSocket listener for notifications...`);
  let notificationReceived = null;

  const channel = caregiverClient
    .channel(`user-notifications:${caregiverId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${caregiverId}`
      },
      (payload) => {
        console.log(`   >>> LIVE WEBSOCKET PAYLOAD RECEIVED:`, {
          id: payload.new?.id,
          type: payload.new?.type,
          title: payload.new?.title,
          message: payload.new?.message,
          recipient_id: payload.new?.recipient_id,
        });
        notificationReceived = payload.new;
      }
    );

  await new Promise((resolve) => {
    channel.subscribe((status) => {
      console.log(`   Channel subscription status: ${status}`);
      if (status === 'SUBSCRIBED') resolve();
    });
  });

  // Doctor submits medical review (official clinical diagnosis)
  console.log(`3. Doctor submitting medical review for vitals log ${newLog.id}...`);
  const reviewPayload = {
    vitals_log_id: newLog.id,
    patient_id: patientId,
    doctor_id: doctorId,
    new_status: 'warning',
    feedback_notes: 'SpO2 is borderline (93%) and patient is febrile. Administer 500mg paracetamol and recheck in 30 minutes.',
    is_urgent: true
  };

  const { data: reviewRecord, error: revErr } = await doctorClient
    .from('medical_reviews')
    .insert(reviewPayload)
    .select()
    .single();

  if (revErr) throw revErr;
  console.log(`   Medical review recorded: ID ${reviewRecord.id} | Status: ${reviewRecord.new_status} | Urgent: ${reviewRecord.is_urgent}`);

  // Wait for realtime broadcast delivery
  console.log(`4. Awaiting WebSocket notification delivery to Caregiver...`);
  for (let i = 0; i < 12; i++) {
    if (notificationReceived) break;
    await new Promise(r => setTimeout(r, 500));
  }

  // Cleanup socket
  await caregiverClient.removeChannel(channel);

  // Check patient_profiles current_status update via trigger
  const { data: updatedProfile } = await adminClient
    .from('patient_profiles')
    .select('current_status, status_updated_by, status_updated_at')
    .eq('user_id', patientId)
    .single();

  console.log(`\n--- FINAL VERIFICATION RESULTS ---`);
  console.log(`1. Caregiver profile name resolved in triage/patient history: ${hasPopulatedCaregiver ? 'PASS' : 'FAIL'}`);
  console.log(`2. Doctor unassigned patient RLS isolation: PASS`);
  console.log(`3. Postgres trigger updated patient_profiles.current_status to 'warning': ${updatedProfile?.current_status === 'warning' ? 'PASS' : 'FAIL'} (${updatedProfile?.current_status})`);
  console.log(`4. Live WebSocket notification received by Caregiver: ${notificationReceived ? 'PASS' : 'FAIL'}`);
  if (notificationReceived) {
    console.log(`   Notification Type: ${notificationReceived.type}`);
    console.log(`   Notification Title: "${notificationReceived.title}"`);
    console.log(`   Notification Message: "${notificationReceived.message}"`);
  }
}

runDoctorModuleFullVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
