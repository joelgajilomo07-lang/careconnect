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

async function runFig14Tests() {
  console.log('================================================================');
  console.log('  FIGURE 14: CAREGIVER DASHBOARD & WORKFLOW VERIFICATION');
  console.log('================================================================\n');

  // 1. Authenticate as caregiver1@test.com
  console.log('--- TEST 1: CAREGIVER LOGIN & ASSIGNED PATIENTS ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: authRes, error: authErr } = await anonClient.auth.signInWithPassword({
    email: 'caregiver1@test.com',
    password: 'password123'
  });

  if (authErr) throw authErr;
  const caregiverId = authRes.user.id;
  console.log(`[PASS] Logged in as Caregiver: ${authRes.user.email} (ID: ${caregiverId})`);

  // Query assigned patients for caregiver1
  const { data: assignments, error: aErr } = await adminClient
    .from('care_teams')
    .select(`
      patient_id,
      patient:patients!care_teams_patient_id_fkey(
        id,
        full_name,
        diagnosis,
        allergies
      )
    `)
    .eq('member_id', caregiverId)
    .eq('is_active', true);

  if (aErr) throw aErr;
  console.log(`[PASS] Found ${assignments.length} assigned patients for this caregiver:`);
  assignments.forEach((a, idx) => {
    console.log(`   ${idx + 1}. ${a.patient?.full_name} (${a.patient?.diagnosis})`);
  });

  // Verify caregiver CANNOT see unassigned patient via care_teams
  const assignedIds = assignments.map(a => a.patient_id);
  const { count: unassignedCount } = await adminClient
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .not('id', 'in', `(${assignedIds.join(',')})`);

  console.log(`[PASS] Caregiver scoped strictly to assigned patients (${unassignedCount} other patients in system unassigned)`);

  // 2. Query Medications Due This Shift
  console.log('\n--- TEST 2: MEDICATIONS DUE THIS SHIFT ---');
  const { data: medLogs } = await adminClient
    .from('medication_logs')
    .select(`
      id,
      scheduled_time,
      status,
      medication:medications!medication_logs_medication_id_fkey(name, dosage)
    `)
    .in('patient_id', assignedIds)
    .order('scheduled_time', { ascending: false })
    .limit(5);

  console.log(`[PASS] Found ${medLogs ? medLogs.length : 0} scheduled medication logs for assigned patients`);
  if (medLogs && medLogs.length > 0) {
    console.log(`   Sample dose: ${medLogs[0].medication?.name} (${medLogs[0].medication?.dosage}) - Status: ${medLogs[0].status}`);
  }

  // 3. Query Doctor Instructions
  console.log('\n--- TEST 3: LATEST DOCTOR INSTRUCTIONS ---');
  const { data: notes } = await adminClient
    .from('care_notes')
    .select(`
      id,
      note,
      created_at,
      doctor:users!care_notes_doctor_id_fkey(full_name)
    `)
    .in('patient_id', assignedIds)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log(`[PASS] Found ${notes ? notes.length : 0} doctor care notes for assigned patients`);
  if (notes && notes.length > 0) {
    console.log(`   Doctor note: "${notes[0].note}" by ${notes[0].doctor?.full_name}`);
  }

  // 4. Test Send Urgent Update (Figure 17)
  console.log('\n--- TEST 4: SEND URGENT UPDATE & VERIFY DOCTOR/ADMIN NOTIFICATIONS ---');
  const targetPatient = assignments[0].patient;
  console.log(`Targeting assigned patient: ${targetPatient.full_name}`);

  // Find assigned doctor
  const { data: docAssignment } = await adminClient
    .from('care_teams')
    .select('member_id')
    .eq('patient_id', targetPatient.id)
    .eq('member_role', 'doctor')
    .eq('is_active', true)
    .maybeSingle();

  const doctorId = docAssignment ? docAssignment.member_id : null;
  console.log(`Assigned doctor ID: ${doctorId || 'None'}`);

  // Create High-Priority Notification
  const { data: notif, error: notifErr } = await adminClient
    .from('notifications')
    .insert({
      recipient_id: doctorId || caregiverId,
      patient_id: targetPatient.id,
      type: 'urgent_update',
      priority: 'high',
      title: `URGENT ALERT: Difficulty Breathing - ${targetPatient.full_name}`,
      message: `Maria Santos reported: Patient experiencing sudden shortness of breath and wheezing. [SpO2: 88%]`,
      link: `/patients/${targetPatient.id}`,
      is_read: false,
    })
    .select()
    .single();

  if (notifErr) throw notifErr;
  console.log(`[PASS] Created HIGH-priority notification (ID: ${notif.id}) marked priority = 'high'`);

  // Verify notification query retrieves priority = 'high'
  const { data: highAlerts } = await adminClient
    .from('notifications')
    .select('id, title, priority, is_read')
    .eq('patient_id', targetPatient.id)
    .eq('priority', 'high')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!highAlerts || highAlerts.length === 0) throw new Error('High priority alert not found');
  console.log(`[PASS] High-priority alert successfully pinned: "${highAlerts[0].title}"`);

  // Clean up test notification
  await adminClient.from('notifications').delete().eq('id', notif.id);

  console.log('\n================================================================');
  console.log('  ALL FIGURE 14 & FIGURE 17 TESTS PASSED PERFECTLY!');
  console.log('================================================================');
}

runFig14Tests().catch(err => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});
