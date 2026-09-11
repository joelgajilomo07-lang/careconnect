const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

async function main() {
  console.log('=== REAL HTTP SESSION & ROUTE GUARD INTEGRATION TEST ===\n');

  // Step 1: Sign in via Supabase Auth
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'caregiver@test.com',
    password: 'password123'
  });

  if (authErr) {
    console.error('Failed to sign in:', authErr);
    return;
  }

  const session = auth.session;
  console.log('1. Obtained live session for caregiver@test.com');
  console.log('   User ID:', session.user.id);
  console.log('   Access Token (preview):', session.access_token.slice(0, 30) + '...');

  // Format Supabase SSR base64 chunked cookies
  const projectRef = env['NEXT_PUBLIC_SUPABASE_URL'].replace('https://', '').split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const rawSessionStr = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user
  });
  const b64Val = Buffer.from(rawSessionStr).toString('base64');
  
  // Send cookie in standard formats supported by @supabase/ssr
  const cookieHeader = `${cookieName}=base64-${b64Val}; ${cookieName}.0=base64-${b64Val}`;

  function sendReq(reqPath) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: reqPath,
        method: 'GET',
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            bodyPreview: body.slice(0, 300)
          });
        });
      });

      req.on('error', err => resolve({ error: err.message }));
      req.end();
    });
  }

  // Test Case A: Authorized Route
  console.log('\n--- Test Case A: Caregiver requests /log-vitals (Authorized) ---');
  const resA = await sendReq('/log-vitals');
  console.log('HTTP Status:', resA.statusCode);
  console.log('Location Header:', resA.headers['location'] || '(None - 200 OK rendered)');
  console.log('Body Preview:', resA.bodyPreview.replace(/\s+/g, ' ').slice(0, 120));

  // Test Case B: Unauthorized Flat Route
  console.log('\n--- Test Case B: Caregiver requests /care-teams (Admin-only flat route) ---');
  const resB = await sendReq('/care-teams');
  console.log('HTTP Status:', resB.statusCode);
  console.log('Location Header:', resB.headers['location']);

  // Test Case C: Unauthorized Dynamic Route
  console.log('\n--- Test Case C: Caregiver requests /patients/123e4567-e89b-12d3-a456-426614174000 (Doctor-only dynamic route) ---');
  const resC = await sendReq('/patients/123e4567-e89b-12d3-a456-426614174000');
  console.log('HTTP Status:', resC.statusCode);
  console.log('Location Header:', resC.headers['location']);
}

main();
