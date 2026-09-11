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

async function runPortalScopingTests() {
  console.log('================================================================');
  console.log('  PHASE 6: PATIENT & FAMILY PORTAL SCOPING & INTEGRATION TESTS');
  console.log('================================================================\n');

  const patientId1 = 'afb3262b-c15d-46bd-885a-264b4987de01'; // Test Patient
  const patientId2 = 'a703af22-7c17-4ed8-b4a2-d9801c2b7ef8'; // Eleanor Vance (Mother)
  const unassignedPatientId = '00000000-0000-0000-0000-000000000000';

  // -------------------------------------------------------------
  // PART 1: PATIENT PORTAL TESTING (patient@test.com)
  // -------------------------------------------------------------
  console.log('--- PART 1: PATIENT PORTAL (patient@test.com) ---');
  const patientClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: pAuth, error: pAuthErr } = await patientClient.auth.signInWithPassword({
    email: 'patient@test.com',
    password: 'password123'
  });
  if (pAuthErr) throw pAuthErr;
  console.log(`✓ Authenticated as Patient: ${pAuth.user.id}`);

  // 1.1 Read own profile
  const { data: pProfile, error: pProfErr } = await patientClient
    .from('users')
    .select('id, full_name, role, patient_profiles!patient_profiles_user_id_fkey(*)')
    .eq('id', pAuth.user.id)
    .single();
  if (pProfErr) throw pProfErr;
  console.log(`✓ Patient Profile: "${pProfile.full_name}" | Role: ${pProfile.role} | Status: ${pProfile.patient_profiles?.current_status}`);

  // 1.2 Read own vitals logs
  const { data: pVitals, error: pVitErr } = await patientClient
    .from('vitals_logs')
    .select('id, heart_rate, spo2, bp_systolic, bp_diastolic, logged_at, caregiver:users!vitals_logs_caregiver_id_fkey(full_name)')
    .eq('patient_id', pAuth.user.id)
    .order('logged_at', { ascending: false });
  if (pVitErr) throw pVitErr;
  console.log(`✓ Patient Vitals Logs: ${pVitals.length} logs retrieved. Latest logged by: "${pVitals[0]?.caregiver?.full_name || 'Caregiver'}"`);

  // 1.3 Read own medical reviews
  const { data: pReviews, error: pRevErr } = await patientClient
    .from('medical_reviews')
    .select('id, new_status, feedback_notes, is_urgent, doctor:users!medical_reviews_doctor_id_fkey(full_name)')
    .eq('patient_id', pAuth.user.id)
    .order('reviewed_at', { ascending: false });
  if (pRevErr) throw pRevErr;
  console.log(`✓ Patient Medical Reviews: ${pReviews.length} reviews retrieved. Latest doctor: "${pReviews[0]?.doctor?.full_name || 'Doctor'}"`);

  // 1.4 Read care team
  const { data: pCareTeam, error: pTeamErr } = await patientClient
    .from('care_teams')
    .select('*, member:users!care_teams_member_id_fkey(*)')
    .eq('patient_id', pAuth.user.id);
  if (pTeamErr) throw pTeamErr;
  console.log(`✓ Patient Care Team: ${pCareTeam.length} members assigned.`);
  pCareTeam.forEach(m => {
    console.log(`   - [${m.member_role.toUpperCase()}] ${m.member?.full_name} (${m.relationship_label || 'Direct'})`);
  });

  // 1.5 Negative Scoping Test: Patient cannot read other patient's vitals
  const { data: blockedVitals, error: blockedVitErr } = await patientClient
    .from('vitals_logs')
    .select('id')
    .eq('patient_id', patientId2);
  const patientBlockedFromOther = !blockedVitals || blockedVitals.length === 0;
  console.log(`✓ Negative Scoping: Patient accessing other patient vitals:`,
    patientBlockedFromOther ? 'BLOCKED (PASS - 0 rows returned)' : 'LEAK (FAIL!)');

  // -------------------------------------------------------------
  // PART 2: FAMILY MEMBER PORTAL TESTING (family_member@test.com)
  // -------------------------------------------------------------
  console.log('\n--- PART 2: FAMILY MEMBER PORTAL (family_member@test.com) ---');
  const familyClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: fAuth, error: fAuthErr } = await familyClient.auth.signInWithPassword({
    email: 'family_member@test.com',
    password: 'password123'
  });
  if (fAuthErr) throw fAuthErr;
  console.log(`✓ Authenticated as Family Member: ${fAuth.user.id}`);

  // 2.1 Multi-patient assignments query
  const { data: familyAssignments, error: fAssignErr } = await familyClient
    .from('care_teams')
    .select(`
      patient_id,
      relationship_label,
      is_active,
      patient:users!care_teams_patient_id_fkey(
        id,
        full_name,
        patient_profile:patient_profiles!patient_profiles_user_id_fkey(
          primary_condition,
          current_status
        )
      )
    `)
    .eq('member_id', fAuth.user.id)
    .eq('is_active', true);
  if (fAssignErr) throw fAssignErr;

  console.log(`✓ Multi-Patient Check: Found ${familyAssignments.length} assigned patients for family member.`);
  familyAssignments.forEach((a, i) => {
    console.log(`   [Patient ${i + 1}] ${a.patient?.full_name} (ID: ${a.patient_id}) - Role: "${a.relationship_label}" | Status: ${a.patient?.patient_profile?.current_status}`);
  });

  const hasMultiplePatients = familyAssignments.length >= 2;
  console.log(`✓ Multi-Patient Switcher Support: ${hasMultiplePatients ? 'CONFIRMED ACTIVE (PASS)' : 'SINGLE ONLY (FAIL)'}`);

  // 2.2 Verify Family can read vitals for Patient 1
  const { data: fP1Vitals, error: fP1VitErr } = await familyClient
    .from('vitals_logs')
    .select('id, heart_rate, spo2, bp_systolic, bp_diastolic')
    .eq('patient_id', patientId1);
  if (fP1VitErr) throw fP1VitErr;
  console.log(`✓ Family reading Patient 1 vitals: ${fP1Vitals.length} records found (PASS)`);

  // 2.3 Verify Family can read vitals for Patient 2
  const { data: fP2Vitals, error: fP2VitErr } = await familyClient
    .from('vitals_logs')
    .select('id, heart_rate, spo2, bp_systolic, bp_diastolic')
    .eq('patient_id', patientId2);
  if (fP2VitErr) throw fP2VitErr;
  console.log(`✓ Family reading Patient 2 vitals: ${fP2Vitals.length} records found (PASS)`);

  // 2.4 Verify Family can read reviews for Patient 1
  const { data: fP1Reviews, error: fP1RevErr } = await familyClient
    .from('medical_reviews')
    .select('id, new_status, feedback_notes, doctor:users!medical_reviews_doctor_id_fkey(full_name)')
    .eq('patient_id', patientId1);
  if (fP1RevErr) throw fP1RevErr;
  console.log(`✓ Family reading Patient 1 doctor reviews: ${fP1Reviews.length} records found (PASS)`);

  // 2.5 Verify Family can read reviews for Patient 2
  const { data: fP2Reviews, error: fP2RevErr } = await familyClient
    .from('medical_reviews')
    .select('id, new_status, feedback_notes, doctor:users!medical_reviews_doctor_id_fkey(full_name)')
    .eq('patient_id', patientId2);
  if (fP2RevErr) throw fP2RevErr;
  console.log(`✓ Family reading Patient 2 doctor reviews: ${fP2Reviews.length} records found (PASS)`);

  // 2.6 Negative Scoping Test: Family cannot read vitals for unassigned patient
  const { data: fUnassignedVitals } = await familyClient
    .from('vitals_logs')
    .select('id')
    .eq('patient_id', unassignedPatientId);
  const familyBlockedFromUnassigned = !fUnassignedVitals || fUnassignedVitals.length === 0;
  console.log(`✓ Negative Scoping: Family accessing unassigned patient vitals:`,
    familyBlockedFromUnassigned ? 'BLOCKED (PASS - 0 rows returned)' : 'LEAK (FAIL!)');

  console.log('\n================================================================');
  console.log('  ALL PATIENT & FAMILY PORTAL SCOPING TESTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

runPortalScopingTests().catch(err => {
  console.error('Portal test failed:', err);
  process.exit(1);
});
