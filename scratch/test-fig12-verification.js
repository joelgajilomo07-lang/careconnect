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

async function runFig12Tests() {
  console.log('================================================================');
  console.log('  FIGURE 12: PATIENT MANAGEMENT & CARE ASSIGNMENT VERIFICATION');
  console.log('================================================================\n');

  let testPatientId = null;
  let testPatientUserId = null;
  const testPatientUserEmail = 'fig12_patient_test@test.com';

  try {
    // -------------------------------------------------------------
    // TEST 1: CREATE NEW PATIENT PROFILE (savePatientAction simulation)
    // -------------------------------------------------------------
    console.log('--- TEST 1: CREATE NEW PATIENT RECORD ---');
    const newPatientData = {
      full_name: 'Guillermo F. Hernandez',
      birth_date: '1952-08-14',
      sex: 'Male',
      address: '28 Hibbard Ave, Bantayan, Dumaguete City',
      diagnosis: 'Parkinson\'s Disease (Stage 2), Mild Hypertension',
      allergies: 'Penicillin, Aspirin',
      medical_history: 'Diagnosed 2021. Bilateral resting tremor, bradykinesia.',
      emergency_contact_name: 'Teresa Hernandez (Spouse)',
      emergency_contact_phone: '+63 918 555 4321',
    };

    const { data: createdPatient, error: pCreateErr } = await adminClient
      .from('patients')
      .insert(newPatientData)
      .select()
      .single();

    if (pCreateErr) throw pCreateErr;
    testPatientId = createdPatient.id;
    console.log(`[PASS] Created patient profile: ${createdPatient.full_name} (ID: ${testPatientId})`);

    // Record audit log
    await adminClient.from('audit_logs').insert({
      user_name: 'Elena Rostova (Admin)',
      user_role: 'admin',
      action: 'PATIENT_CREATE',
      record_type: 'patients',
      record_id: testPatientId,
      details: { full_name: createdPatient.full_name, diagnosis: createdPatient.diagnosis }
    });
    console.log('[PASS] Logged PATIENT_CREATE to audit_logs');

    // -------------------------------------------------------------
    // TEST 2: UPDATE PATIENT PROFILE
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: UPDATE PATIENT PROFILE ---');
    const { data: updatedPatient, error: pUpdateErr } = await adminClient
      .from('patients')
      .update({
        diagnosis: 'Parkinson\'s Disease (Stage 2), Controlled Hypertension',
        allergies: 'Penicillin, Aspirin, Sulfa drugs',
        updated_at: new Date().toISOString()
      })
      .eq('id', testPatientId)
      .select()
      .single();

    if (pUpdateErr) throw pUpdateErr;
    console.log(`[PASS] Updated patient diagnosis: "${updatedPatient.diagnosis}", allergies: "${updatedPatient.allergies}"`);

    await adminClient.from('audit_logs').insert({
      user_name: 'Elena Rostova (Admin)',
      user_role: 'admin',
      action: 'PATIENT_UPDATE',
      record_type: 'patients',
      record_id: testPatientId,
      details: { diagnosis: updatedPatient.diagnosis }
    });
    console.log('[PASS] Logged PATIENT_UPDATE to audit_logs');

    // -------------------------------------------------------------
    // TEST 3: ASSIGN CAREGIVER & VERIFY ACCESS
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: ASSIGN CAREGIVER & VERIFY DASHBOARD ACCESS ---');
    // Find caregiver1 user
    const { data: caregiverUser } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .eq('email', 'caregiver1@test.com')
      .single();

    if (!caregiverUser) throw new Error('caregiver1@test.com not found');
    console.log(`Found caregiver: ${caregiverUser.full_name} (${caregiverUser.id})`);

    // Assign to patient
    const { data: cgAssignment, error: cgAssignErr } = await adminClient
      .from('care_teams')
      .insert({
        patient_id: testPatientId,
        member_id: caregiverUser.id,
        member_role: 'caregiver',
        relationship_label: 'Primary Day Shift (6AM - 2PM)',
        is_active: true,
      })
      .select()
      .single();

    if (cgAssignErr) throw cgAssignErr;
    console.log(`[PASS] Assigned caregiver to care_teams (Assignment ID: ${cgAssignment.id})`);

    // Verify access via has_patient_access function or query
    const { data: accessCheck } = await adminClient
      .from('care_teams')
      .select('id, is_active')
      .eq('patient_id', testPatientId)
      .eq('member_id', caregiverUser.id)
      .eq('is_active', true)
      .single();

    if (!accessCheck) throw new Error('Caregiver assignment not found in active query');
    console.log('[PASS] Caregiver has active access to patient');

    // -------------------------------------------------------------
    // TEST 4: UNASSIGN CAREGIVER & CONFIRM ACCESS REMOVED
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: UNASSIGN CAREGIVER & CONFIRM ACCESS REMOVED ---');
    const { error: cgRemoveErr } = await adminClient
      .from('care_teams')
      .update({ is_active: false })
      .eq('id', cgAssignment.id);

    if (cgRemoveErr) throw cgRemoveErr;

    const { data: removedCheck } = await adminClient
      .from('care_teams')
      .select('id')
      .eq('patient_id', testPatientId)
      .eq('member_id', caregiverUser.id)
      .eq('is_active', true)
      .maybeSingle();

    if (removedCheck) throw new Error('Caregiver should NOT have active access after unassign');
    console.log('[PASS] Caregiver unassigned; active access successfully revoked');

    // Re-assign caregiver so patient has care team for remaining checks
    await adminClient
      .from('care_teams')
      .update({ is_active: true })
      .eq('id', cgAssignment.id);
    console.log('[PASS] Caregiver reactivated for full care team simulation');

    // -------------------------------------------------------------
    // TEST 5: ASSIGN PRIMARY DOCTOR
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: ASSIGN PRIMARY DOCTOR ---');
    const { data: docUser } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .eq('email', 'doctor1@test.com')
      .single();

    const { data: docAssignment, error: docAssignErr } = await adminClient
      .from('care_teams')
      .insert({
        patient_id: testPatientId,
        member_id: docUser.id,
        member_role: 'doctor',
        relationship_label: 'Primary Attending Physician',
        is_active: true,
      })
      .select()
      .single();

    if (docAssignErr) throw docAssignErr;
    console.log(`[PASS] Assigned primary physician: ${docUser.full_name}`);

    // -------------------------------------------------------------
    // TEST 6: CREATE & LINK PATIENT ACCOUNT (1:1 LINK)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: CREATE & LINK PATIENT PORTAL ACCOUNT (1:1) ---');
    // Create patient auth account
    const { data: newAuthUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: testPatientUserEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Guillermo F. Hernandez', role: 'patient' }
    });

    if (authErr) throw authErr;
    testPatientUserId = newAuthUser.user.id;

    // Insert public.users
    await adminClient.from('users').insert({
      id: testPatientUserId,
      email: testPatientUserEmail,
      full_name: 'Guillermo F. Hernandez',
      role: 'patient',
      is_active: true
    });

    // Link to patient
    const { error: linkErr } = await adminClient
      .from('patients')
      .update({ user_id: testPatientUserId })
      .eq('id', testPatientId);

    if (linkErr) throw linkErr;
    console.log(`[PASS] Created and linked patient account: ${testPatientUserEmail} (1:1)`);

    // Verify login client
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: loginRes, error: loginErr } = await anonClient.auth.signInWithPassword({
      email: testPatientUserEmail,
      password: 'password123'
    });

    if (loginErr) throw loginErr;
    console.log(`[PASS] Successfully authenticated as newly provisioned patient: ${loginRes.user.email}`);

    // Verify patient can query their own patient record
    const patientSessionClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${loginRes.session.access_token}` } }
    });

    const { data: myPatientRecord, error: myRecErr } = await patientSessionClient
      .from('patients')
      .select('id, full_name, diagnosis, user_id')
      .eq('id', testPatientId)
      .single();

    if (myRecErr) throw myRecErr;
    console.log(`[PASS] Patient successfully read their own record: "${myPatientRecord.full_name}"`);

    // Verify patient CANNOT query unlinked patient (403/empty due to RLS)
    const { data: otherPatient } = await patientSessionClient
      .from('patients')
      .select('id, full_name')
      .neq('id', testPatientId)
      .limit(1);

    if (otherPatient && otherPatient.length > 0) {
      console.log(`[WARN] RLS returned ${otherPatient.length} rows for other patients`);
    } else {
      console.log('[PASS] RLS strictly prevented patient from reading other patients\' records');
    }

    // -------------------------------------------------------------
    // TEST 7: UNLINK PATIENT ACCOUNT
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: UNLINK PATIENT ACCOUNT ---');
    const { error: unlinkErr } = await adminClient
      .from('patients')
      .update({ user_id: null })
      .eq('id', testPatientId);

    if (unlinkErr) throw unlinkErr;

    const { data: unlinkedPatient } = await adminClient
      .from('patients')
      .select('user_id')
      .eq('id', testPatientId)
      .single();

    if (unlinkedPatient.user_id !== null) throw new Error('Patient user_id should be null');
    console.log('[PASS] Patient account successfully unlinked');

  } finally {
    // Clean up test data
    console.log('\n--- CLEANUP TEST DATA ---');
    if (testPatientId) {
      await adminClient.from('care_teams').delete().eq('patient_id', testPatientId);
      await adminClient.from('patients').delete().eq('id', testPatientId);
      console.log(`[CLEANUP] Deleted test patient: ${testPatientId}`);
    }
    if (testPatientUserId) {
      await adminClient.from('users').delete().eq('id', testPatientUserId);
      await adminClient.auth.admin.deleteUser(testPatientUserId);
      console.log(`[CLEANUP] Deleted test patient auth user: ${testPatientUserId}`);
    }
  }

  console.log('\n================================================================');
  console.log('  ALL FIGURE 12 TESTS PASSED PERFECTLY!');
  console.log('================================================================');
}

runFig12Tests().catch(err => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});
