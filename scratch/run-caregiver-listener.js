const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const resultsFile = path.resolve('scratch/browser-test-results.json');
fs.writeFileSync(resultsFile, JSON.stringify({ status: 'starting', events: [] }, null, 2));

async function main() {
  const caregiverClient = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY'], {
    auth: { persistSession: false }
  });

  const { data: cgAuth, error: authErr } = await caregiverClient.auth.signInWithPassword({
    email: 'caregiver@test.com',
    password: 'password123'
  });
  if (authErr) throw authErr;
  const caregiverId = cgAuth.user.id;
  await caregiverClient.realtime.setAuth(cgAuth.session.access_token);

  console.log(`[Caregiver Listener] Authenticated as ${caregiverId}`);

  // 1. Log a fresh unreviewed vitals reading for Test Patient
  const adminClient = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);
  const { data: patient } = await adminClient.from('users').select('id, full_name').eq('role', 'patient').limit(1).single();

  const { data: newLog, error: logErr } = await caregiverClient
    .from('vitals_logs')
    .insert({
      patient_id: patient.id,
      caregiver_id: caregiverId,
      heart_rate: 112,
      spo2: 91,
      bp_systolic: 155,
      bp_diastolic: 98,
      temperature_c: 38.5,
      notes: 'Browser E2E test reading: high fever and tachycardia.'
    })
    .select()
    .single();

  if (logErr) throw logErr;
  console.log(`[Caregiver Listener] Created fresh vitals log ID: ${newLog.id}`);

  // Write target log ID so subagent or runner knows what to navigate to
  fs.writeFileSync(resultsFile, JSON.stringify({
    status: 'listening',
    targetVitalsLogId: newLog.id,
    patientName: patient.full_name,
    patientId: patient.id,
    caregiverId: caregiverId,
    events: []
  }, null, 2));

  // 2. Open WebSocket channel
  const channel = caregiverClient
    .channel(`user-notifications:${caregiverId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${caregiverId}`
      },
      (payload) => {
        console.log(`[Caregiver Listener] >>> WEBSOCKET EVENT RECEIVED <<<:`, payload.new);
        const current = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        current.events.push(payload.new);
        current.status = 'event_received';
        fs.writeFileSync(resultsFile, JSON.stringify(current, null, 2));
      }
    );

  await new Promise((resolve) => {
    channel.subscribe((status) => {
      console.log(`[Caregiver Listener] Channel status: ${status}`);
      if (status === 'SUBSCRIBED') resolve();
    });
  });

  console.log(`[Caregiver Listener] Ready and waiting for real browser submission...`);

  // Keep process alive for 90 seconds or until event received
  const start = Date.now();
  while (Date.now() - start < 90000) {
    const current = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    if (current.events.length > 0) {
      console.log(`[Caregiver Listener] Event recorded! Waiting 2s before clean exit.`);
      await new Promise(r => setTimeout(r, 2000));
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  await caregiverClient.removeChannel(channel);
  console.log(`[Caregiver Listener] Exiting cleanly.`);
  process.exit(0);
}

main().catch(err => {
  console.error('[Caregiver Listener] Error:', err);
  process.exit(1);
});
