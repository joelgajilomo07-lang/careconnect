const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPatientNotifs() {
  const patientIds = [
    '5a27b8c2-e3a5-46fd-93b6-ab1cddbbab64',
    '1fe56ea7-994d-4ac4-ae7f-ca475abaed1d',
    '55555555-5555-5555-5555-555555555555'
  ];
  
  const { data } = await supabase
    .from('notifications')
    .select('id, user_id, patient_id, title, priority, is_read')
    .in('patient_id', patientIds);

  console.log('Notifications for assigned patients:', data?.length);
  data?.forEach(d => console.log(d));
}

checkPatientNotifs();
