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

async function main() {
  const cookieJar = [];
  const client = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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

  await client.auth.signInWithPassword({
    email: 'doctor@test.com',
    password: 'password123'
  });

  const cookieHeader = cookieJar.map(c => `${c.name}=${c.value}`).join('; ');

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/care-teams',
    method: 'GET',
    headers: { 'Cookie': cookieHeader }
  }, (res) => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Location:', res.headers['location']);
      const bodyIdx = b.indexOf('<body');
      console.log('Has <body tag:', bodyIdx >= 0);
      const matchIdx = b.indexOf('Care Team Assignments');
      console.log('Match index:', matchIdx, '| Body index:', bodyIdx);
      if (matchIdx >= 0) {
        console.log('Match snippet:\n', b.slice(Math.max(0, matchIdx - 60), matchIdx + 80));
      }
      const headings = b.match(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi) || [];
      console.log('Headings:\n', headings);
    });
  });
  req.end();
}

main().catch(console.error);
