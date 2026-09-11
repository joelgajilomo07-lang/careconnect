const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const admin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function probe() {
  const candidates = [
    'doctornew@example.com',
    'doctornew@test.com',
    'testuser123@careconnect.internal'
  ];

  for (const email of candidates) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    console.log(`Email: ${email} ->`, error ? `ERROR: ${error.message} (${error.code})` : `SUCCESS (ID: ${data.user?.id})`);
    if (data?.user?.id) {
      await admin.auth.admin.deleteUser(data.user.id);
    }
  }
}

probe().catch(console.error);
