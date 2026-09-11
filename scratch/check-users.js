const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  console.log('Auth Users:', users?.users.map(u => ({ email: u.email, id: u.id })));

  const { data: profiles } = await supabase.from('users').select('*');
  console.log('Public Users:', profiles);
}

check();
