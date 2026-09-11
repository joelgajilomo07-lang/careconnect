const http = require('http');
const fs = require('fs');
const path = require('path');
const { createBrowserClient } = require('@supabase/ssr');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function testActionGuardForRole(roleEmail, roleName) {
  console.log(`\n================================================================`);
  console.log(`  TESTING SERVER ACTION DIRECT CALLS AS: ${roleName} (${roleEmail})`);
  console.log(`================================================================`);

  const cookieJar = [];
  const ssrClient = createBrowserClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() { return cookieJar; },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(c => {
          const idx = cookieJar.findIndex(x => x.name === c.name);
          if (idx >= 0) cookieJar[idx] = c;
          else cookieJar.push(c);
        });
      }
    }
  });

  const { data: authData, error: authErr } = await ssrClient.auth.signInWithPassword({
    email: roleEmail,
    password: 'password123'
  });

  if (authErr) {
    console.error(`Failed to authenticate as ${roleEmail}:`, authErr.message);
    return;
  }

  console.log(`✓ Authenticated session obtained: User ID ${authData.user.id}`);
  const cookieHeader = cookieJar.map(c => `${c.name}=${c.value}`).join('; ');

  const resData = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/test-admin-action-guards',
      method: 'GET',
      headers: { 'Cookie': cookieHeader }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });

  if (resData.error) {
    console.error('Request failed:', resData.error);
    return;
  }

  console.log('\n--- RAW EXECUTION RESULTS ---');
  console.log(JSON.stringify(resData.data, null, 2));

  console.log('\n--- VERIFICATION ASSERTIONS ---');
  const d = resData.data;
  console.log(`1. assignCareTeamMemberAction blocked by requireRole: ${d.assignAction.blockedByGuard ? 'CONFIRMED (PASS)' : 'FAIL'}`);
  console.log(`   - Thrown digest: "${d.assignAction.thrown?.digest}"`);
  console.log(`2. removeCareTeamMemberAction blocked by requireRole: ${d.removeAction.blockedByGuard ? 'CONFIRMED (PASS)' : 'FAIL'}`);
  console.log(`   - Thrown digest: "${d.removeAction.thrown?.digest}"`);
  console.log(`   - Silent 0-row update avoided: ${!d.removeAction.isSilentNoOp ? 'CONFIRMED (PASS)' : 'FAIL (Silent No-op)'}`);
  console.log(`3. Database row completely unchanged: ${d.dbStateUnchanged ? 'CONFIRMED (PASS)' : 'FAIL'}`);
  console.log(`   - Before is_active: ${d.baselineState.is_active} | After is_active: ${d.afterState.is_active}`);
}

async function run() {
  await testActionGuardForRole('doctor@test.com', 'Doctor');
  await testActionGuardForRole('caregiver@test.com', 'Caregiver');
  await testActionGuardForRole('patient@test.com', 'Patient');
}

run().catch(console.error);
