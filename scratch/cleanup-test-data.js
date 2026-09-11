require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupData() {
  console.log('Starting data cleanup...');
  
  // Update Eleanor Vance email
  const { data: userToUpdate, error: findErr } = await supabase.auth.admin.listUsers();
  if (findErr) {
    console.error('Error finding users:', findErr);
  } else {
    const eleanor = userToUpdate.users.find(u => u.email === 'patient_unassigned@test.com');
    if (eleanor) {
      console.log('Updating Eleanor Vance email from patient_unassigned@test.com to eleanor.vance@test.com...');
      const { error: updateErr } = await supabase.auth.admin.updateUserById(eleanor.id, {
        email: 'eleanor.vance@test.com',
        email_confirm: true
      });
      if (updateErr) console.error('Error updating auth user email:', updateErr);
      else console.log('Auth email updated successfully.');
    } else {
      console.log('Eleanor Vance (patient_unassigned@test.com) not found in auth.users.');
    }
  }

  // Also update public.users
  const { error: publicUpdateErr } = await supabase
    .from('users')
    .update({ email: 'eleanor.vance@test.com' })
    .eq('email', 'patient_unassigned@test.com');
  if (publicUpdateErr) {
    console.error('Error updating public.users email:', publicUpdateErr);
  } else {
    console.log('public.users email updated successfully.');
  }

  // Update regrgrg feedback notes
  console.log('Updating "regrgrg" feedback notes...');
  const { error: notesUpdateErr } = await supabase
    .from('medical_reviews')
    .update({ feedback_notes: 'Vital parameters reviewed and found consistent with ongoing management plan. Continue current medication regimen.' })
    .eq('feedback_notes', 'regrgrg');
  
  if (notesUpdateErr) {
    console.error('Error updating feedback notes:', notesUpdateErr);
  } else {
    console.log('Feedback notes updated successfully.');
  }

  console.log('Data cleanup finished.');
}

cleanupData();
