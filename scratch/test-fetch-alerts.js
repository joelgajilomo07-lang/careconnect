const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFetchAlerts() {
  const patientIds = [
    '5a27b8c2-e3a5-46fd-93b6-ab1cddbbab64',
    '1fe56ea7-994d-4ac4-ae7f-ca475abaed1d',
    '55555555-5555-5555-5555-555555555555'
  ];

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      patient_id,
      title,
      message,
      created_at,
      priority,
      is_read,
      patient:patients!notifications_patient_id_fkey(full_name)
    `)
    .in('patient_id', patientIds)
    .eq('priority', 'high')
    .eq('is_read', false);

  console.log('Error:', error);
  console.log('Fetched alerts count:', data?.length);
  data?.forEach(d => console.log('Alert:', d.title, 'for patient:', d.patient?.full_name));
}

testFetchAlerts();
