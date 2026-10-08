const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const artifactDir = 'C:/Users/Admin/.gemini/antigravity-ide/brain/58c5e261-9e19-4010-b8bd-b8c48a3206c1';
const localScreenshotsDir = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(localScreenshotsDir)) {
  fs.mkdirSync(localScreenshotsDir, { recursive: true });
}

async function saveScreenshot(page, filename) {
  const localPath = path.join(localScreenshotsDir, filename);
  await page.screenshot({ path: localPath, fullPage: true });
  if (fs.existsSync(artifactDir)) {
    const artifactPath = path.join(artifactDir, filename);
    fs.copyFileSync(localPath, artifactPath);
  }
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('=== VERIFYING AUTH PAGES (LOGIN & SET-PASSWORD) ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. Desktop Login (1280x800)
    console.log('1. Capturing /login at desktop (1280x800)...');
    const loginDesktop = await browser.newPage();
    await loginDesktop.setViewport({ width: 1280, height: 800 });
    await loginDesktop.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle2' });
    await saveScreenshot(loginDesktop, 'login_desktop_1280.png');

    // Also capture error banner state
    await loginDesktop.goto('http://127.0.0.1:3000/login?error=invalid_or_expired_link', { waitUntil: 'networkidle2' });
    await saveScreenshot(loginDesktop, 'login_desktop_error_banner.png');
    await loginDesktop.close();

    // 2. Mobile Login (375x667)
    console.log('\n2. Capturing /login at mobile (375x667)...');
    const loginMobile375 = await browser.newPage();
    await loginMobile375.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await loginMobile375.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle2' });
    await saveScreenshot(loginMobile375, 'login_mobile_375.png');
    await loginMobile375.close();

    // 3. Mobile Login (390x844)
    console.log('\n3. Capturing /login at mobile (390x844)...');
    const loginMobile390 = await browser.newPage();
    await loginMobile390.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await loginMobile390.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle2' });
    await saveScreenshot(loginMobile390, 'login_mobile_390.png');
    await loginMobile390.close();

    // 4. End-to-End Login & Set-Password Capture
    console.log('\n4. Testing end-to-end login flow with caregiver@test.com...');
    const authSessionPage = await browser.newPage();
    await authSessionPage.setViewport({ width: 1280, height: 800 });
    await authSessionPage.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle2' });
    
    await authSessionPage.waitForSelector('#email');
    await authSessionPage.type('#email', 'caregiver@test.com');
    await authSessionPage.type('#password', 'password123');
    await authSessionPage.click('button[type="submit"]');
    
    console.log('Credentials submitted, awaiting redirection...');
    await authSessionPage.waitForFunction(
      () => window.location.pathname !== '/login',
      { timeout: 15000 }
    );
    console.log('Redirected to:', authSessionPage.url());

    if (!authSessionPage.url().includes('/login')) {
      console.log('✓ Login verified successfully! Redirected past auth guard.');
    } else {
      throw new Error('Login failed: did not leave /login');
    }

    // 5. Desktop Set-Password (1280x800)
    console.log('\n5. Capturing /set-password at desktop (1280x800)...');
    await authSessionPage.goto('http://127.0.0.1:3000/set-password', { waitUntil: 'networkidle2' });
    await saveScreenshot(authSessionPage, 'set_password_desktop_1280.png');

    // 6. Mobile Set-Password (375x667)
    console.log('\n6. Capturing /set-password at mobile (375x667)...');
    await authSessionPage.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await authSessionPage.goto('http://127.0.0.1:3000/set-password', { waitUntil: 'networkidle2' });
    await saveScreenshot(authSessionPage, 'set_password_mobile_375.png');

    // 7. Mobile Set-Password (390x844)
    console.log('\n7. Capturing /set-password at mobile (390x844)...');
    await authSessionPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await authSessionPage.goto('http://127.0.0.1:3000/set-password', { waitUntil: 'networkidle2' });
    await saveScreenshot(authSessionPage, 'set_password_mobile_390.png');

    await authSessionPage.close();
    console.log('\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
