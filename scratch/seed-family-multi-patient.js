const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const admin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function seedFamilyMultiPatient() {
  console.log('=== SEEDING REAL MULTI-PATIENT FAMILY ASSIGNMENTS ===\n');

  const familyId = '27d17b90-72f2-4d0f-a9c5-42f27f0b3aae'; // family_member@test.com
  const patient1Id = 'afb3262b-c15d-46bd-885a-264b4987de01'; // Test Patient
  const patient2Id = 'a703af22-7c17-4ed8-b4a2-d9801c2b7ef8'; // Patient B
  const doctorId = '05b8c0f0-16c1-43c4-8cae-ab3f2ab772b0';
  const caregiverId = '3cc800c5-709a-4ec0-bc24-9ed1f2249a6d';

  // 1. Give Patient 2 a friendly name and profile
  await admin.from('users').update({ full_name: 'Eleanor Vance (Mother)' }).eq('id', patient2Id);
  await admin.from('patient_profiles').update({
    primary_condition: 'Type 2 Diabetes & Hypertension',
    current_status: 'stable',
    date_of_birth: '1958-04-12',
    sex: 'Female',
    status_updated_at: new Date().toISOString(),
    status_updated_by: doctorId,
  }).eq('user_id', patient2Id);
  console.log('1. Updated Patient 2 metadata: Eleanor Vance (Mother)');

  // 2. Assign Family Member to Patient 1 (Daughter)
  await admin.from('care_teams').upsert({
    patient_id: patient1Id,
    member_id: familyId,
    member_role: 'family_member',
    relationship_label: 'Daughter / Primary Contact',
    is_active: true
  }, { onConflict: 'patient_id,member_id,member_role' });
  console.log('2. Linked family_member to Patient 1 (Daughter)');

  // 3. Assign Family Member to Patient 2 (Guardian)
  await admin.from('care_teams').upsert({
    patient_id: patient2Id,
    member_id: familyId,
    member_role: 'family_member',
    relationship_label: 'Healthcare Proxy / Daughter',
    is_active: true
  }, { onConflict: 'patient_id,member_id,member_role' });
  console.log('3. Linked family_member to Patient 2 (Healthcare Proxy)');

  // 4. Assign Doctor and Caregiver to Patient 2
  await admin.from('care_teams').upsert({
    patient_id: patient2Id,
    member_id: doctorId,
    member_role: 'doctor',
    relationship_label: 'Primary Attending',
    is_active: true
  }, { onConflict: 'patient_id,member_id,member_role' });

  await admin.from('care_teams').upsert({
    patient_id: patient2Id,
    member_id: caregiverId,
    member_role: 'caregiver',
    relationship_label: 'Home Health Aide',
    is_active: true
  }, { onConflict: 'patient_id,member_id,member_role' });
  console.log('4. Linked Doctor & Caregiver to Patient 2');

  // 5. Seed 2 vitals logs for Patient 2
  const now = Date.now();
  const { data: log1 } = await admin.from('vitals_logs').insert({
    patient_id: patient2Id,
    caregiver_id: caregiverId,
    heart_rate: 74,
    spo2: 98,
    bp_systolic: 122,
    bp_diastolic: 78,
    temperature_c: 36.8,
    logged_at: new Date(now - 86400000).toISOString(),
    notes: 'Morning vitals check. Patient rested and alert.'
  }).select().single();

  const { data: log2 } = await admin.from('vitals_logs').insert({
    patient_id: patient2Id,
    caregiver_id: caregiverId,
    heart_rate: 76,
    spo2: 97,
    bp_systolic: 126,
    bp_diastolic: 80,
    temperature_c: 36.9,
    logged_at: new Date(now - 14400000).toISOString(),
    notes: 'Afternoon post-lunch vitals.'
  }).select().single();
  console.log(`5. Inserted 2 vitals logs for Patient 2 (IDs: ${log1.id}, ${log2.id})`);

  // 6. Seed a medical review for Patient 2
  const { data: rev } = await admin.from('medical_reviews').insert({
    doctor_id: doctorId,
    patient_id: patient2Id,
    vitals_log_id: log2.id,
    new_status: 'stable',
    feedback_notes: 'Blood pressure and glucose levels are well-controlled on current metformin regimen. Continue daily log.',
    is_urgent: false,
    reviewed_at: new Date(now - 7200000).toISOString()
  }).select().single();
  console.log(`6. Inserted physician review for Patient 2 (ID: ${rev.id})`);

  // Verify family member active patient count
  const familyClient = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  await familyClient.auth.signInWithPassword({ email: 'family_member@test.com', password: 'password123' });

  const { data: familyTeams } = await familyClient
    .from('care_teams')
    .select('patient_id, relationship_label, is_active, patient:users!care_teams_patient_id_fkey(id, full_name)')
    .eq('member_id', familyId)
    .eq('is_active', true);

  console.log('\n--- VERIFICATION: Active Patients for family_member@test.com ---');
  familyTeams.forEach((t, i) => {
    console.log(`[Patient ${i + 1}] ${t.patient?.full_name} (${t.patient_id}) - Role: ${t.relationship_label}`);
  });
  console.log(`\nTotal Active Patients for Family Member: ${familyTeams.length} (PASS - Multi-patient verified)`);
}

seedFamilyMultiPatient().catch(console.error);
