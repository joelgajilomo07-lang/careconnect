const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAllReviews() {
  const { data: reviews } = await supabase
    .from('medical_reviews')
    .select('*, patient:users!medical_reviews_patient_id_fkey(full_name), doctor:users!medical_reviews_doctor_id_fkey(full_name)')
    .order('reviewed_at', { ascending: false });

  console.log('All Medical Reviews in DB:');
  reviews?.forEach(r => {
    console.log({
      id: r.id,
      patient: r.patient?.full_name,
      patient_id: r.patient_id,
      reviewed_at: r.reviewed_at,
      new_status: r.new_status,
      is_urgent: r.is_urgent,
      notes: r.feedback_notes
    });
  });
}

checkAllReviews();
