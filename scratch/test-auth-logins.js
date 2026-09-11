const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testLogins() {
  const users = [
    'caregiver@test.com',
    'doctor@test.com',
    'patient@test.com',
    'family_member@test.com',
    'eleanor.vance@test.com'
  ];

  for (const email of users) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'password123'
    });
    if (error) {
      console.log(`FAIL ${email}:`, error.message);
    } else {
      console.log(`SUCCESS ${email}: user id ${data.user.id}`);
      await supabase.auth.signOut();
    }
  }
}

testLogins();
