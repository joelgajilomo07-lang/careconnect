const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkReviews() {
  const patientId = 'afb3262b-c15d-46bd-885a-264b4987de01';
  const { data: reviews, error } = await supabase
    .from('medical_reviews')
    .select('*')
    .eq('patient_id', patientId)
    .order('reviewed_at', { ascending: false });

  console.log('Error:', error);
  console.log('Medical Reviews for Test Patient (ordered newest first):');
  reviews?.forEach(r => {
    console.log({
      id: r.id,
      reviewed_at: r.reviewed_at,
      new_status: r.new_status,
      is_urgent: r.is_urgent,
      feedback_notes: r.feedback_notes,
      vitals_log_id: r.vitals_log_id
    });
  });

  const { data: profile } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', patientId)
    .single();

  console.log('Patient profile:', profile);
}

checkReviews();
