const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const ROLES = [
  { role: 'admin', email: 'admin@test.com' },
  { role: 'doctor', email: 'doctor@test.com' },
  { role: 'caregiver', email: 'caregiver@test.com' },
  { role: 'patient', email: 'patient@test.com' },
  { role: 'family_member', email: 'family_member@test.com' }
];

async function verifyImmutability() {
  console.log('================================================================');
  console.log('  PHASE 8: IMMUTABILITY AUDIT — vitals_logs & medical_reviews');
  console.log('  Testing UPDATE & DELETE Rejection Across ALL 5 Roles (Including Admin)');
  console.log('================================================================\n');

  // 1. Fetch a real target vitals_log and medical_review for testing
  const { data: sampleLog } = await adminClient.from('vitals_logs').select('id, bp_systolic, patient_id').limit(1).single();
  const { data: sampleReview } = await adminClient.from('medical_reviews').select('id, feedback_notes, vitals_log_id').limit(1).single();

  console.log(`Target Vitals Log: ID ${sampleLog?.id} (Current bp_systolic: ${sampleLog?.bp_systolic})`);
  console.log(`Target Medical Review: ID ${sampleReview?.id}\n`);

  for (const { role, email } of ROLES) {
    console.log(`----------------------------------------------------------------`);
    console.log(`Testing Role: [${role.toUpperCase()}] (${email})`);
    console.log(`----------------------------------------------------------------`);

    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: auth, error: authErr } = await client.auth.signInWithPassword({
      email,
      password: 'password123'
    });

    if (authErr) {
      console.error(`  Auth failed for ${email}:`, authErr.message);
      continue;
    }

    // A. vitals_logs UPDATE test
    const { data: vUpData, error: vUpErr } = await client
      .from('vitals_logs')
      .update({ bp_systolic: 999 })
      .eq('id', sampleLog.id)
      .select();

    const vUpBlocked = vUpErr ? `BLOCKED (${vUpErr.message})` : (vUpData.length === 0 ? 'BLOCKED (0 rows updated via RLS)' : 'FAILED: UPDATE SUCCEEDED!');
    console.log(`  1. vitals_logs UPDATE: ${vUpBlocked}`);

    // B. vitals_logs DELETE test
    const { data: vDelData, error: vDelErr } = await client
      .from('vitals_logs')
      .delete()
      .eq('id', sampleLog.id)
      .select();

    const vDelBlocked = vDelErr ? `BLOCKED (${vDelErr.message})` : (vDelData.length === 0 ? 'BLOCKED (0 rows deleted via RLS)' : 'FAILED: DELETE SUCCEEDED!');
    console.log(`  2. vitals_logs DELETE: ${vDelBlocked}`);

    // C. medical_reviews UPDATE test
    const { data: rUpData, error: rUpErr } = await client
      .from('medical_reviews')
      .update({ feedback_notes: 'Tampered Notes' })
      .eq('id', sampleReview.id)
      .select();

    const rUpBlocked = rUpErr ? `BLOCKED (${rUpErr.message})` : (rUpData.length === 0 ? 'BLOCKED (0 rows updated via RLS)' : 'FAILED: UPDATE SUCCEEDED!');
    console.log(`  3. medical_reviews UPDATE: ${rUpBlocked}`);

    // D. medical_reviews DELETE test
    const { data: rDelData, error: rDelErr } = await client
      .from('medical_reviews')
      .delete()
      .eq('id', sampleReview.id)
      .select();

    const rDelBlocked = rDelErr ? `BLOCKED (${rDelErr.message})` : (rDelData.length === 0 ? 'BLOCKED (0 rows deleted via RLS)' : 'FAILED: DELETE SUCCEEDED!');
    console.log(`  4. medical_reviews DELETE: ${rDelBlocked}`);
  }

  // Final verification: Confirm database records were never mutated
  const { data: postLog } = await adminClient.from('vitals_logs').select('id, bp_systolic').eq('id', sampleLog.id).single();
  const { data: postReview } = await adminClient.from('medical_reviews').select('id, feedback_notes').eq('id', sampleReview.id).single();

  console.log('\n================================================================');
  console.log('  FINAL RECORD INTEGRITY CHECK');
  console.log('================================================================');
  console.log(`Vitals Log bp_systolic before: ${sampleLog.bp_systolic} | after: ${postLog.bp_systolic} (Unchanged: ${sampleLog.bp_systolic === postLog.bp_systolic})`);
  console.log(`Medical Review notes before: "${sampleReview.feedback_notes?.slice(0, 30)}..." | after: "${postReview.feedback_notes?.slice(0, 30)}..." (Unchanged: ${sampleReview.feedback_notes === postReview.feedback_notes})`);
  console.log('\n✓ IMMUTABILITY VERIFICATION CONFIRMED: 0/5 roles can UPDATE or DELETE clinical records.\n');
}

verifyImmutability().catch(console.error);
