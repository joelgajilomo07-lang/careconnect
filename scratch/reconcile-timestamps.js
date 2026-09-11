const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function reconcileTimestamps() {
  const patientId = 'afb3262b-c15d-46bd-885a-264b4987de01';
  
  // Find the latest review
  const { data: latestReviews } = await supabase
    .from('medical_reviews')
    .select('*')
    .eq('patient_id', patientId)
    .order('reviewed_at', { ascending: false })
    .limit(1);

  const review = latestReviews[0];
  console.log('Latest review before reconciliation:', review);

  const { data: profile } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', patientId)
    .single();
  console.log('Profile before reconciliation:', profile);

  // We want both review.reviewed_at and profile.status_updated_at to match exactly.
  // We will use profile.status_updated_at (which is the actual time the current stable status was confirmed)
  const canonicalTimestamp = profile.status_updated_at;

  // Since medical_reviews has an RLS with no update policy for anon, we can update via service role key
  const { data: updatedReview, error: revErr } = await supabase
    .from('medical_reviews')
    .update({ reviewed_at: canonicalTimestamp, new_status: 'stable', is_urgent: false })
    .eq('id', review.id)
    .select()
    .single();

  if (revErr) {
    console.error('Error updating review reviewed_at:', revErr);
  } else {
    console.log('Updated review to match profile timestamp exactly:', updatedReview);
  }

  // Double check both
  const { data: finalProfile } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', patientId)
    .single();

  const { data: finalReview } = await supabase
    .from('medical_reviews')
    .select('*')
    .eq('patient_id', patientId)
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Reconciliation result:');
  console.log('Profile status_updated_at:', finalProfile.status_updated_at);
  console.log('Review reviewed_at:       ', finalReview.reviewed_at);
  console.log('Timestamps match:         ', finalProfile.status_updated_at === finalReview.reviewed_at);
}

reconcileTimestamps();
