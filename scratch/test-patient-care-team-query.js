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

async function testPatientCareTeamQuery() {
  console.log('=== CONFIRMATION QUERY: PATIENT READING OWN CARE TEAM ===\n');

  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'patient@test.com',
    password: 'password123'
  });
  if (authErr) throw authErr;

  console.log(`1. Authenticated as patient@test.com (User ID / Patient ID: ${auth.user.id})`);

  // Query care_teams exactly as careTeamsService.getTeamForPatient does
  const { data: rows, error: queryErr } = await client
    .from('care_teams')
    .select(`
      id,
      patient_id,
      member_id,
      member_role,
      relationship_label,
      is_active,
      assigned_at,
      member:users!care_teams_member_id_fkey(
        id,
        full_name,
        role,
        phone,
        email
      )
    `)
    .eq('patient_id', auth.user.id)
    .order('assigned_at', { ascending: false });

  if (queryErr) {
    console.error('Query Error:', queryErr);
    return;
  }

  console.log(`\n2. Query result: Returned ${rows ? rows.length : 0} rows from care_teams for patient_id = ${auth.user.id}:\n`);
  console.log(JSON.stringify(rows, null, 2));

  console.log('\n3. Row Summary:');
  if (rows && rows.length > 0) {
    rows.forEach((r, idx) => {
      console.log(`   [Row ${idx + 1}] Role: ${r.member_role} | Name: ${r.member?.full_name} | Active: ${r.is_active} | Label: ${r.relationship_label}`);
    });
    console.log('\nCONFIRMATION PASSED: Patient successfully queried own care team records under RLS.');
  } else {
    console.log('\n0 rows returned. (Check if 09_patient_care_team_visibility.sql policy has been run in Supabase SQL editor)');
  }
}

testPatientCareTeamQuery().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
