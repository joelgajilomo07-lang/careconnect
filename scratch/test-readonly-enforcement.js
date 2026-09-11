const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

async function runReadOnlyEnforcementTests() {
  console.log('================================================================');
  console.log('  TEST: READ-ONLY RLS WRITE-ENFORCEMENT (PATIENT & FAMILY)');
  console.log('================================================================\n');

  const rolesToTest = [
    { email: 'patient@test.com', label: 'Patient' },
    { email: 'family_member@test.com', label: 'Family Member' },
  ];

  const targetPatientId = 'afb3262b-c15d-46bd-885a-264b4987de01';

  for (const { email, label } of rolesToTest) {
    console.log(`--- Testing Role: ${label} (${email}) ---`);
    const client = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY'], {
      auth: { persistSession: false }
    });

    const { data: auth, error: authErr } = await client.auth.signInWithPassword({
      email,
      password: 'password123'
    });
    if (authErr) throw authErr;
    console.log(`1. Authenticated as ${label}: ${auth.user.id}`);

    // TEST 1: Attempt INSERT into vitals_logs
    const { data: vInsertData, error: vInsertErr } = await client
      .from('vitals_logs')
      .insert({
        patient_id: targetPatientId,
        caregiver_id: auth.user.id,
        heart_rate: 75,
        spo2: 98,
      })
      .select();

    const vitalsInsertBlocked = !!vInsertErr;
    console.log(`2. Attempt INSERT into vitals_logs:`, 
      vitalsInsertBlocked ? `BLOCKED (PASS - ${vInsertErr.message})` : `UNEXPECTED SUCCESS (FAIL!)`);

    // TEST 2: Attempt UPDATE on vitals_logs
    const { data: vUpdateData, error: vUpdateErr } = await client
      .from('vitals_logs')
      .update({ notes: 'Tampered note' })
      .eq('patient_id', targetPatientId)
      .select();

    // In Postgres RLS, an UPDATE without UPDATE policy either returns 0 updated rows or throws an RLS error
    const vitalsUpdateBlocked = !!vUpdateErr || (vUpdateData && vUpdateData.length === 0);
    console.log(`3. Attempt UPDATE on vitals_logs:`, 
      vitalsUpdateBlocked ? `BLOCKED (PASS - ${vUpdateErr?.message || '0 rows affected / no UPDATE policy'})` : `UNEXPECTED SUCCESS (FAIL!)`);

    // TEST 3: Attempt INSERT into medical_reviews
    const { data: mInsertData, error: mInsertErr } = await client
      .from('medical_reviews')
      .insert({
        doctor_id: auth.user.id,
        patient_id: targetPatientId,
        new_status: 'stable',
        feedback_notes: 'Forged review',
        is_urgent: false
      })
      .select();

    const reviewInsertBlocked = !!mInsertErr;
    console.log(`4. Attempt INSERT into medical_reviews:`, 
      reviewInsertBlocked ? `BLOCKED (PASS - ${mInsertErr.message})` : `UNEXPECTED SUCCESS (FAIL!)`);

    // TEST 4: Attempt UPDATE on patient_profiles (clinical status tampering)
    const { data: pUpdateData, error: pUpdateErr } = await client
      .from('patient_profiles')
      .update({ current_status: 'stable' })
      .eq('user_id', targetPatientId)
      .select();

    const profileUpdateBlocked = !!pUpdateErr || (pUpdateData && pUpdateData.length === 0);
    console.log(`5. Attempt UPDATE on patient_profiles:`, 
      profileUpdateBlocked ? `BLOCKED (PASS - ${pUpdateErr?.message || '0 rows affected / no UPDATE policy'})` : `UNEXPECTED SUCCESS (FAIL!)`);

    console.log(`\nResult for ${label}: ${vitalsInsertBlocked && vitalsUpdateBlocked && reviewInsertBlocked && profileUpdateBlocked ? 'ALL WRITES REJECTED (100% READ-ONLY SECURE)' : 'FAIL'}\n`);
  }
}

runReadOnlyEnforcementTests().catch(err => {
  console.error('Test failed with unhandled error:', err);
  process.exit(1);
});
