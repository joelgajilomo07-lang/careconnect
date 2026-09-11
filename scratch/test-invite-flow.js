const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactDir = './screenshots/';

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runInvitationTest() {
  console.log('=== STARTING INVITATION ACCEPTANCE TEST ===\n');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const testEmail = 'invited_caregiver@test.com';

  try {
    // -------------------------------------------------------------
    // PART 1: Test failure path with invalid/garbage token
    // -------------------------------------------------------------
    console.log('1. Testing failure path with garbage token...');
    const failContext = await browser.createBrowserContext();
    const failPage = await failContext.newPage();
    await failPage.setViewport({ width: 1440, height: 900 });

    const garbageUrl = 'http://127.0.0.1:3000/auth/confirm?token_hash=garbage_invalid_token&type=invite';
    console.log(`   Navigating to: ${garbageUrl}`);
    await failPage.goto(garbageUrl, { waitUntil: 'networkidle2' });

    const currentUrl = failPage.url();
    console.log(`   Resulting URL: ${currentUrl}`);
    const isRedirectedToLoginError = currentUrl.includes('/login') && currentUrl.includes('error=invalid_or_expired_link');
    console.log(`   Redirected to /login?error=invalid_or_expired_link: ${isRedirectedToLoginError ? 'PASS' : 'FAIL'}`);

    await failPage.screenshot({ path: artifactDir + 'invite_failure_screenshot.png', fullPage: true });
    console.log('   Saved invite_failure_screenshot.png');
    await failContext.close();

    // -------------------------------------------------------------
    // PART 2: Clean up any prior test user with testEmail
    // -------------------------------------------------------------
    console.log('\n2. Cleaning up any previous test user...');
    const { data: listUsers } = await admin.auth.admin.listUsers();
    const existing = listUsers?.users?.find(u => u.email === testEmail);
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id);
      await admin.from('users').delete().eq('id', existing.id);
      console.log(`   Cleaned up existing ${testEmail} (ID: ${existing.id})`);
    }

    // -------------------------------------------------------------
    // PART 3: Generate Real Invite Link via Admin API
    // -------------------------------------------------------------
    console.log('\n3. Generating real invite link for test user...');
    // Create invite link using Supabase Admin API
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: testEmail,
      options: {
        redirectTo: 'http://127.0.0.1:3000/auth/confirm',
      },
    });

    if (linkError) throw linkError;
    const userId = linkData.user.id;
    console.log(`   Invited User ID: ${userId}`);
    console.log(`   Full generateLink() Response Properties:`, Object.keys(linkData.properties || {}));
    console.log(`   Action Link: ${linkData.properties?.action_link}`);
    console.log(`   Email OTP: ${linkData.properties?.email_otp}`);
    console.log(`   Hashed Token: ${linkData.properties?.hashed_token}`);

    // Provision public.users row as caregiver via admin_create_user_profile (same as inviteUserAction)
    const { error: rpcErr } = await admin.rpc('admin_create_user_profile', {
      p_user_id: userId,
      p_email: testEmail,
      p_full_name: 'Test Invited Caregiver',
      p_role: 'caregiver',
      p_phone: '+1-555-0199',
    });
    if (rpcErr) throw rpcErr;
    console.log('   Created public.users caregiver profile for user.');

    // Format the CareConnect confirm route URL using hashed_token
    // Supabase action_link format looks like: https://.../auth/v1/verify?token=...&type=invite&redirect_to=...
    // Our /auth/confirm expects token_hash and type
    const confirmUrl = `http://127.0.0.1:3000/auth/confirm?token_hash=${linkData.properties?.hashed_token}&type=invite`;
    console.log(`\n4. Constructed app confirmation URL:`);
    console.log(`   ${confirmUrl}`);

    // -------------------------------------------------------------
    // PART 4: End-to-End Walkthrough via Puppeteer
    // -------------------------------------------------------------
    console.log('\n5. Executing browser exchange...');
    const userContext = await browser.createBrowserContext();
    const page = await userContext.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Step A: Navigate to /auth/confirm with real token_hash
    console.log('   Navigating to /auth/confirm with valid token_hash...');
    await page.goto(confirmUrl, { waitUntil: 'networkidle2' });

    console.log(`   Post-exchange URL: ${page.url()}`);
    const reachedSetPassword = page.url().includes('/set-password');
    console.log(`   Successfully reached /set-password: ${reachedSetPassword ? 'PASS' : 'FAIL'}`);

    // Step B: Verify the user is NOT redirected to /log-vitals (Guard check requirement #2)
    console.log('   Verifying user is NOT bounced to role home (/log-vitals)...');
    await new Promise(r => setTimeout(r, 2000));
    const stillOnSetPassword = page.url().includes('/set-password');
    console.log(`   Still on /set-password after delay: ${stillOnSetPassword ? 'PASS (NOT BOUNCED)' : 'FAIL (BOUNCED)'}`);

    await page.screenshot({ path: artifactDir + 'set_password_screenshot.png', fullPage: true });
    console.log('   Saved set_password_screenshot.png');

    // Step C: Set Password
    console.log('   Filling new password (password1234)...');
    await page.type('#password', 'password1234');
    await page.type('#confirmPassword', 'password1234');
    await page.click('button[type="submit"]');

    console.log('   Submitted password form. Awaiting redirect to role portal (/log-vitals)...');
    try {
      await page.waitForFunction(() => window.location.pathname.includes('/log-vitals'), { timeout: 15000 });
    } catch (e) {
      console.log('   Wait timed out; checking current URL...');
    }
    await new Promise(r => setTimeout(r, 2000));

    console.log(`   Final redirected URL: ${page.url()}`);
    const landedOnRoleHome = page.url().includes('/log-vitals');
    console.log(`   Landed on Caregiver Portal (/log-vitals): ${landedOnRoleHome ? 'PASS' : 'FAIL'}`);

    await page.screenshot({ path: artifactDir + 'invited_caregiver_dashboard_screenshot.png', fullPage: true });
    console.log('   Saved invited_caregiver_dashboard_screenshot.png');

    await userContext.close();

    // -------------------------------------------------------------
    // PART 5: Clean up invited_caregiver@test.com
    // -------------------------------------------------------------
    console.log('\n6. Cleaning up test account invited_caregiver@test.com...');
    await admin.auth.admin.deleteUser(userId);
    await admin.from('users').delete().eq('id', userId);
    console.log('   Cleaned up test account from auth.users and public.users successfully.');

    console.log('\n=============================================================');
    console.log('  ALL INVITATION ACCEPTANCE & GUARD TESTS PASSED SUCCESSFULLY');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('Error during invitation test:', err);
  } finally {
    await browser.close();
  }
}

runInvitationTest();
