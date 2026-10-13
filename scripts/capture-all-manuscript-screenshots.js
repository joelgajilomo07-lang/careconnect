const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'manuscript_screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function hideDevTools(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, #nextjs-dev-overlay, [data-nextjs-dev-overlay], [data-nextjs-toast], [data-nextjs-dialog] {
        display: none !important;
        visibility: hidden !important;
      }
    `
  }).catch(() => {});
}

async function loginPage(page, email, password = 'password123') {
  console.log(`\n[Auth] Navigating to /login for ${email}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  await page.type('input[type="email"]', email, { delay: 10 });
  await page.type('input[type="password"]', password, { delay: 10 });
  await page.click('button[type="submit"]');

  console.log(`[Auth] Submitted credentials, waiting for redirect away from /login...`);
  await page.waitForFunction(() => !window.location.pathname.endsWith('/login'), { timeout: 45000 });
  console.log(`[Auth] Authenticated! Landed at: ${page.url()}`);
  await new Promise(r => setTimeout(r, 3000));
  await hideDevTools(page);
}

async function runCapture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // =========================================================================
    // 1. ADMIN CAPTURES (Desktop 1366x768)
    // =========================================================================
    console.log('\n========================================');
    console.log('STARTING ADMIN CAPTURES (fig10, 11, 11b, 12, 13, 13b)');
    console.log('========================================');
    const adminContext = await browser.createBrowserContext();
    const adminPage = await adminContext.newPage();
    adminPage.setDefaultNavigationTimeout(60000);
    adminPage.setDefaultTimeout(30000);
    await adminPage.setViewport({ width: 1366, height: 768 });

    await loginPage(adminPage, 'admin@test.com');

    // Fig 10: Admin Dashboard
    console.log('\nCapturing fig10_admin_dashboard.png...');
    await adminPage.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await hideDevTools(adminPage);
    await adminPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig10_admin_dashboard.png') });
    console.log('Saved fig10_admin_dashboard.png');

    // Fig 11: User Management
    console.log('\nCapturing fig11_user_management.png...');
    await adminPage.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await hideDevTools(adminPage);
    await adminPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig11_user_management.png') });
    console.log('Saved fig11_user_management.png');

    // Fig 11b: Add User Form (Modal Open)
    console.log('\nCapturing fig11b_add_user.png...');
    await adminPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(el => el.textContent.includes('Add User'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await hideDevTools(adminPage);
    await adminPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig11b_add_user.png') });
    console.log('Saved fig11b_add_user.png');

    // Fig 12: Patient Management & Care Assignment Panel
    console.log('\nCapturing fig12_patient_management.png...');
    await adminPage.goto(`${BASE_URL}/admin/patients`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));
    await adminPage.evaluate(() => {
      window.scrollTo(0, 480);
    });
    await new Promise(r => setTimeout(r, 1500));
    await hideDevTools(adminPage);
    await adminPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig12_patient_management.png') });
    console.log('Saved fig12_patient_management.png');

    // Fig 13: Audit Logs
    console.log('\nCapturing fig13_audit_logs_reports.png...');
    await adminPage.goto(`${BASE_URL}/admin/audit-logs`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await hideDevTools(adminPage);
    await adminPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig13_audit_logs_reports.png') });
    console.log('Saved fig13_audit_logs_reports.png');

    // Fig 13b: Reports
    console.log('\nCapturing fig13b_reports.png...');
    await adminPage.goto(`${BASE_URL}/admin/reports`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await hideDevTools(adminPage);
    await adminPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig13b_reports.png') });
    console.log('Saved fig13b_reports.png');

    await adminContext.close();

    // =========================================================================
    // 2. CAREGIVER CAPTURES (Phone 390x844)
    // =========================================================================
    console.log('\n========================================');
    console.log('STARTING CAREGIVER CAPTURES (fig14, 15, 16, 17)');
    console.log('========================================');
    const caregiverContext = await browser.createBrowserContext();
    const caregiverPage = await caregiverContext.newPage();
    caregiverPage.setDefaultNavigationTimeout(60000);
    caregiverPage.setDefaultTimeout(30000);
    await caregiverPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await loginPage(caregiverPage, 'caregiver1@test.com');

    // Fig 14: Caregiver Dashboard
    console.log('\nCapturing fig14_caregiver_dashboard.png...');
    await caregiverPage.goto(`${BASE_URL}/caregiver`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await hideDevTools(caregiverPage);
    await caregiverPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig14_caregiver_dashboard.png') });
    console.log('Saved fig14_caregiver_dashboard.png');

    // Fig 15: Shift Report Form (Live Out of Range Red Highlight)
    console.log('\nCapturing fig15_shift_report_form.png...');
    await caregiverPage.goto(`${BASE_URL}/caregiver/shift-report`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await caregiverPage.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
      const spo2Input = inputs.find(i => i.value === '98' || i.className.includes('border'));
      if (spo2Input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(spo2Input, '88');
        spo2Input.dispatchEvent(new Event('input', { bubbles: true }));
        spo2Input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    await hideDevTools(caregiverPage);
    await caregiverPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig15_shift_report_form.png') });
    console.log('Saved fig15_shift_report_form.png');

    // Fig 16: Medication Administration
    console.log('\nCapturing fig16_medication_administration.png...');
    await caregiverPage.goto(`${BASE_URL}/caregiver/medications`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await hideDevTools(caregiverPage);
    await caregiverPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig16_medication_administration.png') });
    console.log('Saved fig16_medication_administration.png');

    // Fig 17: Send Urgent Update (Filled Form Open)
    console.log('\nCapturing fig17_send_urgent_update.png...');
    await caregiverPage.goto(`${BASE_URL}/caregiver`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await caregiverPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(el => el.textContent.includes('Send Urgent Update'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await caregiverPage.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length > 0) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textareas[0], 'Patient experienced sudden lightheadedness and unassisted slip near bedside. Responsive, vitals stabilized.');
        textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      const inputs = document.querySelectorAll('input');
      const bp = Array.from(inputs).find(i => i.placeholder?.includes('120/80') || i.name === 'bp');
      if (bp) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(bp, '142/90');
        bp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    await hideDevTools(caregiverPage);
    await caregiverPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig17_send_urgent_update.png') });
    console.log('Saved fig17_send_urgent_update.png');

    await caregiverContext.close();

    // =========================================================================
    // 3. FAMILY MEMBER CAPTURE (Desktop 1366x768)
    // =========================================================================
    console.log('\n========================================');
    console.log('STARTING FAMILY MEMBER CAPTURE (fig22)');
    console.log('========================================');
    const familyContext = await browser.createBrowserContext();
    const familyPage = await familyContext.newPage();
    familyPage.setDefaultNavigationTimeout(60000);
    familyPage.setDefaultTimeout(30000);
    await familyPage.setViewport({ width: 1366, height: 768 });

    await loginPage(familyPage, 'family1@test.com');

    console.log('\nCapturing fig22_family_dashboard.png...');
    await familyPage.goto(`${BASE_URL}/family`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));
    await hideDevTools(familyPage);
    await familyPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig22_family_dashboard.png') });
    console.log('Saved fig22_family_dashboard.png');

    await familyContext.close();

    // =========================================================================
    // 4. PATIENT CAPTURE (Desktop 1366x768)
    // =========================================================================
    console.log('\n========================================');
    console.log('STARTING PATIENT CAPTURE (fig23)');
    console.log('========================================');
    const patientContext = await browser.createBrowserContext();
    const patientPage = await patientContext.newPage();
    patientPage.setDefaultNavigationTimeout(60000);
    patientPage.setDefaultTimeout(30000);
    await patientPage.setViewport({ width: 1366, height: 768 });

    await loginPage(patientPage, 'patient1@test.com');

    console.log('\nCapturing fig23_patient_dashboard.png...');
    await patientPage.goto(`${BASE_URL}/patient`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));
    await hideDevTools(patientPage);
    await patientPage.screenshot({ path: path.join(OUTPUT_DIR, 'fig23_patient_dashboard.png') });
    console.log('Saved fig23_patient_dashboard.png');

    await patientContext.close();

    console.log('\n======================================================');
    console.log('ALL FIGURES CAPTURED SUCCESSFULLY!');
    console.log('======================================================');

  } catch (err) {
    console.error('Error during capture process:', err);
  } finally {
    await browser.close();
  }
}

runCapture();
