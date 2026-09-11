const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data: profiles } = await supabase.from('patient_profiles').select('*');
  console.log('Patient profiles:', profiles);

  const { data: careTeams } = await supabase.from('care_teams').select('*');
  console.log('Care teams:', careTeams);
}

check();
