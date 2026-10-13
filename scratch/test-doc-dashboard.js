const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDocDashboard() {
  const { data: doctor } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('email', 'doctor1@test.com')
    .single();

  console.log('Doctor:', doctor);

  const { data: assignments } = await supabase
    .from('care_teams')
    .select('patient_id, patient:patients!care_teams_patient_id_fkey(full_name)')
    .eq('member_id', doctor.id)
    .eq('is_active', true);

  console.log('Assigned patients count:', assignments.length);
  assignments.forEach((a) => console.log(' -', a.patient.full_name, `(${a.patient_id})`));

  // Check unread notifications for doctor
  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, title, priority, is_read, patient_id')
    .eq('user_id', doctor.id)
    .eq('priority', 'high');

  console.log('High priority notifications count for doctor:', notifs?.length || 0);
  if (notifs && notifs.length > 0) {
    console.log('Sample notif:', notifs[0]);
  }
}

testDocDashboard();
