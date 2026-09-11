const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixTestPatientReviewData() {
  const patientId = 'afb3262b-c15d-46bd-885a-264b4987de01';
  const doctorId = '05b8c0f0-16c1-43c4-8cae-ab3f2ab772b0';

  // Fetch patient profile timestamp
  const { data: profile } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', patientId)
    .single();

  console.log('Current patient profile:', profile);

  // Insert a matching stable medical_review for 2026-09-07T19:58:12.699Z (or current profile timestamp)
  const { data: review, error } = await supabase
    .from('medical_reviews')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      new_status: 'stable',
      is_urgent: false,
      feedback_notes: 'Vital parameters reviewed and found consistent with ongoing management plan. Continue current medication regimen.',
      reviewed_at: profile.status_updated_at || new Date().toISOString()
    })
    .select()
    .single();

  if (error) console.error('Error inserting review:', error);
  else console.log('Successfully inserted matching stable review:', review);
}

fixTestPatientReviewData();
